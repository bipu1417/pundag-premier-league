const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { transformSync } = require("@babel/core");
const code = transformSync(readFileSync("src/utils/tournamentCapacity.js", "utf8"), {
  configFile: false, babelrc: false, plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
}).code;
const tournament = { id: "cup", year: 2026 };
const pending = (id) => `years/2026/tournaments/cup/pendingPlayers/${id}`;
const approved = (id) => `years/2026/tournaments/cup/players/${id}`;

async function setup(signedIn = false) {
  const limits = await import("../src/utils/tournamentLimits.js");
  const settings = {
    capacityVersion: 1, maxPlayers: 1, registeredPlayerCount: 0, year: new Date().getFullYear(),
    registrationStart: new Date(Date.now() - 3600000).toISOString(),
    registrationEnd: new Date(Date.now() + 3600000).toISOString(),
  };
  const records = new Map([["tournaments/cup", { ...settings }], ["publicTournaments/cup", { ...settings }], ["years/2026/tournaments/cup", { ...settings }]]);
  let next = 0;
  const ref = (path) => ({ path, id: path.split("/").pop() });
  const sdk = {
    collection: (_db, ...parts) => ref(parts.join("/")),
    doc: (parent, ...parts) => ref(parent?.path ? `${parent.path}/${parts[0] || `p${++next}`}` : parts.join("/")),
    increment: (amount) => ({ amount }),
    getCountFromServer: async (target) => ({ data: () => ({ count: [...records.keys()].filter((path) => path.startsWith(`${target.path}/`)).length }) }),
    runTransaction: async (_db, callback) => {
      const changes = new Map(records);
      await callback({
        get: async (target) => ({ ref: target, exists: () => records.has(target.path), data: () => records.get(target.path) }),
        set: (target, value) => changes.set(target.path, value),
        delete: (target) => changes.delete(target.path),
        update: (target, fields) => changes.set(target.path, Object.fromEntries(Object.entries({ ...changes.get(target.path), ...fields }).map(([key, value]) => [key, value?.amount !== undefined ? records.get(target.path)[key] + value.amount : value]))),
      });
      records.clear();
      changes.forEach((value, key) => records.set(key, value));
    },
  };
  const submissions = [];
  const service = {};
  new Function("require", "exports", code)((name) => {
    if (name === "firebase/firestore") return sdk;
    if (name === "firebase/functions") return {
      getFunctions: () => ({}),
      httpsCallable: (_functions, name) => {
        assert.equal(name, "submitPlayerRegistration");
        return async (request) => {
          submissions.push(request);
          const id = `p${++next}`;
          records.set(pending(id), request.payload);
          return { data: { registrationId: id } };
        };
      },
    };
    if (name === "../firebase") return { db: {}, auth: { currentUser: signedIn ? { isAnonymous: false } : null } };
    if (name === "./tournamentLimits") return limits;
    throw new Error(`Unexpected dependency ${name}`);
  }, service);
  return { records, submissions, ...service };
}

test("registration delegates duplicate enforcement to the server and returns its confirmation ID", async () => {
  const service = await setup();
  const payload = { name: "A", mnumber: "9000000000", aadhaar: "200000000000" };
  const id = await service.registerPlayer(tournament, payload);
  assert.equal(service.submissions.length, 1);
  assert.deepEqual(service.submissions[0], { tournamentId: "cup", year: 2026, payload });
  assert.equal(service.records.has(pending(id)), true);
});

test("only approval consumes capacity and extra approvals leave pending data intact", async () => {
  const service = await setup();
  const first = await service.registerPlayer(tournament, { name: "A" });
  const second = await service.registerPlayer(tournament, { name: "B" });
  await service.approvePlayer(tournament, first);
  assert.equal(service.records.has(pending(first)), false);
  assert.equal(service.records.get(approved(first)).approved, true);
  for (const index of ["tournaments/cup", "publicTournaments/cup", "years/2026/tournaments/cup"]) assert.equal(service.records.get(index).registeredPlayerCount, 1);
  await assert.rejects(service.approvePlayer(tournament, second), /limit reached/);
  assert.equal(service.records.has(pending(second)), true);
  assert.equal(service.records.has(approved(second)), false);
  await service.rejectPlayer(tournament, second);
  for (const index of ["tournaments/cup", "publicTournaments/cup", "years/2026/tournaments/cup"]) assert.equal(service.records.get(index).registeredPlayerCount, 1);
  await assert.rejects(service.approvePlayer(tournament, first), /already been processed/);
});

test("rejecting a pending submission does not reduce the registered player count", async () => {
  const service = await setup();
  const id = await service.registerPlayer(tournament, { name: "A" });
  await service.rejectPlayer(tournament, id);
  for (const index of ["tournaments/cup", "publicTournaments/cup", "years/2026/tournaments/cup"]) assert.equal(service.records.get(index).registeredPlayerCount, 0);
  await assert.rejects(service.rejectPlayer(tournament, id), /already been processed/);
});


test("submitting and approving use the actual Firestore count despite an inflated legacy total", async () => {
  const service = await setup();
  for (const index of ["tournaments/cup", "publicTournaments/cup", "years/2026/tournaments/cup"]) {
    Object.assign(service.records.get(index), { registeredPlayerCount: 1, approvedPlayerCount: 0 });
  }
  const id = await service.registerPlayer(tournament, { name: "A" });
  await service.approvePlayer(tournament, id);
  for (const index of ["tournaments/cup", "publicTournaments/cup", "years/2026/tournaments/cup"]) {
    assert.equal(service.records.get(index).approvedPlayerCount, 1);
  }
});


