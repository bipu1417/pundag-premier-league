// Only these fields are safe to expose to signed-out visitors.
export const toPublicTournament = (tournament = {}) => ({
  name: String(tournament.name || "Tournament").trim(),
  sport: String(tournament.sport || "Sports").trim(),
  year: Number(tournament.year || new Date().getFullYear()),
  registrationStart: String(tournament.registrationStart || ""),
  registrationEnd: String(tournament.registrationEnd || ""),
  maxTeams: Number(tournament.maxTeams || 0),
  maxPlayers: Number(tournament.maxPlayers || 0),
  groupCount: Number(tournament.groupCount || 0),
  teamCount: Number(tournament.teamCount || 0),
  registeredPlayerCount: Number(tournament.registeredPlayerCount || 0),
  ...(Number.isSafeInteger(tournament.approvedPlayerCount) && tournament.approvedPlayerCount >= 0
    ? { approvedPlayerCount: tournament.approvedPlayerCount } : {}),
  winnerPrize: Number(tournament.winnerPrize || 0),
  runnerUpPrize: Number(tournament.runnerUpPrize || 0),
  auctionEnabled: Boolean(tournament.auctionEnabled),
  status: String(tournament.status || "draft"),
});

// Payment instructions are kept separate from the public tournament directory.
// They are readable only after Firebase creates an anonymous registration session.
export const toPublicRegistrationConfig = (tournament = {}) => ({
  upiId: String(tournament.upiId || "").trim(),
  paymentQr: String(tournament.paymentQr || ""),
});
