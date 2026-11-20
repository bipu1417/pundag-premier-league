const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const backendRequire = createRequire(resolve("functions/package.json"));
const { initializeApp, deleteApp } = backendRequire("firebase-admin/app");
const { getFirestore } = backendRequire("firebase-admin/firestore");
const { recountPlayers } = require("../functions/playerCounts");
let app, db;
const params = { year: "2026", tournamentId: "cup" };
const paths = ["tournaments/cup", "years/2026/tournaments/cup", "publicTournaments/cup"];
before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "These tests require a local Firestore emulator.");
  app = initializeApp({ projectId: "demo-ppl-count-sync" }, "player-count-sync");
  db = getFirestore(app);
});
beforeEach(async () => {
  await db.recursiveDelete(db.collection("years"));
  const batch = db.batch();
  paths.forEach((path) => batch.set(db.doc(path), { year: 2026, registeredPlayerCount: 150 }));
  await batch.commit();
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

test("recount uses player documents and excludes repeated pending submissions", async () => {
  const batch = db.batch();
  for (let i = 0; i < 3; i++) batch.set(db.doc(`${paths[1]}/players/p${i}`), { approved: true });
  for (let i = 0; i < 8; i++) batch.set(db.doc(`${paths[1]}/pendingPlayers/p${i}`), { approved: false });
  await batch.commit();
  assert.equal(await recountPlayers(db, params), 3);
  for (const path of paths) {
    const data = (await db.doc(path).get()).data();
    assert.equal(data.approvedPlayerCount, 3);
    assert.equal(data.registeredPlayerCount, 3);
  }
  await db.doc(`${paths[1]}/players/p1`).delete();
  // Delayed and duplicate event deliveries recount current data rather than apply deltas.
  assert.equal(await recountPlayers(db, params), 2);
  assert.equal(await recountPlayers(db, params), 2);
  for (const path of paths) assert.equal((await db.doc(path).get()).data().approvedPlayerCount, 2);
});

test("a tournament with no registered players is counted as zero", async () => {
  assert.equal(await recountPlayers(db, params), 0);
  assert.equal((await db.doc(paths[2]).get()).data().approvedPlayerCount, 0);
});

test("a delayed event cannot recreate a deleted tournament", async () => {
  await db.doc(paths[0]).delete();
  assert.equal(await recountPlayers(db, params), undefined);
  assert.equal((await db.doc(paths[0]).get()).exists, false);
});
