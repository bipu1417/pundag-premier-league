// approvedPlayerCount is rebuilt from the Registered Players collection by the
// backend. The legacy counter can include submissions from older clients.
export const getRegisteredPlayerCount = (tournament) => {
  const actual = tournament?.livePlayerCount ?? tournament?.approvedPlayerCount;
  return Number.isSafeInteger(actual) && actual >= 0
    ? actual
    : Number(tournament?.registeredPlayerCount || 0);
};

export const getTournamentSettings = (payload) => {
  const maxTeams = Number(payload.maxTeams);
  const maxPlayers = Number(payload.maxPlayers);
  const groupCount = Number(payload.groupCount);
  if (!Number.isSafeInteger(maxTeams) || maxTeams < 2) {
    throw new Error("Enter a whole number of at least 2 teams.");
  }
  if (!Number.isSafeInteger(maxPlayers) || maxPlayers < 1) {
    throw new Error("Enter a positive whole number for the player limit.");
  }
  if (!Number.isSafeInteger(groupCount) || groupCount < 1 || groupCount * 2 > maxTeams) {
    throw new Error("Each group must have room for at least 2 teams.");
  }
  const start = new Date(payload.registrationStart);
  const end = new Date(payload.registrationEnd);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new Error("Registration end must be after registration start.");
  }
  return { maxTeams, maxPlayers, groupCount };
};

export const isPastTournament = (tournament, now = Date.now()) => {
  if (!tournament) return false;
  if (tournament.isLegacy || String(tournament.status || "").toLowerCase() === "completed") return true;
  if (tournament.registrationEnd) {
    const end = new Date(tournament.registrationEnd).getTime();
    if (Number.isFinite(end)) return now > end;
  }
  return tournament.year ? Number(tournament.year) < new Date(now).getFullYear() : false;
};

export const canEditTournamentUntilRegistrationEnd = (tournament, now = Date.now()) => {
  if (!tournament || tournament.isLegacy) return false;
  const timestampEnd = tournament.registrationEndAt?.toMillis?.();
  const end = Number.isFinite(timestampEnd)
    ? timestampEnd
    : new Date(tournament.registrationEnd || "").getTime();
  return Number.isFinite(end) && now <= end;
};

export const getRegistrationStatus = (tournament, now = Date.now()) => {
  if (isPastTournament(tournament, now)) {
    return { isOpen: false, isPast: true, isFuture: false, label: "Closed — registration has ended" };
  }
  if (Number(tournament?.maxPlayers) > 0 && getRegisteredPlayerCount(tournament) >= Number(tournament.maxPlayers)) {
    return { isOpen: false, isPast: false, isFuture: false, isFull: true, label: "Closed — player limit reached" };
  }
  if (!tournament?.registrationStart || !tournament?.registrationEnd) {
    return { isOpen: false, isPast: false, isFuture: false, label: "Registration window not configured" };
  }
  const start = new Date(tournament.registrationStart);
  const end = new Date(tournament.registrationEnd);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    return { isOpen: false, isPast: false, isFuture: false, label: "Registration window not configured" };
  }
  if (now < start.getTime()) {
    return { isOpen: false, isPast: false, isFuture: true, label: `Coming soon - opens ${start.toLocaleString()}` };
  }
  return { isOpen: true, isPast: false, isFuture: false, label: `Open until ${end.toLocaleString()}` };
};
