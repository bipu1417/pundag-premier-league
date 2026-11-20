// Requires a local Firestore emulator and @firebase/rules-unit-testing.
// PPL_TEST_DEPENDENCIES may point to an external test-tool package.json.
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const dependencies = process.env.PPL_TEST_DEPENDENCIES ? createRequire(resolve(process.env.PPL_TEST_DEPENDENCIES)) : require;
const { initializeTestEnvironment, assertFails, assertSucceeds } = dependencies("@firebase/rules-unit-testing");
const sdk = dependencies("firebase/firestore");
const { doc, collection, setDoc, getDoc, getDocs, updateDoc, writeBatch, Timestamp } = sdk;
const { transformSync } = require("@babel/core");
const code = transformSync(readFileSync(resolve("src/utils/tournamentCapacity.js"), "utf8"), {
  configFile: false, babelrc: false, plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
}).code;
const backendRequire = createRequire(resolve("functions/package.json"));
const { initializeApp, deleteApp } = backendRequire("firebase-admin/app");
const { getFirestore } = backendRequire("firebase-admin/firestore");
const { submitRegistration } = require("../functions/registration");
const backendApp = initializeApp({ projectId: "demo-ppl-capacity" }, "capacity-server");
const backendDb = getFirestore(backendApp);
let environment, limits;
const year = String(new Date().getFullYear());
const tournament = { id: "cup", year: Number(year) };
const index = (db) => doc(db, "tournaments", tournament.id);
const publicIndex = (db) => doc(db, "publicTournaments", tournament.id);
const entry = (db, name, id) => doc(db, "years", year, "tournaments", tournament.id, name, id);
const service = (db) => {
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (name === "firebase/firestore") return sdk;
    if (name === "firebase/functions") return {
      getFunctions: () => ({}),
      httpsCallable: () => async (data) => ({ data: await submitRegistration(backendDb, { data, auth: { uid: data.payload.submittedBy || "player" } }) }),
    };
    if (name === "../firebase") return { db };
    if (name === "./tournamentLimits") return limits;
    throw new Error(`Unexpected dependency ${name}`);
  }, exports);
  return exports;
};
const owner = () => environment.authenticatedContext("owner", { email: "owner@example.com" }).firestore();
const player = (id = "player") => environment.authenticatedContext(id).firestore();
const anonymousPlayer = () => environment.authenticatedContext("anonymous-player", { firebase: { sign_in_provider: "anonymous" } }).firestore();
const payload = { name: "Player", approved: false, paymentStatus: "pending" };
let nextIdentity = 0;
const payloadFor = (userId = "player") => {
  const identity = ++nextIdentity;
  return { ...payload, submittedBy: userId, mnumber: String(9000000000 + identity), aadhaar: String(200000000000 + identity) };
};
const settings = () => ({
  capacityVersion: 1, maxTeams: 2, maxPlayers: 1, groupCount: 1,
  teamCount: 0, registeredPlayerCount: 0, approvedPlayerCount: 0, ownerId: "owner", year: Number(year), status: "draft",
  registrationStart: new Date(Date.now() - 3600000).toISOString(),
  registrationEnd: new Date(Date.now() + 3600000).toISOString(),
  registrationStartAt: Timestamp.fromMillis(Date.now() - 3600000),
  registrationEndAt: Timestamp.fromMillis(Date.now() + 3600000),
});
const publicSettings = (data) => ({
  name: data.name || "Tournament", sport: data.sport || "Sports", year: data.year,
  registrationStart: data.registrationStart || "", registrationEnd: data.registrationEnd || "",
  maxTeams: data.maxTeams || 0, maxPlayers: data.maxPlayers || 0, groupCount: data.groupCount || 0,
  teamCount: data.teamCount || 0, registeredPlayerCount: data.registeredPlayerCount || 0,
  ...(Number.isInteger(data.approvedPlayerCount) ? { approvedPlayerCount: data.approvedPlayerCount } : {}),
  winnerPrize: data.winnerPrize || 0, runnerUpPrize: data.runnerUpPrize || 0,
  auctionEnabled: Boolean(data.auctionEnabled), status: data.status || "draft",
});
const seed = async (patch = {}) => environment.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, "users", "owner"), { role: "user", subscription: { status: "active", paymentStatus: "paid", validUntil: Timestamp.fromMillis(Date.now() + 3600000) } });
  const data = { ...settings(), ...patch };
  await setDoc(index(db), data);
  await setDoc(publicIndex(db), publicSettings(data));
  await setDoc(doc(db, "years", year, "tournaments", "cup"), { ...data, indexId: "cup" });
});

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Set FIRESTORE_EMULATOR_HOST; these tests never use production.");
  limits = await import("../src/utils/tournamentLimits.js");
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  environment = await initializeTestEnvironment({ projectId: "demo-ppl-capacity", firestore: { host, port: Number(port), rules: readFileSync(resolve("firestore.rules"), "utf8") } });
});
beforeEach(async () => { await environment.clearFirestore(); await seed(); });
after(async () => { await environment?.cleanup(); await backendDb.terminate(); await deleteApp(backendApp); });

test("new tournaments require valid limits and matching settings on both documents", async () => {
  const db = owner();
  const data = settings();
  const batch = writeBatch(db);
  batch.set(doc(db, "tournaments", "new"), data);
  batch.set(doc(db, "years", year, "tournaments", "new"), { ...data, indexId: "new" });
  await batch.commit();
  await assertFails(setDoc(doc(db, "tournaments", "invalid"), { ...data, groupCount: 2 }));
  await assertFails(setDoc(doc(db, "years", year, "tournaments", "mismatched"), { ...data, indexId: "new" }));
});

test("signed-out visitors can browse tournaments but not private registrations", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDocs(collection(db, "publicTournaments")));
  await assertSucceeds(getDoc(publicIndex(db)));
  await assertFails(getDocs(collection(db, "tournaments")));
  await assertFails(getDoc(index(db)));
  await assertFails(getDocs(collection(db, "years", year, "tournaments", "cup", "pendingPlayers")));
});

test("an anonymous registration session can submit but cannot read private tournament data", async () => {
  const db = anonymousPlayer();
  await assertFails(getDoc(index(db)));
  await assertFails(getDocs(collection(db, "years", year, "tournaments", "cup", "players")));
  const id = await service(db).registerPlayer(tournament, payloadFor("anonymous-player"));
  assert.ok(id);
  assert.equal((await getDoc(publicIndex(owner()))).data().registeredPlayerCount, 0);
});

test("distinct pending submissions do not reserve places; concurrent approvals respect the final place", async () => {
  const ids = await Promise.all(Array.from({ length: 4 }, () => service(player()).registerPlayer(tournament, payloadFor())));
  assert.equal((await getDoc(index(owner()))).data().registeredPlayerCount, 0);
  assert.equal((await getDoc(publicIndex(owner()))).data().registeredPlayerCount, 0);
  const results = await Promise.allSettled(ids.map((id) => service(owner()).approvePlayer(tournament, id)));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal((await getDoc(index(owner()))).data().registeredPlayerCount, 1);
  assert.equal((await getDoc(publicIndex(owner()))).data().registeredPlayerCount, 1);
  assert.equal((await getDoc(doc(owner(), "years", year, "tournaments", "cup"))).data().registeredPlayerCount, 1);
  assert.equal((await getDocs(collection(owner(), "years", year, "tournaments", "cup", "players"))).size, 1);
});

test("raw approval and counter bypasses are denied", async () => {
  const db = owner();
  await assertFails(setDoc(entry(db, "players", "bypass"), { ...payload, approved: true }));
  await assertFails(updateDoc(index(db), { maxPlayers: 999 }));
  await assertFails(updateDoc(index(db), { registeredPlayerCount: 1, lastRegistrationId: "missing" }));
  const id = await service(player()).registerPlayer(tournament, payloadFor());
  const batch = writeBatch(db);
  batch.set(entry(db, "players", id), { ...payloadFor(), approved: true });
  batch.delete(entry(db, "pendingPlayers", id));
  await assertFails(batch.commit());
});

test("rejection leaves capacity unchanged; approval fills the place", async () => {
  const id = await service(player()).registerPlayer(tournament, payloadFor());
  await service(owner()).rejectPlayer(tournament, id);
  assert.equal((await getDoc(index(owner()))).data().registeredPlayerCount, 0);
  await assert.rejects(service(owner()).rejectPlayer(tournament, id));
  const second = await service(player()).registerPlayer(tournament, payloadFor());
  const extra = await service(player()).registerPlayer(tournament, payloadFor());
  await service(owner()).approvePlayer(tournament, second);
  assert.equal((await getDoc(index(owner()))).data().registeredPlayerCount, 1);
  assert.equal((await getDoc(entry(owner(), "players", second))).data().approved, true);
  assert.equal((await getDoc(entry(owner(), "pendingPlayers", second))).exists(), false);
  await service(owner()).rejectPlayer(tournament, extra);
  assert.equal((await getDoc(index(owner()))).data().registeredPlayerCount, 1);
  await assert.rejects(service(owner()).approvePlayer(tournament, second), /already been processed/);
  await assert.rejects(service(player()).registerPlayer(tournament, payloadFor()), /limit reached/);
});

test("simultaneous approval and rejection cannot both process the same registration", async () => {
  const id = await service(player()).registerPlayer(tournament, payloadFor());
  const results = await Promise.allSettled([service(owner()).approvePlayer(tournament, id), service(owner()).rejectPlayer(tournament, id)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const approved = (await getDoc(entry(owner(), "players", id))).exists();
  assert.equal((await getDoc(index(owner()))).data().registeredPlayerCount, approved ? 1 : 0);
});

test("concurrent team creation respects the limit; editing and deleting still work", async () => {
  const db = owner();
  const results = await Promise.allSettled(Array.from({ length: 4 }, (_, i) => service(db).createTeam(tournament, { teamName: `Team ${i}` })));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 2, results.map((result) => result.reason?.message || "accepted").join(" | "));
  const teams = await getDocs(collection(db, "years", year, "tournaments", "cup", "teamdetails"));
  const team = teams.docs[0];
  await updateDoc(team.ref, { teamName: "Edited" });
  await assertFails(setDoc(entry(db, "teamdetails", "bypass"), { teamName: "Extra" }));
  await service(db).deleteTeam(tournament, team.id);
  await service(db).createTeam(tournament, { teamName: "Replacement" });
  assert.equal((await getDoc(index(db))).data().teamCount, 2);
});

test("server rejects registration outside the date window", async () => {
  await seed({ registrationEndAt: Timestamp.fromMillis(Date.now() - 1000) });
  const db = player();
  const batch = writeBatch(db);
  batch.set(entry(db, "pendingPlayers", "late"), payloadFor());
  await assertFails(batch.commit());
});

test("pending applications remain private and ordinary players cannot create teams", async () => {
  const db = player();
  await assertFails(getDocs(collection(db, "years", year, "tournaments", "cup", "pendingPlayers")));
  await assertFails(service(db).createTeam(tournament, { teamName: "Unauthorized" }));
});

test("fixture setup uses the configured groups after enough teams exist", async () => {
  const db = owner();
  const setup = entry(db, "fixtures", "setup");
  await assertFails(setDoc(setup, { groupCount: 1 }));
  await service(db).createTeam(tournament, { teamName: "A" });
  await service(db).createTeam(tournament, { teamName: "B" });
  await assertFails(setDoc(setup, { groupCount: 2 }));
  await setDoc(setup, { groupCount: 1 });
});

test("fixture order can be saved by the owner or platform admin, but not another subscriber", async () => {
  await seed({ teamCount: 2 });
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "admin"), { role: "platformAdmin" });
    await setDoc(doc(db, "users", "other"), { role: "user", subscription: {
      status: "active", paymentStatus: "paid", validUntil: Timestamp.fromMillis(Date.now() + 3600000),
    } });
  });
  const admin = environment.authenticatedContext("admin", { email: "admin@example.com" }).firestore();
  const other = environment.authenticatedContext("other", { email: "other@example.com" }).firestore();
  const data = { groupCount: 1, groupMatchOrder: ["match-b", "match-a"], knockoutMatchOrder: { r0: ["r0-m1", "r0-m0"] } };
  await assertSucceeds(setDoc(entry(owner(), "fixtures", "setup"), data));
  await assertSucceeds(setDoc(entry(admin, "fixtures", "setup"), data));
  await assertFails(setDoc(entry(other, "fixtures", "setup"), data));
  await assertFails(setDoc(entry(admin, "fixtures", "setup"), { ...data, groupCount: 2 }));
  await assertFails(setDoc(entry(other, "players", "unrelated"), { name: "Unauthorized" }));
  await assertSucceeds(setDoc(doc(admin, "fixtures", "ppl2025"), data));
  await assertFails(setDoc(doc(other, "fixtures", "ppl2025"), data));
});

test("older tournaments remain usable without invented limits or reset counts", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const data = settings();
    for (const key of ["capacityVersion", "maxTeams", "maxPlayers", "groupCount", "teamCount", "registeredPlayerCount", "approvedPlayerCount"]) delete data[key];
    await setDoc(index(context.firestore()), data);
  });
  const id = await service(player()).registerPlayer(tournament, payloadFor());
  await service(owner()).approvePlayer(tournament, id);
  await service(owner()).createTeam(tournament, { teamName: "Older team" });
  assert.equal((await getDoc(index(owner()))).data().registeredPlayerCount, undefined);
});


test("approval cannot leave the public or yearly capacity mirror stale", async () => {
  const db = owner();
  const id = await service(player()).registerPlayer(tournament, payloadFor());
  const batch = writeBatch(db);
  batch.set(entry(db, "players", id), { ...payloadFor(), approved: true });
  batch.delete(entry(db, "pendingPlayers", id));
  batch.update(index(db), { registeredPlayerCount: 1, lastRegistrationId: id });
  await assertFails(batch.commit());
  assert.equal((await getDoc(index(db))).data().registeredPlayerCount, 0);
  assert.equal((await getDoc(entry(db, "pendingPlayers", id))).exists(), true);
});


test("inflated submission counters do not block registration when the approved count has room", async () => {
  await seed({ registeredPlayerCount: 1, approvedPlayerCount: 0 });
  const id = await service(player()).registerPlayer(tournament, payloadFor());
  await service(owner()).approvePlayer(tournament, id);
  assert.equal((await getDoc(index(owner()))).data().approvedPlayerCount, 1);
  assert.equal((await getDoc(publicIndex(owner()))).data().approvedPlayerCount, 1);
  await assert.rejects(service(player()).registerPlayer(tournament, payloadFor()), /limit reached/);
});


test("direct submissions and access to private identity locks cannot bypass the callable", async () => {
  const id = await service(player()).registerPlayer(tournament, payloadFor());
  assert.ok(id);
  for (const db of [owner(), anonymousPlayer()]) {
    await assertFails(setDoc(entry(db, "pendingPlayers", "direct"), payloadFor()));
    const locks = collection(db, "years", year, "tournaments", "cup", "registrationIdentities");
    await assertFails(getDocs(locks));
    await assertFails(setDoc(doc(locks, "fake"), { registrationId: "direct" }));
  }
  const locks = await backendDb.collection(`years/${year}/tournaments/cup/registrationIdentities`).get();
  assert.equal(locks.size, 2);
  await assertFails(getDoc(entry(owner(), "registrationIdentities", locks.docs[0].id)));
});
