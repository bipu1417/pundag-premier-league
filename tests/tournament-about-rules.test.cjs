const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const dependencies = process.env.PPL_TEST_DEPENDENCIES ? createRequire(resolve(process.env.PPL_TEST_DEPENDENCIES)) : require;
const { initializeTestEnvironment, assertSucceeds, assertFails } = dependencies("@firebase/rules-unit-testing");
const { doc, getDoc, getDocs, collection, setDoc, deleteDoc, serverTimestamp, Timestamp } = dependencies("firebase/firestore");
let environment;
const context = (uid, email = `${uid}@example.com`) => environment.authenticatedContext(uid, { email }).firestore();
const page = (db, id = "cup") => doc(db, "tournamentAbout", id);
const content = (uid, revision = 1) => ({ intro: "Our tournament", sections: [], revision, updatedAt: serverTimestamp(), updatedBy: uid });

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "These tests require a local Firestore emulator and never use production.");
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  environment = await initializeTestEnvironment({ projectId: "demo-ppl-about", firestore: { host, port: Number(port), rules: readFileSync(resolve(process.env.PPL_ABOUT_RULES_FILE || "firestore.rules"), "utf8") } });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async securityContext => {
    const db = securityContext.firestore();
    await setDoc(doc(db, "tournaments", "cup"), { ownerId: "owner" });
    await setDoc(doc(db, "tournaments", "other"), { ownerId: "someone-else" });
    await setDoc(doc(db, "users", "owner"), { role: "user", subscription: { status: "inactive" } });
    await setDoc(doc(db, "users", "subscriber"), { role: "user", subscription: { status: "active", paymentStatus: "paid", validUntil: Timestamp.fromMillis(Date.now() + 3600000) } });
    await setDoc(doc(db, "users", "admin"), { role: "platformAdmin" });
  });
});
after(async () => environment?.cleanup());

test("the organiser can create, update and remove content for their tournament without a subscription", async () => {
  const db = context("owner");
  await assertSucceeds(setDoc(page(db), content("owner")));
  await assertSucceeds(setDoc(page(db), { ...content("owner", 2), intro: "", sections: [] }));
  assert.equal((await getDoc(page(db))).data().intro, "");
  await assertFails(setDoc(page(db, "other"), content("owner")));
});

test("viewers, anonymous visitors and unrelated paid organisers cannot write", async () => {
  for (const db of [environment.unauthenticatedContext().firestore(), context("viewer"), context("subscriber")]) {
    await assertSucceeds(getDoc(page(db)));
    await assertFails(setDoc(page(db), content("subscriber")));
  }
  await setDoc(page(context("owner")), content("owner"));
  await assertSucceeds(getDoc(page(environment.unauthenticatedContext().firestore())));
  await assertFails(deleteDoc(page(context("subscriber"))));
  await assertFails(getDocs(collection(environment.unauthenticatedContext().firestore(), "tournamentAbout")));
});

test("platform administrators and the creator can manage content including legacy PPL", async () => {
  await assertSucceeds(setDoc(page(context("admin")), content("admin")));
  const creator = context("creator", "desiindianboyz@gmail.com");
  await assertSucceeds(setDoc(page(creator, "pundag-premier-league-2025"), content("creator")));
});

test("writes reject stale revisions, impersonation and unexpected fields", async () => {
  const db = context("owner");
  await setDoc(page(db), content("owner"));
  await assertFails(setDoc(page(db), content("owner")));
  await assertFails(setDoc(page(db), { ...content("owner", 2), updatedBy: "admin" }));
  await assertFails(setDoc(page(db), { ...content("owner", 2), ownerId: "owner" }));
  await assertFails(setDoc(page(db), { ...content("owner", 2), intro: "x".repeat(2001) }));
  await assertFails(setDoc(page(db), { ...content("owner", 2), sections: Array(21).fill({}) }));
  await assertSucceeds(deleteDoc(page(db)));
});
