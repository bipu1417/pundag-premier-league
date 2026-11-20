const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const backendRequire = createRequire(resolve("functions/package.json"));
const { initializeApp, deleteApp } = backendRequire("firebase-admin/app");
const { getFirestore, Timestamp } = backendRequire("firebase-admin/firestore");
const { submitRegistration } = require("../functions/registration");
let app, db;
const root = "years/2026/tournaments/cup";
const payload = { name: "Player", mnumber: "9000000000", aadhaar: "200000000000", photo: "photo", paymentScreenshot: "payment" };
const submit = (patch = {}, tournamentId = "cup", uid = "visitor") => submitRegistration(db, {
  auth: uid ? { uid } : null,
  data: { tournamentId, year: 2026, payload: { ...payload, ...patch } },
});
const settings = () => ({ year: 2026, maxPlayers: 150, registeredPlayerCount: 150,
  registrationStartAt: Timestamp.fromMillis(Date.now() - 3600000), registrationEndAt: Timestamp.fromMillis(Date.now() + 3600000),
});
before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "A local Firestore emulator is required.");
  app = initializeApp({ projectId: "demo-ppl-duplicates" }, "duplicate-registration");
  db = getFirestore(app);
});
beforeEach(async () => { await db.recursiveDelete(db.collection("years")); await db.doc("tournaments/cup").set(settings()); });
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

test("a pending mobile blocks another submission even with a different Aadhaar", async () => {
  await submit();
  await assert.rejects(submit({ aadhaar: "200000000001" }), { code: "already-exists" });
  assert.equal((await db.collection(`${root}/pendingPlayers`).get()).size, 1);
});
test("a pending Aadhaar blocks another submission even with a different mobile", async () => {
  await submit();
  await assert.rejects(submit({ mnumber: "9000000001" }), { code: "already-exists" });
});
test("existing approved players and legacy formatted identifiers are checked", async () => {
  await db.doc(`${root}/players/existing`).set({ mnumber: "+91 90000-00000", aadhaar: "2000 0000 0000" });
  await assert.rejects(submit({ aadhaar: "200000000001" }), { code: "already-exists" });
  await assert.rejects(submit({ mnumber: "9000000001" }), { code: "already-exists" });
});
test("formatted new identifiers are normalized and cannot bypass duplicates", async () => {
  const { registrationId } = await submit({ mnumber: "+91 (90000) 00000", aadhaar: "2000-0000-0000" });
  const saved = (await db.doc(`${root}/pendingPlayers/${registrationId}`).get()).data();
  assert.equal(saved.mnumber, payload.mnumber);
  assert.equal(saved.aadhaar, payload.aadhaar);
  await assert.rejects(submit(), { code: "already-exists" });
});
test("simultaneous matching submissions accept exactly one entry", async () => {
  const results = await Promise.allSettled(Array.from({ length: 4 }, () => submit()));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.ok(results.filter((result) => result.status === "rejected").every((result) => result.reason.code === "already-exists"));
  assert.equal((await db.collection(`${root}/pendingPlayers`).get()).size, 1);
});
test("simultaneous submissions sharing just one identifier accept exactly one", async () => {
  for (const sameField of ["mnumber", "aadhaar"]) {
    await db.recursiveDelete(db.collection("years"));
    const results = await Promise.allSettled(Array.from({ length: 3 }, (_, i) => submit({
      mnumber: sameField === "mnumber" ? payload.mnumber : String(9000000000 + i),
      aadhaar: sameField === "aadhaar" ? payload.aadhaar : String(200000000000 + i),
    })));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  }
});
test("a rejected submission may be corrected and submitted again", async () => {
  const { registrationId } = await submit();
  await db.doc(`${root}/pendingPlayers/${registrationId}`).delete();
  assert.ok((await submit()).registrationId);
});
test("duplicate checks are scoped to a tournament", async () => {
  await submit();
  await db.doc("tournaments/other").set(settings());
  assert.ok((await submit({}, "other")).registrationId);
});
test("the server controls approval state and submitting user", async () => {
  const { registrationId } = await submit({ approved: true, paymentStatus: "paid", submittedBy: "someone-else" });
  const saved = (await db.doc(`${root}/pendingPlayers/${registrationId}`).get()).data();
  assert.equal(saved.approved, false);
  assert.equal(saved.paymentStatus, "pending");
  assert.equal(saved.submittedBy, "visitor");
});
test("invalid or missing identities and unauthenticated submissions are rejected", async () => {
  for (const patch of [{ mnumber: "" }, { mnumber: "bad9000000000" }, { aadhaar: "" }, { aadhaar: "123" }]) {
    await assert.rejects(submit(patch), { code: "invalid-argument" });
  }
  await assert.rejects(submit({}, "cup", null), { code: "unauthenticated" });
  assert.equal((await db.collection(`${root}/pendingPlayers`).get()).size, 0);
});
