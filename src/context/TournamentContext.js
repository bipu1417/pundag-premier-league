import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { collection, db, doc, getDoc, getDocs, onSnapshot, serverTimestamp } from "../firebase";
import { getTournamentCollection, getTournamentDoc, legacyPpl2025Tournament } from "../utils/tournamentData";
import { getCountFromServer, Timestamp, writeBatch } from "firebase/firestore";
import { canEditTournamentUntilRegistrationEnd, getRegisteredPlayerCount, getTournamentSettings } from "../utils/tournamentLimits";
import { useAuth } from "./AuthContext";
import { toPublicRegistrationConfig, toPublicTournament } from "../utils/publicTournament";

const TournamentContext = createContext();

export function TournamentProvider({ children }) {
  const { user, profile, role, isCreator, isSubscribed, effectiveRole, loading: authLoading } = useAuth();
  const [storedTournaments, setTournaments] = useState([]);
  const [playerCounts, setPlayerCounts] = useState({});
  const [activeTournamentId, setActiveTournamentId] = useState(localStorage.getItem("activeTournamentId") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    setLoading(true);
    setError("");
    const collectionName = user ? "tournaments" : "publicTournaments";
    return onSnapshot(collection(db, collectionName), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
      const hasLegacy = list.some((item) => item.id === legacyPpl2025Tournament.id);
      const availableTournaments = hasLegacy ? list : [...list, legacyPpl2025Tournament];

      setTournaments(availableTournaments);
      if (availableTournaments[0]) {
        setActiveTournamentId((currentId) => {
          if (currentId) return currentId;
          localStorage.setItem("activeTournamentId", availableTournaments[0].id);
          return availableTournaments[0].id;
        });
      }
      setLoading(false);
    }, (err) => {
      console.error("Unable to load tournaments:", err);
      setTournaments([]);
      setActiveTournamentId("");
      localStorage.removeItem("activeTournamentId");
        setError(err.code === "permission-denied"
          ? "Tournament list could not be loaded. Please try again or check the published Firestore rules."
          : err.message);
        setLoading(false);
    });
  }, [authLoading, user]);

  // Account holders can query the actual collection. Public visitors use the
  // server-maintained approved count, without access to private player records.
  useEffect(() => {
    setPlayerCounts({});
    if (!user) return undefined;
    let cancelled = false;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      const candidates = storedTournaments.filter((item) => !item.isLegacy && item.year);
      const results = await Promise.allSettled(candidates.map(async (item) => {
        const snapshot = await getCountFromServer(getTournamentCollection(item.year, item.id, "players"));
        return [`${item.year}/${item.id}`, snapshot.data().count];
      }));
      if (!cancelled) setPlayerCounts(Object.fromEntries(results.filter((result) => result.status === "fulfilled").map((result) => result.value)));
      refreshing = false;
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [storedTournaments, user]);

  const tournaments = useMemo(() => storedTournaments.map((item) => {
    const count = playerCounts[`${item.year}/${item.id}`];
    return Number.isSafeInteger(count) ? { ...item, livePlayerCount: count } : item;
  }), [storedTournaments, playerCounts]);

  const activeTournament = useMemo(
    () => tournaments.find((t) => t.id === activeTournamentId) || tournaments[0] || null,
    [activeTournamentId, tournaments]
  );
  const canManageActiveTournament = Boolean(
    user &&
    isSubscribed &&
    activeTournament &&
    !activeTournament.isLegacy &&
    activeTournament.ownerId === user.uid
  );

  const selectTournament = useCallback((id) => {
    setActiveTournamentId(id);
    localStorage.setItem("activeTournamentId", id);
  }, []);

  const createTournament = useCallback(async (payload) => {
    if (!isSubscribed && effectiveRole !== "admin") {
      throw new Error("Premium subscription is required to create tournaments.");
    }

    const settings = getTournamentSettings(payload);
    const year = Number(payload.year || new Date().getFullYear());
    const data = {
      ...settings,
      capacityVersion: 1,
      registeredPlayerCount: 0,
      approvedPlayerCount: 0,
      teamCount: 0,
      registrationStartAt: Timestamp.fromDate(new Date(payload.registrationStart)),
      registrationEndAt: Timestamp.fromDate(new Date(payload.registrationEnd)),
      name: payload.name,
      sport: payload.sport || "Cricket",
      year,
      ownerId: user.uid,
      ownerEmail: user.email,
      ownerPhone: String(payload.ownerPhone || profile?.phone || profile?.subscription?.contactPhone || "").trim(),
      registrationStart: payload.registrationStart,
      registrationEnd: payload.registrationEnd,
      winnerPrize: Number(payload.winnerPrize || 0),
      runnerUpPrize: Number(payload.runnerUpPrize || 0),
      upiId: String(payload.upiId || "").trim(),
      paymentQr: payload.paymentQr || "",
      auctionEnabled: Boolean(payload.auctionEnabled),
      subscriptionRequired: true,
      status: "draft",
      createdAt: serverTimestamp(),
    };

    const indexDoc = doc(collection(db, "tournaments"));
    const batch = writeBatch(db);
    batch.set(indexDoc, data);
    batch.set(getTournamentDoc(year, indexDoc.id), { ...data, indexId: indexDoc.id });
    batch.set(doc(db, "publicTournaments", indexDoc.id), toPublicTournament(data));
    batch.set(doc(db, "publicRegistrationConfigs", indexDoc.id), toPublicRegistrationConfig(data));
    await batch.commit();
    selectTournament(indexDoc.id);
    return indexDoc.id;
  }, [effectiveRole, isSubscribed, profile?.phone, profile?.subscription?.contactPhone, selectTournament, user]);

  const updateTournament = useCallback(async (tournamentId, payload) => {
    const current = tournaments.find((item) => item.id === tournamentId);
    if (!current || current.isLegacy) throw new Error("This tournament cannot be edited.");
    const isPlatformAdmin = isCreator || role === "platformAdmin";
    if (!user || (current.ownerId !== user.uid && !isPlatformAdmin)) {
      throw new Error("Only the tournament creator or a platform administrator can edit it.");
    }
    if (!canEditTournamentUntilRegistrationEnd(current)) {
      throw new Error("Tournament changes are closed because the last registration date has passed.");
    }

    const settings = getTournamentSettings(payload);
    if (settings.maxTeams < Number(current.teamCount || 0)) {
      throw new Error(`The team limit cannot be lower than the ${current.teamCount} existing teams.`);
    }
    if (settings.maxPlayers < getRegisteredPlayerCount(current)) {
      throw new Error(`The player limit cannot be lower than the ${getRegisteredPlayerCount(current)} registered players.`);
    }

    const data = {
      ...settings,
      registrationStartAt: Timestamp.fromDate(new Date(payload.registrationStart)),
      registrationEndAt: Timestamp.fromDate(new Date(payload.registrationEnd)),
      name: String(payload.name || "").trim(),
      sport: String(payload.sport || "Cricket").trim(),
      ownerPhone: String(payload.ownerPhone || "").trim(),
      registrationStart: payload.registrationStart,
      registrationEnd: payload.registrationEnd,
      winnerPrize: Number(payload.winnerPrize || 0),
      runnerUpPrize: Number(payload.runnerUpPrize || 0),
      upiId: String(payload.upiId || "").trim(),
      paymentQr: payload.paymentQr || "",
      auctionEnabled: Boolean(payload.auctionEnabled),
      updatedAt: serverTimestamp(),
    };
    if (!data.name) throw new Error("Enter a tournament name.");

    const batch = writeBatch(db);
    batch.update(doc(db, "tournaments", tournamentId), data);
    batch.update(getTournamentDoc(current.year, tournamentId), data);
    batch.set(doc(db, "publicTournaments", tournamentId), toPublicTournament({ ...current, ...data }));
    batch.set(doc(db, "publicRegistrationConfigs", tournamentId), toPublicRegistrationConfig({ ...current, ...data }));
    await batch.commit();
  }, [isCreator, role, tournaments, user]);

  const deleteTournament = useCallback(async (tournamentId) => {
    const current = tournaments.find((item) => item.id === tournamentId);
    if (!current || current.isLegacy) throw new Error("This tournament cannot be deleted.");
    if (!user || current.ownerId !== user.uid) throw new Error("Only the tournament organiser can delete it.");
    if (!isSubscribed && effectiveRole !== "admin") throw new Error("Premium subscription is required to delete tournaments.");
    if (Number(current.teamCount || 0) > 0 || getRegisteredPlayerCount(current) > 0) {
      throw new Error("Remove all teams and player registrations before deleting this tournament.");
    }

    const nestedNames = ["players", "pendingPlayers", "teamdetails", "AuctionDetails", "UnsoldDetails", "fixtures"];
    const snapshots = await Promise.all(nestedNames.map((name) =>
      getDocs(collection(db, "years", String(current.year), "tournaments", tournamentId, name))
    ));
    const nestedDocs = snapshots.flatMap((snapshot) => snapshot.docs);
    if (nestedDocs.length > 400) {
      throw new Error("This tournament contains too much linked data for safe deletion. Remove its records first.");
    }

    const aboutRef = doc(db, "tournamentAbout", tournamentId);
    const about = await getDoc(aboutRef);
    const batch = writeBatch(db);
    nestedDocs.forEach((item) => batch.delete(item.ref));
    if (about.exists()) batch.delete(aboutRef);
    batch.delete(doc(db, "publicTournaments", tournamentId));
    batch.delete(doc(db, "publicRegistrationConfigs", tournamentId));
    batch.delete(getTournamentDoc(current.year, tournamentId));
    batch.delete(doc(db, "tournaments", tournamentId));
    await batch.commit();

    if (activeTournamentId === tournamentId) {
      const next = tournaments.find((item) => item.id !== tournamentId)?.id || "";
      setActiveTournamentId(next);
      if (next) localStorage.setItem("activeTournamentId", next);
      else localStorage.removeItem("activeTournamentId");
    }
  }, [activeTournamentId, effectiveRole, isSubscribed, tournaments, user]);

  const value = useMemo(() => ({
    now,
    tournaments,
    activeTournament,
    canManageActiveTournament,
    loading,
    error,
    selectTournament,
    createTournament,
    updateTournament,
    deleteTournament,
  }), [
    activeTournament,
    canManageActiveTournament,
    createTournament,
    deleteTournament,
    error,
    loading,
    selectTournament,
    tournaments,
    updateTournament,
    now,
  ]);

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

export const useTournament = () => useContext(TournamentContext);
