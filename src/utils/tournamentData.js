import { collection, doc } from "firebase/firestore";
import { db } from "../firebase";

export const LEGACY_PPL_2025_ID = "pundag-premier-league-2025";

export const legacyPpl2025Tournament = {
  id: LEGACY_PPL_2025_ID,
  name: "Pundag Premier League 2025",
  sport: "Cricket",
  year: 2025,
  status: "published",
  isLegacy: true,
  registrationStart: "2025-11-15T00:00",
  registrationEnd: "2025-11-26T16:59",
  winnerPrize: 35000,
  runnerUpPrize: 18000,
  upiId: "8972089184@pthdfc",
};

export const getTournamentDoc = (year, tournamentId) =>
  doc(db, "years", String(year), "tournaments", tournamentId);

export const getTournamentCollection = (year, tournamentId, collectionName) =>
  collection(db, "years", String(year), "tournaments", tournamentId, collectionName);

export const getDataCollection = (tournament, collectionName) => {
  if (tournament?.isLegacy) {
    return collection(db, collectionName);
  }

  return getTournamentCollection(tournament.year, tournament.id, collectionName);
};

export { isPastTournament, getRegistrationStatus } from "./tournamentLimits";
