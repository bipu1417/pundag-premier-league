import test from "node:test";
import assert from "node:assert/strict";
import { buildAuctionDashboard, toMillis } from "../src/utils/auctionDashboard.js";

const players = [
  { id: "p1", name: "Alpha", createdAt: "2026-10-01T10:00:00Z" },
  { id: "p2", name: "Bravo", createdAt: "2026-10-02T10:00:00Z" },
  { id: "p3", name: "Charlie", createdAt: "2026-10-03T10:00:00Z" },
  { id: "p4", name: "Delta", createdAt: "2026-10-04T10:00:00Z" },
];
const teams = [
  { id: "t1", teamName: "Titans", teamPurse: 1000 },
  { id: "t2", teamName: "Royals", teamPurse: 800 },
];
const assignments = [
  { id: "a1", playerId: "p1", teamName: "Titans", auctionPrice: 400, createdAt: "2026-10-10T10:00:00Z" },
  { id: "a2", playerId: "p2", teamName: "Royals", auctionPrice: 600, createdAt: "2026-10-11T10:00:00Z" },
];

test("dashboard separates sold and available players for one tournament dataset", () => {
  const dashboard = buildAuctionDashboard(players, teams, assignments);
  assert.equal(dashboard.totalPlayers, 4);
  assert.equal(dashboard.soldCount, 2);
  assert.equal(dashboard.unsoldCount, 2);
  assert.deepEqual(dashboard.recentSold.map((item) => item.player.name), ["Bravo", "Alpha"]);
  assert.deepEqual(dashboard.availablePlayers.map((item) => item.name), ["Delta", "Charlie"]);
});

test("dashboard displays the five latest explicit unsold outcomes", () => {
  const events = Array.from({ length: 7 }, (_, index) => ({
    id: `u${index}`,
    playerId: players[index % players.length].id,
    createdAt: { seconds: index + 1 },
  }));
  const dashboard = buildAuctionDashboard(players, teams, assignments, events);
  assert.equal(dashboard.recentUnsold.length, 5);
  assert.equal(dashboard.recentUnsold[0].id, "u6");
  assert.equal(dashboard.recentUnsold[0].player.name, "Charlie");
});

test("dashboard calculates price and team economics", () => {
  const dashboard = buildAuctionDashboard(players, teams, assignments);
  assert.equal(dashboard.totalSpend, 1000);
  assert.equal(dashboard.averagePrice, 500);
  assert.equal(dashboard.highestPrice, 600);
  assert.equal(dashboard.topPricedPlayers[0].player.name, "Bravo");
  assert.equal(dashboard.teamStats.find((team) => team.teamName === "Titans").remaining, 600);
  assert.equal(dashboard.teamStats.find((team) => team.teamName === "Royals").utilization, 75);
});

test("dashboard limits recent and highest lists to five entries", () => {
  const manyPlayers = Array.from({ length: 8 }, (_, index) => ({ id: `p${index}`, name: `Player ${index}` }));
  const manyAssignments = manyPlayers.map((player, index) => ({
    id: `a${index}`, playerId: player.id, teamName: "Titans", auctionPrice: index * 100,
    createdAt: { seconds: index + 1 },
  }));
  const dashboard = buildAuctionDashboard(manyPlayers, teams, manyAssignments);
  assert.equal(dashboard.recentSold.length, 5);
  assert.equal(dashboard.topPricedPlayers.length, 5);
  assert.equal(dashboard.recentSold[0].player.name, "Player 7");
  assert.equal(dashboard.topPricedPlayers[0].price, 700);
});

test("timestamp conversion accepts Firestore and standard date shapes", () => {
  assert.equal(toMillis({ seconds: 2 }), 2000);
  assert.equal(toMillis({ toMillis: () => 3000 }), 3000);
  assert.equal(toMillis("1970-01-01T00:00:04Z"), 4000);
  assert.equal(toMillis(null), 0);
});

test("empty auction data produces stable zero-value metrics", () => {
  const dashboard = buildAuctionDashboard([], [], []);
  assert.equal(dashboard.totalSpend, 0);
  assert.equal(dashboard.averagePrice, 0);
  assert.equal(dashboard.highestPrice, 0);
  assert.equal(dashboard.leadingTeam, null);
});
