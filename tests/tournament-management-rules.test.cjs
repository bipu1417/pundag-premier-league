const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const dependencies = process.env.PPL_TEST_DEPENDENCIES ? createRequire(resolve(process.env.PPL_TEST_DEPENDENCIES)) : require;
const { initializeTestEnvironment, assertFails, assertSucceeds } = dependencies("@firebase/rules-unit-testing");
const { collection, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, serverTimestamp, Timestamp } = dependencies("firebase/firestore");

let environment;
const year = String(new Date().getFullYear());
const indexRef = (db) => doc(db, "tournaments", "cup");
const publicRef = (db) => doc(db, "publicTournaments", "cup");
const registrationConfigRef = (db) => doc(db, "publicRegistrationConfigs", "cup");
const yearRef = (db) => doc(db, "years", year, "tournaments", "cup");
const owner = () => environment.authenticatedContext("owner", { email: "owner@example.com" }).firestore();
const other = () => environment.authenticatedContext("other", { email: "other@example.com" }).firestore();
const admin = () => environment.authenticatedContext("admin", { email: "admin@example.com" }).firestore();
const base = () => ({
  capacityVersion: 1, maxTeams: 8, maxPlayers: 80, groupCount: 2,
  teamCount: 0, registeredPlayerCount: 0,
  name: "Original Cup", sport: "Cricket", year: Number(year),
  ownerId: "owner", ownerEmail: "owner@example.com", ownerPhone: "9999999999",
  registrationStart: `${year}-11-01T10:00`, registrationEnd: `${year}-11-20T18:00`,
  registrationStartAt: Timestamp.fromDate(new Date(`${year}-11-01T10:00`)),
  registrationEndAt: Timestamp.fromDate(new Date(`${year}-11-20T18:00`)),
  winnerPrize: 10000, runnerUpPrize: 5000, upiId: "owner@upi", paymentQr: "data:image/jpeg;base64,AA==",
  auctionEnabled: true, subscriptionRequired: true, status: "draft", createdAt: Timestamp.now(),
});
const publicData = (data) => ({
  name: data.name || "Tournament", sport: data.sport || "Sports", year: data.year,
  registrationStart: data.registrationStart || "", registrationEnd: data.registrationEnd || "",
  maxTeams: data.maxTeams || 0, maxPlayers: data.maxPlayers || 0, groupCount: data.groupCount || 0,
  teamCount: data.teamCount || 0, registeredPlayerCount: data.registeredPlayerCount || 0,
  winnerPrize: data.winnerPrize || 0, runnerUpPrize: data.runnerUpPrize || 0,
  auctionEnabled: Boolean(data.auctionEnabled), status: data.status || "draft",
});

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "These tests require a local Firestore emulator.");
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  environment = await initializeTestEnvironment({ projectId: "demo-ppl-management", firestore: { host, port: Number(port), rules: readFileSync(resolve("firestore.rules"), "utf8") } });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "owner"), { role: "user", subscription: { status: "active", paymentStatus: "paid", validUntil: Timestamp.fromMillis(Date.now() + 3600000) } });
    await setDoc(doc(db, "users", "other"), { role: "user", subscription: { status: "active", paymentStatus: "paid", validUntil: Timestamp.fromMillis(Date.now() + 3600000) } });
    await setDoc(doc(db, "users", "admin"), { role: "platformAdmin", subscription: { status: "inactive", paymentStatus: "unpaid" } });
    const data = base();
    await setDoc(indexRef(db), data);
    await setDoc(publicRef(db), publicData(data));
    await setDoc(registrationConfigRef(db), { upiId: data.upiId, paymentQr: data.paymentQr });
    await setDoc(yearRef(db), { ...data, indexId: "cup" });
    await setDoc(doc(db, "tournamentAbout", "cup"), { intro: "About", sections: [], revision: 1, updatedAt: Timestamp.now(), updatedBy: "owner" });
  });
});
after(async () => environment?.cleanup());

const edit = async (db, patch = {}) => {
  const data = {
    name: "Updated Cup", sport: "Football", ownerPhone: "8888888888",
    maxTeams: 10, maxPlayers: 100, groupCount: 3,
    registrationStart: `${year}-12-01T10:00`, registrationEnd: `${year}-12-20T18:00`,
    registrationStartAt: Timestamp.fromDate(new Date(`${year}-12-01T10:00`)),
    registrationEndAt: Timestamp.fromDate(new Date(`${year}-12-20T18:00`)),
    winnerPrize: 20000, runnerUpPrize: 10000, upiId: "updated@upi", paymentQr: "data:image/jpeg;base64,BB==",
    auctionEnabled: false, updatedAt: serverTimestamp(), ...patch,
  };
  const batch = writeBatch(db);
  batch.update(indexRef(db), data);
  batch.update(yearRef(db), data);
  batch.set(publicRef(db), publicData({ ...(await getDoc(indexRef(db))).data(), ...data }));
  batch.set(registrationConfigRef(db), { upiId: data.upiId, paymentQr: data.paymentQr });
  return batch.commit();
};

test("the owner atomically updates both tournament documents", async () => {
  const db = owner();
  await edit(db);
  assert.equal((await getDoc(indexRef(db))).data().name, "Updated Cup");
  assert.equal((await getDoc(yearRef(db))).data().maxTeams, 10);
  assert.equal((await getDoc(publicRef(db))).data().name, "Updated Cup");
  assert.equal((await getDoc(registrationConfigRef(db))).data().upiId, "updated@upi");
});

test("the public mirror exposes only safe fields and must match its private source", async () => {
  const publicDb = environment.unauthenticatedContext().firestore();
  assert.equal((await getDoc(publicRef(publicDb))).data().name, "Original Cup");
  await assertFails(getDoc(indexRef(publicDb)));
  await assertFails(setDoc(publicRef(other()), { ...publicData(base()), ownerEmail: "leak@example.com" }));
  await assertFails(setDoc(publicRef(other()), { ...publicData(base()), name: "Fake Cup" }));
});

test("registration payment details allow individual authenticated reads but reject listing and mismatched writes", async () => {
  const db = other();
  assert.equal((await getDoc(registrationConfigRef(db))).data().upiId, "owner@upi");
  await assertFails(setDoc(registrationConfigRef(db), { upiId: "fake@upi", paymentQr: "fake" }));
  await assertFails(getDocs(collection(db, "publicRegistrationConfigs")));
});

test("the owner can edit without premium and a platform admin can edit any active tournament", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "users", "owner"), { role: "user", subscription: { status: "inactive", paymentStatus: "unpaid" } });
  });
  await assertSucceeds(edit(owner(), { name: "Owner Without Premium" }));
  await assertSucceeds(edit(admin(), { name: "Admin Updated Cup" }));
});

test("editing is rejected after the stored last registration date", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const expired = Timestamp.fromMillis(Date.now() - 1000);
    await updateDoc(indexRef(context.firestore()), { registrationEndAt: expired });
    await updateDoc(yearRef(context.firestore()), { registrationEndAt: expired });
  });
  await assertFails(edit(owner()));
  await assertFails(edit(admin()));
});

test("partial, unrelated-owner and invariant-changing edits are rejected", async () => {
  await assertFails(updateDoc(indexRef(owner()), { name: "One-sided" }));
  await assertFails(edit(other()));
  await assertFails(edit(owner(), { ownerId: "other" }));
  await assertFails(edit(owner(), { year: Number(year) + 1 }));
  await assertFails(edit(owner(), { registeredPlayerCount: 1 }));
});

test("limits cannot be reduced below current teams or registrations", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(indexRef(context.firestore()), { teamCount: 4, registeredPlayerCount: 20 });
    await updateDoc(yearRef(context.firestore()), { teamCount: 4, registeredPlayerCount: 20 });
  });
  await assertFails(edit(owner(), { maxTeams: 3 }));
  await assertFails(edit(owner(), { maxPlayers: 19 }));
  await edit(owner(), { maxTeams: 4, maxPlayers: 20, groupCount: 2 });
});

test("the owner deletes an empty tournament and its About page atomically", async () => {
  const db = owner();
  const batch = writeBatch(db);
  batch.delete(doc(db, "tournamentAbout", "cup"));
  batch.delete(publicRef(db));
  batch.delete(registrationConfigRef(db));
  batch.delete(yearRef(db));
  batch.delete(indexRef(db));
  await batch.commit();
  assert.equal((await getDoc(indexRef(db))).exists(), false);
  assert.equal((await getDoc(yearRef(db))).exists(), false);
  assert.equal((await getDoc(publicRef(db))).exists(), false);
  assert.equal((await getDoc(registrationConfigRef(db))).exists(), false);
  assert.equal((await getDoc(doc(db, "tournamentAbout", "cup"))).exists(), false);
});

test("non-owners and populated tournaments cannot be deleted", async () => {
  const otherDb = other();
  const otherBatch = writeBatch(otherDb);
  otherBatch.delete(yearRef(otherDb));
  otherBatch.delete(indexRef(otherDb));
  await assertFails(otherBatch.commit());
  await environment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(indexRef(context.firestore()), { teamCount: 1 });
    await updateDoc(yearRef(context.firestore()), { teamCount: 1 });
  });
  const ownerDb = owner();
  const ownerBatch = writeBatch(ownerDb);
  ownerBatch.delete(yearRef(ownerDb));
  ownerBatch.delete(indexRef(ownerDb));
  await assertFails(ownerBatch.commit());
});
