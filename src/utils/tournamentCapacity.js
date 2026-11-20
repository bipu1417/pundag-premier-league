import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, doc, increment, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { getRegisteredPlayerCount } from "./tournamentLimits";

const indexRef = (tournament) => doc(db, "tournaments", tournament.id);
const yearlyIndexRef = (tournament) => doc(db, "years", String(tournament.year), "tournaments", tournament.id);
const publicIndexRef = (tournament) => doc(db, "publicTournaments", tournament.id);
const entryRef = (tournament, name, id) => {
  const ref = collection(db, "years", String(tournament.year), "tournaments", tournament.id, name);
  return id ? doc(ref, id) : doc(ref);
};

// The backend checks private pending/approved entries and serializes duplicates.
export const registerPlayer = async (tournament, payload) => {
  const submit = httpsCallable(getFunctions(), "submitPlayerRegistration");
  const response = await submit({ tournamentId: tournament.id, year: Number(tournament.year), payload });
  return response.data.registrationId;
};

export const approvePlayer = async (tournament, playerId) => {
  const pending = entryRef(tournament, "pendingPlayers", playerId);
  const approved = entryRef(tournament, "players", playerId);
  await runTransaction(db, async (transaction) => {
    const index = await transaction.get(indexRef(tournament));
    const player = await transaction.get(pending);
    if (!player.exists()) throw new Error("This registration has already been processed.");
    if (!index.exists()) throw new Error("Tournament no longer exists.");
    const data = index.data();
    if (data.capacityVersion === 1) {
      if (getRegisteredPlayerCount(data) >= data.maxPlayers) throw new Error("Closed — player limit reached");
      const capacity = {
        registeredPlayerCount: increment(1),
        ...(Number.isSafeInteger(data.approvedPlayerCount) ? { approvedPlayerCount: increment(1) } : {}),
        lastRegistrationId: playerId,
      };
      transaction.update(index.ref, capacity);
      transaction.update(yearlyIndexRef(tournament), capacity);
      transaction.update(publicIndexRef(tournament), {
        registeredPlayerCount: capacity.registeredPlayerCount,
        ...(capacity.approvedPlayerCount ? { approvedPlayerCount: capacity.approvedPlayerCount } : {}),
      });
    }
    transaction.set(approved, {
      ...player.data(),
      approved: true,
      approvedAt: new Date().toISOString(),
    });
    transaction.delete(pending);
  });
};

export const rejectPlayer = async (tournament, playerId) => {
  const pending = entryRef(tournament, "pendingPlayers", playerId);
  await runTransaction(db, async (transaction) => {
    const player = await transaction.get(pending);
    if (!player.exists()) throw new Error("This registration has already been processed.");
    transaction.delete(pending);
  });
};

export const createTeam = async (tournament, payload) => {
  const team = entryRef(tournament, "teamdetails");
  await runTransaction(db, async (transaction) => {
    const index = await transaction.get(indexRef(tournament));
    if (!index.exists()) throw new Error("Tournament no longer exists.");
    const data = index.data();
    if (data.maxTeams && data.teamCount >= data.maxTeams) throw new Error("Closed — team limit reached.");
    transaction.set(team, payload);
    if (data.capacityVersion === 1) {
      const capacity = { teamCount: increment(1), lastTeamId: team.id };
      transaction.update(index.ref, capacity);
      transaction.update(yearlyIndexRef(tournament), capacity);
      transaction.update(publicIndexRef(tournament), { teamCount: capacity.teamCount });
    }
  });
};

export const deleteTeam = async (tournament, teamId) => {
  const team = entryRef(tournament, "teamdetails", teamId);
  await runTransaction(db, async (transaction) => {
    const index = await transaction.get(indexRef(tournament));
    const snapshot = await transaction.get(team);
    if (!snapshot.exists()) throw new Error("This team has already been deleted.");
    transaction.delete(team);
    if (index.data()?.capacityVersion === 1) {
      const capacity = { teamCount: increment(-1), lastDeletedTeamId: teamId };
      transaction.update(index.ref, capacity);
      transaction.update(yearlyIndexRef(tournament), capacity);
      transaction.update(publicIndexRef(tournament), { teamCount: capacity.teamCount });
    }
  });
};
