import test from "node:test";
import assert from "node:assert/strict";
import { canEditTournamentUntilRegistrationEnd, getTournamentSettings, getRegistrationStatus } from "../src/utils/tournamentLimits.js";
import { makeGroups, makeGroupFixtures, buildSeededQualifiers, buildKnockoutRounds, applyFixtureOrder, moveFixture } from "../src/utils/fixtureScheduling.js";
import { toPublicRegistrationConfig, toPublicTournament } from "../src/utils/publicTournament.js";

const form = { maxTeams: "10", maxPlayers: "120", groupCount: "3", registrationStart: "2026-10-01T10:00", registrationEnd: "2026-11-01T18:00" };

test("creation accepts uneven groups and rejects invalid limits, groups, and dates", () => {
  assert.deepEqual(getTournamentSettings(form), { maxTeams: 10, maxPlayers: 120, groupCount: 3 });
  for (const patch of [{ maxTeams: 1 }, { maxTeams: 2.5 }, { maxPlayers: 0 }, { maxPlayers: "" }, { maxPlayers: 1.5 }, { groupCount: 0 }, { groupCount: 6 }, { registrationEnd: form.registrationStart }, { registrationStart: "invalid" }]) {
    assert.throws(() => getTournamentSettings({ ...form, ...patch }));
  }
});

test("approved player capacity closes registration independently of team capacity", () => {
  const now = new Date("2026-10-27T12:00").getTime();
  const tournament = { ...form, year: 2026, teamCount: 10, registeredPlayerCount: 119 };
  assert.equal(getRegistrationStatus(tournament, now).isOpen, true);
  assert.equal(getRegistrationStatus({ ...tournament, registeredPlayerCount: 120 }, now).isFull, true);
  assert.equal(getRegistrationStatus({ ...tournament, registeredPlayerCount: 121 }, now).isOpen, false);
  assert.equal(getRegistrationStatus(tournament, new Date("2026-09-01").getTime()).isFuture, true);
  assert.equal(getRegistrationStatus(tournament, new Date("2026-12-01").getTime()).isPast, true);
  assert.equal(getRegistrationStatus({ ...tournament, status: "completed" }, now).isOpen, false);
  assert.equal(getRegistrationStatus({ ...tournament, isLegacy: true }, now).isOpen, false);
  assert.equal(getRegistrationStatus(null, now).isOpen, false);
});

test("tournament editing remains open through the registration deadline and closes afterward", () => {
  const deadline = new Date("2026-11-01T18:00").getTime();
  assert.equal(canEditTournamentUntilRegistrationEnd(form, deadline - 1), true);
  assert.equal(canEditTournamentUntilRegistrationEnd(form, deadline), true);
  assert.equal(canEditTournamentUntilRegistrationEnd(form, deadline + 1), false);
  assert.equal(canEditTournamentUntilRegistrationEnd({ ...form, isLegacy: true }, deadline - 1), false);
});

test("public tournament listings exclude organiser and payment data", () => {
  const listing = toPublicTournament({
    ...form, name: "Public Cup", sport: "Cricket", year: 2026,
    ownerEmail: "private@example.com", ownerPhone: "9999999999",
    upiId: "private@upi", paymentQr: "private-image", registeredPlayerCount: 4,
  });
  assert.equal(listing.name, "Public Cup");
  assert.equal(listing.registeredPlayerCount, 4);
  for (const privateField of ["ownerId", "ownerEmail", "ownerPhone", "upiId", "paymentQr"]) {
    assert.equal(Object.hasOwn(listing, privateField), false);
  }
  assert.deepEqual(toPublicRegistrationConfig({ upiId: " private@upi ", paymentQr: "qr-data", ownerEmail: "private@example.com" }), {
    upiId: "private@upi",
    paymentQr: "qr-data",
  });
});

test("balanced groups retain every team and generate exactly one match per pair", () => {
  for (let count = 2; count <= 40; count += 1) {
    for (let groupCount = 1; groupCount <= Math.floor(count / 2); groupCount += 1) {
      const teams = Array.from({ length: count }, (_, index) => ({ id: `t${index}` }));
      const groups = makeGroups(teams, groupCount);
      const sizes = groups.map((group) => group.teams.length);
      assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
      assert.equal(new Set(groups.flatMap((group) => group.teams.map((team) => team.id))).size, count);
      const fixtures = makeGroupFixtures(groups);
      assert.equal(fixtures.length, sizes.reduce((sum, size) => sum + size * (size - 1) / 2, 0));
      assert.equal(new Set(fixtures.map((match) => [match.home.id, match.away.id].sort().join(":"))).size, fixtures.length);
    }
  }
  assert.equal(makeGroups([], 27)[26].name, "Group AA");
});

test("every knockout entrant survives seeding and arbitrary counts resolve to a final", () => {
  for (let count = 2; count <= 40; count += 1) {
    const groups = makeGroups(Array.from({ length: count }, (_, index) => ({ id: `t${index}`, teamName: `Team ${index}` })), Math.max(1, Math.floor(count / 2)));
    const qualifiers = buildSeededQualifiers(groups, 2, {});
    const winners = {};
    let rounds = buildKnockoutRounds(qualifiers, winners);
    const entrants = rounds[0].matches.flatMap((match) => match.options.map((entrant) => entrant.team.id));
    assert.equal(new Set(entrants).size, qualifiers.length);
    assert.equal(entrants.length, qualifiers.length);
    assert.equal(rounds.flatMap((round) => round.matches).filter((match) => !match.isBye).length, qualifiers.length - 1);
    for (let round = 0; round < rounds.length; round += 1) {
      for (const match of rounds[round].matches) {
        assert.equal(match.options.length, match.isBye ? 1 : 2);
        winners[match.id] = match.options[0].team.id;
      }
      rounds = buildKnockoutRounds(qualifiers, winners);
    }
    assert.equal(rounds.at(-1).name, "Final");
    assert.ok(rounds.at(-1).matches[0].selectedWinnerId);
  }
});

test("saved match order survives renamed teams, removed matches and newly added matches", () => {
  const teams = Array.from({ length: 4 }, (_, index) => ({ id: `t${index}`, name: `Team ${index}` }));
  const fixtures = makeGroupFixtures(makeGroups(teams, 1));
  const moved = moveFixture(fixtures, fixtures.at(-1).id, 0);
  assert.equal(moved[0].id, fixtures.at(-1).id);
  assert.notEqual(fixtures[0].id, moved[0].id);
  const order = moved.map((match) => match.id);
  const renamed = makeGroupFixtures(makeGroups([...teams].reverse(), 1));
  assert.deepEqual(applyFixtureOrder(renamed, order).map((match) => match.id), order);
  const updated = makeGroupFixtures(makeGroups([...teams.slice(1), { id: "new" }], 1));
  const ordered = applyFixtureOrder(updated, order);
  const surviving = order.filter((id) => updated.some((match) => match.id === id));
  assert.deepEqual(ordered.slice(0, surviving.length).map((match) => match.id), surviving);
  assert.equal(new Set(ordered.map((match) => match.id)).size, updated.length);
  assert.deepEqual(moveFixture(fixtures, "missing", 0), fixtures);
  assert.deepEqual(moveFixture(fixtures, fixtures[0].id, -1), fixtures);
});


test("the Firestore approved count takes precedence over inflated legacy registration totals", () => {
  const now = new Date("2026-10-27T12:00").getTime();
  const tournament = { ...form, year: 2026, maxPlayers: 150, registeredPlayerCount: 150, approvedPlayerCount: 148 };
  assert.equal(getRegistrationStatus(tournament, now).isOpen, true);
  assert.equal(getRegistrationStatus({ ...tournament, approvedPlayerCount: 150 }, now).isFull, true);
  assert.equal(getRegistrationStatus({ ...tournament, approvedPlayerCount: 0 }, now).isOpen, true);
  assert.equal(toPublicTournament(tournament).approvedPlayerCount, 148);
});


test("a fresh Firestore collection count overrides both persisted counters", () => {
  const tournament = { ...form, year: 2026, maxPlayers: 150, registeredPlayerCount: 150, approvedPlayerCount: 150, livePlayerCount: 148 };
  assert.equal(getRegistrationStatus(tournament, new Date("2026-10-27T12:00").getTime()).isOpen, true);
  assert.equal(Object.hasOwn(toPublicTournament(tournament), "livePlayerCount"), false);
});
