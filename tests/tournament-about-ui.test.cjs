const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve, dirname } = require("node:path");
const { createRequire } = require("node:module");
const { transformSync } = require("@babel/core");
const { JSDOM } = require("jsdom");
const React = require("react");
const { createRoot } = require("react-dom/client");
const { MemoryRouter } = require("react-router-dom");
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost/" });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.IS_REACT_ACT_ENVIRONMENT = true;
let auth, selected, root, docs, subscribers, forceConflict;
const mockFirestore = {
  doc: (_, collection, id) => `${collection}/${id}`,
  serverTimestamp: () => "server-time",
  onSnapshot: (ref, next) => {
    subscribers.set(ref, next);
    next({ exists: () => docs.has(ref), data: () => docs.get(ref) });
    return () => subscribers.delete(ref);
  },
  runTransaction: async (_, callback) => callback({
    get: async ref => ({ exists: () => docs.has(ref), data: () => forceConflict ? { ...docs.get(ref), revision: 999 } : docs.get(ref) }),
    set: (ref, data) => { docs.set(ref, data); subscribers.get(ref)?.({ exists: () => true, data: () => data }); },
  }),
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const localRequire = createRequire(file);
  const code = transformSync(readFileSync(file, "utf8"), {
    configFile: false, babelrc: false,
    presets: [[require.resolve("@babel/preset-react"), { runtime: "automatic" }]],
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  }).code;
  new Function("require", "exports", code)(name => {
    if (name === "firebase/firestore") return mockFirestore;
    if (name.endsWith("/firebase")) return { db: {} };
    if (name.endsWith("/context/AuthContext")) return { useAuth: () => auth };
    if (name.endsWith("/context/TournamentContext")) return { useTournament: () => ({ activeTournament: selected, loading: false }) };
    if (name.endsWith("/utils/tournamentData")) return { LEGACY_PPL_2025_ID: "pundag-premier-league-2025" };
    if (/\.(jpeg|svg)$/.test(name)) return "/static/media/test.jpeg";
    if (name.startsWith(".")) return load(resolve(dirname(file), name + ".js"));
    return localRequire(name);
  }, exports);
  return exports;
}
const About = load(resolve("src/pages/AboutPpl.js")).AboutPpl;
const helpers = load(resolve("src/utils/tournamentAbout.js"));
async function render() {
  await React.act(async () => root.render(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(About))));
}
async function setup({ uid = "owner", role = "user" } = {}) {
  auth = { user: uid ? { uid } : null, role, isCreator: false, loading: false };
  selected = { id: "cup", name: "Test Cup", ownerId: "owner", sport: "Football", year: 2026 };
  docs = new Map(); subscribers = new Map(); forceConflict = false;
  root = createRoot(document.getElementById("root"));
  await render();
}
const text = () => document.body.textContent;
async function click(label) {
  const element = [...document.querySelectorAll("button")].find(button => button.textContent.trim() === label);
  assert.ok(element, `Button ${label} exists`);
  assert.ok(!element.disabled, `${label} is enabled`);
  await React.act(async () => element.click());
}
async function input(label, value) {
  const field = [...document.querySelectorAll("label")].find(item => item.querySelector("span")?.textContent === label)?.querySelector("input,textarea");
  assert.ok(field, `Field ${label} exists`);
  const { Simulate } = require("react-dom/test-utils");
  await React.act(async () => Simulate.change(field, { target: { value } }));
}
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; });

test("organisers can add, update and delete sections and cards, then persist their tournament only", async () => {
  await setup();
  await click("Edit About page");
  await input("Introduction", "Welcome to our football cup");
  await click("Add section");
  await input("Section title", "Committee");
  await click("Add card");
  await input("Card title / name / season", "Alex");
  await input("Subtitle / role / champion", "Chairperson");
  await click("Save changes");
  assert.match(text(), /Alex/);
  assert.equal(docs.get("tournamentAbout/cup").revision, 1);
  await click("Edit About page");
  await input("Card title / name / season", "Updated Alex");
  await click("Save changes");
  assert.match(text(), /Updated Alex/);
  await click("Edit About page");
  await click("Remove card");
  await click("Confirm");
  await click("Save changes");
  assert.equal(docs.get("tournamentAbout/cup").sections[0].entries.length, 0);
  await click("Edit About page");
  await click("Remove section");
  await click("Confirm");
  await click("Save changes");
  assert.deepEqual(docs.get("tournamentAbout/cup").sections, []);
  assert.equal(docs.size, 1);
});

test("viewers and other paid organisers have no editor; only actual platform admins have global access", async () => {
  await setup({ uid: "viewer" });
  auth.effectiveRole = "admin";
  await render();
  assert.doesNotMatch(text(), /Edit About page/);
  assert.equal(helpers.canEditTournamentAbout(selected, auth), false);
  auth.role = "platformAdmin";
  await render();
  assert.match(text(), /Edit About page/);
  auth = { user: null, role: null, isCreator: false };
  await render();
  assert.doesNotMatch(text(), /Edit About page/);
});

test("switching tournaments resets drafts and never displays PPL content for another tournament", async () => {
  await setup();
  await click("Edit About page");
  await input("Introduction", "Unsaved cup content");
  selected = { ...selected, id: "second", name: "Second Cup" };
  await render();
  assert.match(text(), /About Second Cup/);
  assert.doesNotMatch(text(), /Unsaved cup content|Pundag|Mayadih/);
  assert.doesNotMatch(text(), /Save changes/);
  selected = { ...selected, id: "pundag-premier-league-2025", name: "PPL" };
  await render();
  assert.match(text(), /Mayadih Sixer/);
  selected = null;
  await render();
  assert.match(text(), /Select a tournament/);
});

test("failed validation, conflicting edits and cancel retain saved content", async () => {
  await setup();
  await click("Edit About page");
  await click("Add section");
  await click("Save changes");
  assert.match(text(), /Each section needs a title/);
  assert.equal(docs.size, 0);
  await input("Section title", "Valid title");
  await click("Save changes");
  await click("Edit About page");
  await input("Introduction", "Unpublished changes");
  forceConflict = true;
  await click("Save changes");
  assert.match(text(), /Someone updated this page/);
  assert.equal(docs.get("tournamentAbout/cup").intro, "");
  await click("Cancel editing");
  await click("Confirm");
  assert.doesNotMatch(text(), /Unpublished changes|Save changes/);
});

test("image URLs reject unsafe schemes and malformed content is handled", () => {
  assert.equal(helpers.safeAboutImage("javascript:alert(1)"), "");
  assert.equal(helpers.safeAboutImage("data:image/svg+xml,anything"), "");
  assert.equal(helpers.safeAboutImage("https://example.com/logo.png"), "https://example.com/logo.png");
  assert.deepEqual(helpers.readAbout({ intro: 1, sections: [null, {}] }), { intro: "", sections: [] });
});

test("losing tournament ownership closes the editor immediately", async () => {
  await setup();
  await click("Edit About page");
  await input("Introduction", "Unsaved private draft");
  selected = { ...selected, ownerId: "new-owner" };
  await render();
  assert.doesNotMatch(text(), /Save changes|Edit About page|Unsaved private draft/);
});

test("saving an empty legacy page does not bring back the default history", async () => {
  await setup();
  selected = { ...selected, id: "pundag-premier-league-2025", name: "PPL" };
  docs.set("tournamentAbout/pundag-premier-league-2025", { intro: "", sections: [], revision: 1 });
  await render();
  assert.match(text(), /The story starts here/);
  assert.doesNotMatch(text(), /Mayadih Sixer|Vivekananda/);
});
