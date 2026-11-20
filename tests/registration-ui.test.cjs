const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve, dirname } = require("node:path");
const { createRequire } = require("node:module");
const { transformSync } = require("@babel/core");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { StaticRouter } = require("react-router-dom/server");
let current, tournamentList, limits;
const user = { uid: "owner", email: "owner@example.com" };
let homeAccount = { user, isSubscribed: true, effectiveRole: "admin" };
const load = (file) => {
  const exports = {};
  const localRequire = createRequire(file);
  const code = transformSync(readFileSync(file, "utf8"), {
    configFile: false, babelrc: false,
    presets: [[require.resolve("@babel/preset-react"), { runtime: "automatic" }]],
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  }).code;
  new Function("require", "exports", code)((name) => {
    if (name.endsWith("/context/TournamentContext")) return { useTournament: () => ({ activeTournament: current, tournaments: tournamentList || (current ? [current] : []), canManageActiveTournament: true, loading: false, selectTournament: () => {} }) };
    if (name.endsWith("/context/AuthContext")) return { useAuth: () => homeAccount };
    if (name.endsWith("/utils/tournamentData")) return limits;
    if (name.endsWith("/utils/tournamentCapacity") || name.endsWith("/utils/notificationService") || name.endsWith("/firebase")) return {};
    if (/\.(svg|png)$/.test(name)) return name;
    if (name.endsWith("/seo/MarketingContent")) return localRequire(name);
    if (name.startsWith(".")) return load(resolve(dirname(file), name + ".js"));
    return localRequire(name);
  }, exports);
  return exports;
};
const render = (file) => renderToStaticMarkup(React.createElement(StaticRouter, { location: "/" }, React.createElement(load(resolve(file)).default)));
const activeTournament = (count) => ({
  id: "cup", name: "Test Cup", year: new Date().getFullYear(), ownerId: user.uid,
  maxTeams: 2, teamCount: 2, maxPlayers: 10, registeredPlayerCount: count, groupCount: 1,
  upiId: "test@upi", paymentQr: "data:image/jpeg;base64,AA==",
  registrationStart: new Date(Date.now() - 3600000).toISOString(),
  registrationEnd: new Date(Date.now() + 3600000).toISOString(),
});
before(async () => { limits = await import("../src/utils/tournamentLimits.js"); });

test("all registration entry points close at capacity and reopen when a place is free", () => {
  for (const file of ["src/pages/Home.js", "src/pages/TournamentDirectory.js", "src/pages/TournamentManager.js"]) {
    current = activeTournament(10);
    const closed = render(file);
    assert.ok(!closed.includes('href="/registration"'), `${file} must remove the registration link when full`);
    assert.match(closed, />Closed</);
    current = activeTournament(9);
    assert.ok(render(file).includes('href="/registration"'), `${file} must allow registration with space available`);
  }
});

test("landing page links to About only when a tournament is selected", () => {
  current = null;
  assert.ok(!render("src/pages/Home.js").includes('href="/about"'));
  current = activeTournament(9);
  const html = render("src/pages/Home.js");
  assert.ok(html.includes('href="/about"'));
  assert.match(html, /About Test Cup/);
  assert.ok(!html.includes("View PPL history"));
});

test("owned tournaments expose edit and delete controls in Manage Tournaments", () => {
  current = activeTournament(0);
  current.teamCount = 0;
  const html = render("src/pages/TournamentManager.js");
  assert.match(html, />\s*Edit</);
  assert.match(html, />\s*Delete</);
});

test("Manage Tournaments closes editing after the last registration date", () => {
  current = { ...activeTournament(0), registrationEnd: new Date(Date.now() - 1000).toISOString() };
  const html = render("src/pages/TournamentManager.js");
  assert.match(html, /Editing closed/);
  assert.doesNotMatch(html, />\s*Edit</);
});

test("platform administrators can see tournaments they do not own", () => {
  const originalAccount = homeAccount;
  try {
    current = { ...activeTournament(0), ownerId: "another-owner", ownerEmail: "another@example.com" };
    homeAccount = { user, role: "platformAdmin", isCreator: false, isSubscribed: false, effectiveRole: "admin" };
    assert.match(render("src/pages/TournamentManager.js"), /Test Cup/);
  } finally {
    homeAccount = originalAccount;
  }
});

test("home page passes the current account state to its membership panel", () => {
  const originalAccount = homeAccount;
  try {
    current = activeTournament(9);
    homeAccount = { user, isSubscribed: false };
    const free = render("src/pages/Home.js");
    assert.match(free, /Apply for premium subscription/);
    assert.ok(!free.includes('href="/signup"'));
    homeAccount = { user, isSubscribed: true };
    const premium = render("src/pages/Home.js");
    assert.match(premium, /Enjoy your LeagueCraft experience/);
    assert.ok(!premium.includes('href="/signup"'));
  } finally {
    homeAccount = originalAccount;
  }
});

test("direct registration page disables submission and hides payment instructions when full", () => {
  current = activeTournament(10);
  const closed = render("src/components/RegistrationForm.js");
  assert.match(closed, /<fieldset disabled=""/);
  assert.match(closed, /<button disabled=""[^>]*>Closed<\/button>/);
  assert.ok(!closed.includes("UPI Payment"));
  current = activeTournament(9);
  const open = render("src/components/RegistrationForm.js");
  assert.ok(!open.includes('<fieldset disabled=""'));
  assert.match(open, /Submit Registration/);
  assert.match(open, /UPI Payment/);
});

test("signed-out visitors can view payment details and submit registration without login", () => {
  const originalAccount = homeAccount;
  try {
    current = activeTournament(9);
    homeAccount = { user: null, isSubscribed: false, effectiveRole: "user", ensureRegistrationSession: async () => ({ uid: "anonymous-player" }) };
    const html = render("src/components/RegistrationForm.js");
    assert.match(html, /Player Registration/);
    assert.match(html, /No account or sign-in is required/);
    assert.match(html, /Submit Registration/);
    assert.match(html, /UPI Payment/);
    assert.ok(!html.includes('<fieldset disabled=""'));
  } finally {
    homeAccount = originalAccount;
  }
});

test("registration success modal is gated behind a completed Firestore registration", () => {
  const source = readFileSync(resolve("src/components/RegistrationForm.js"), "utf8");
  const commit = source.indexOf("await registerPlayer(activeTournament, playerPayload)");
  const success = source.indexOf("setRegistrationSuccess({");
  const failure = source.indexOf("catch (error)", commit);
  assert.ok(commit >= 0 && success > commit && failure > success);
  assert.match(source, /title="Registration submitted successfully!"/);
  assert.match(source, /tone="success"/);
  assert.match(source, /Confirmation ID:/);
});

test("signed-out visitors see tournaments and the registration option", () => {
  const originalAccount = homeAccount;
  try {
    current = activeTournament(9);
    tournamentList = [
      current,
      { ...activeTournament(8), id: "cup-two", name: "Second Cup" },
    ];
    homeAccount = { user: null, isSubscribed: false, effectiveRole: "user" };
    const html = render("src/pages/TournamentDirectory.js");
    assert.match(html, /Test Cup/);
    assert.match(html, /Second Cup/);
    assert.equal((html.match(/href="\/registration"/g) || []).length, 2);
    assert.doesNotMatch(html, /href="\/(registered-players|teams|auction)"/);
  } finally {
    tournamentList = null;
    homeAccount = originalAccount;
  }
});

test("team form closes at its independent team limit", () => {
  current = activeTournament(0);
  const closed = render("src/pages/TeamManager.js");
  assert.match(closed, /<button disabled=""[^>]*>Closed<\/button>/);
  current = { ...current, teamCount: 1 };
  assert.match(render("src/pages/TeamManager.js"), />Create Team<\/button>/);
});


test("PPL 2026 registration stays available at 149 approved players with a 150-player limit", () => {
  for (const file of ["src/pages/Home.js", "src/pages/TournamentDirectory.js", "src/pages/TournamentManager.js"]) {
    current = { ...activeTournament(149), maxPlayers: 150, name: "Pundag Premier League", year: 2026 };
    assert.ok(render(file).includes('href="/registration"'), `${file} must allow registration at 149/150`);
    current = { ...current, registeredPlayerCount: 150 };
    assert.ok(!render(file).includes('href="/registration"'), `${file} must close registration at 150/150`);
  }
});


test("all registration buttons use the actual Firestore count when the legacy total is inflated", () => {
  for (const file of ["src/pages/Home.js", "src/pages/TournamentDirectory.js", "src/pages/TournamentManager.js"]) {
    current = { ...activeTournament(150), maxPlayers: 150, approvedPlayerCount: 148 };
    assert.ok(render(file).includes('href="/registration"'), `${file} must use 148 players instead of 150 submissions`);
    current = { ...current, approvedPlayerCount: 150 };
    assert.ok(!render(file).includes('href="/registration"'), `${file} must enforce the actual player limit`);
  }
  current = { ...activeTournament(150), maxPlayers: 150, approvedPlayerCount: 148 };
  assert.match(render("src/components/RegistrationForm.js"), /Registered players: 148 \/ 150/);
});
