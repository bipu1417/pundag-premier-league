import { getTeamPurse } from "./teamUtils.js";

export const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const playerTimestamp = (player) =>
  toMillis(player.approvedAt || player.createdAt || player.updatedAt);

const assignmentTimestamp = (assignment) =>
  toMillis(assignment.createdAt || assignment.updatedAt);

export const buildAuctionDashboard = (players = [], teams = [], assignments = [], unsoldEvents = []) => {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const assignedIds = new Set(assignments.map((assignment) => assignment.playerId));

  const soldPlayers = assignments
    .map((assignment) => ({
      ...assignment,
      player: playersById.get(assignment.playerId) || {
        id: assignment.playerId,
        name: "Unknown player",
      },
      price: Number(assignment.auctionPrice || 0),
      activityAt: assignmentTimestamp(assignment),
    }))
    .sort((left, right) => right.activityAt - left.activityAt);

  const availablePlayers = players
    .filter((player) => !assignedIds.has(player.id))
    .map((player) => ({ ...player, activityAt: playerTimestamp(player) }))
    .sort((left, right) => right.activityAt - left.activityAt ||
      String(left.name || "").localeCompare(String(right.name || "")));

  const recentUnsold = unsoldEvents
    .map((event) => ({
      ...event,
      player: playersById.get(event.playerId) || { id: event.playerId, name: "Unknown player" },
      activityAt: assignmentTimestamp(event),
    }))
    .sort((left, right) => right.activityAt - left.activityAt)
    .slice(0, 5);

  const topPricedPlayers = [...soldPlayers]
    .sort((left, right) => right.price - left.price || right.activityAt - left.activityAt)
    .slice(0, 5);

  const totalSpend = soldPlayers.reduce((sum, item) => sum + item.price, 0);
  const averagePrice = soldPlayers.length ? totalSpend / soldPlayers.length : 0;

  const teamStats = teams.map((team) => {
    const purchases = soldPlayers.filter((item) => item.teamName === team.teamName);
    const spent = purchases.reduce((sum, item) => sum + item.price, 0);
    const purse = getTeamPurse(team, 0);
    return {
      ...team,
      purchases,
      playersBought: purchases.length,
      spent,
      purse,
      remaining: purse - spent,
      utilization: purse > 0 ? Math.min(100, Math.max(0, (spent / purse) * 100)) : 0,
    };
  }).sort((left, right) => right.spent - left.spent || left.teamName.localeCompare(right.teamName));

  return {
    soldPlayers,
    availablePlayers,
    recentSold: soldPlayers.slice(0, 5),
    recentUnsold,
    topPricedPlayers,
    teamStats,
    totalPlayers: players.length,
    soldCount: soldPlayers.length,
    unsoldCount: availablePlayers.length,
    totalSpend,
    averagePrice,
    highestPrice: topPricedPlayers[0]?.price || 0,
    leadingTeam: teamStats[0] || null,
  };
};
