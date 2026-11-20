import React, { useEffect, useMemo, useState } from "react";
import { db, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "../firebase";
import { useTournament } from "../context/TournamentContext";
import { makeGroups, makeGroupFixtures, buildSeededQualifiers, buildKnockoutRounds, applyFixtureOrder, moveFixture } from "../utils/fixtureScheduling";
import { useAuth } from "../context/AuthContext";
import { getDataCollection } from "../utils/tournamentData";

const getTeamLabel = (team) => team?.teamName || team?.name || "Team";

const getFixtureDocRef = (tournament) => {
  if (!tournament) return null;
  if (tournament.isLegacy) {
    return doc(db, "fixtures", tournament.id);
  }

  return doc(db, "years", String(tournament.year), "tournaments", tournament.id, "fixtures", "setup");
};

const getEntrantLabel = (entrant) => {
  if (!entrant) return "Bye";
  if (entrant.team) return getTeamLabel(entrant.team);
  return entrant.label || "TBD";
};

const getEntrantMeta = (entrant) => {
  if (!entrant?.groupName) return "";
  return `${entrant.groupName} Rank ${entrant.rank}`;
};

const serializeTeam = (team) => ({
  id: team?.id || "",
  name: getTeamLabel(team),
  teamUniqueId: team?.teamUniqueId || "",
});

const serializeEntrant = (entrant) => ({
  team: entrant?.team ? serializeTeam(entrant.team) : null,
  label: entrant?.label || "",
  groupId: entrant?.groupId || "",
  groupName: entrant?.groupName || "",
  rank: entrant?.rank || null,
});

const serializeGroups = (groups) =>
  groups.map((group) => ({
    id: group.id,
    name: group.name,
    teams: group.teams.map(serializeTeam),
  }));

const serializeGroupFixtures = (fixtures) =>
  fixtures.map((fixture, index) => ({
    id: fixture.id,
    matchNumber: index + 1,
    group: fixture.group,
    home: serializeTeam(fixture.home),
    away: serializeTeam(fixture.away),
  }));

const serializeKnockoutRounds = (rounds) =>
  rounds.map((round) => ({
    name: round.name,
    matches: round.matches.map((match, index) => ({
      id: match.id,
      matchNumber: Number(match.id.match(/-m(\d+)$/)?.[1] || 0) + 1,
      playOrder: index + 1,
      home: serializeEntrant(match.home),
      away: serializeEntrant(match.away),
      isBye: Boolean(match.isBye),
      selectedWinnerId: match.selectedWinnerId || "",
      winner: match.selectedWinnerId
        ? serializeTeam(match.options.find((entrant) => entrant.team.id === match.selectedWinnerId)?.team)
        : null,
    })),
  }));

export default function TournamentFixtures() {
  const { activeTournament, canManageActiveTournament } = useTournament();
  const { user, isCreator, role } = useAuth();
  const canEditFixtures = Boolean(user && activeTournament && (
    canManageActiveTournament || isCreator || role === "platformAdmin"
  ));
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupCount, setGroupCount] = useState(2);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2);
  const [standings, setStandings] = useState({});
  const [knockoutWinners, setKnockoutWinners] = useState({});
  const [groupMatchOrder, setGroupMatchOrder] = useState([]);
  const [knockoutMatchOrder, setKnockoutMatchOrder] = useState({});
  const [fixtureLoading, setFixtureLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const tournamentId = activeTournament?.id;
  const tournamentYear = activeTournament?.year;
  const tournamentIsLegacy = activeTournament?.isLegacy;
  const tournamentGroupCount = activeTournament?.groupCount;
  const fixtureTournament = useMemo(() => tournamentId ? {
    id: tournamentId, year: tournamentYear, isLegacy: tournamentIsLegacy, groupCount: tournamentGroupCount,
  } : null, [tournamentId, tournamentYear, tournamentIsLegacy, tournamentGroupCount]);

  useEffect(() => {
    setTeams([]);
    setError("");
    if (!fixtureTournament) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return onSnapshot(getDataCollection(fixtureTournament, "teamdetails"), (snapshot) => {
      setTeams(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => getTeamLabel(a).localeCompare(getTeamLabel(b))));
      setLoading(false);
    }, (err) => {
      console.error("Unable to load fixture teams:", err);
      setError(err.code === "permission-denied" ? "You do not have permission to view teams." : err.message);
      setLoading(false);
    });
  }, [fixtureTournament]);

  useEffect(() => {
    let cancelled = false;
    const loadFixtureSetup = async () => {
      if (!fixtureTournament) {
        setFixtureLoading(false);
        return;
      }

      setFixtureLoading(true);
      setSaveMessage("");
      setGroupMatchOrder([]);
      setKnockoutMatchOrder({});
      try {
        const ref = getFixtureDocRef(fixtureTournament);
        const snap = ref ? await getDoc(ref) : null;
        if (cancelled) return;
        if (snap?.exists()) {
          const data = snap.data();
          setGroupCount(Number(fixtureTournament.groupCount || data.groupCount || 2));
          setQualifiersPerGroup(Number(data.qualifiersPerGroup || 2));
          setStandings(data.standings || {});
          setKnockoutWinners(data.knockoutWinners || {});
          setGroupMatchOrder(Array.isArray(data.groupMatchOrder) ? data.groupMatchOrder : []);
          setKnockoutMatchOrder(data.knockoutMatchOrder || {});
        } else {
          setGroupCount(Number(fixtureTournament.groupCount || 2));
          setQualifiersPerGroup(2);
          setStandings({});
          setKnockoutWinners({});
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Unable to load fixture setup:", err);
        setSaveMessage(err.code === "permission-denied"
          ? "Fixture setup could not be loaded for this tournament."
          : err.message);
      } finally {
        if (!cancelled) setFixtureLoading(false);
      }
    };

    loadFixtureSetup();
    return () => { cancelled = true; };
  }, [fixtureTournament]);

  const configuredGroups = Number(activeTournament?.groupCount || 0);
  const maxGroups = Math.max(1, teams.length);
  const normalizedGroupCount = configuredGroups || Math.max(1, Math.min(groupCount, maxGroups));
  const needsMoreTeams = Boolean(configuredGroups && teams.length < configuredGroups * 2);
  const groups = useMemo(
    () => makeGroups(teams, normalizedGroupCount),
    [teams, normalizedGroupCount]
  );
  const smallestGroupSize = Math.min(...groups.map((group) => group.teams.length || 0));
  const maxQualifiers = Math.max(1, smallestGroupSize || 1);
  const normalizedQualifiers = Math.min(qualifiersPerGroup, maxQualifiers);
  const groupFixtures = useMemo(
    () => applyFixtureOrder(makeGroupFixtures(groups), groupMatchOrder),
    [groups, groupMatchOrder]
  );
  const qualifiers = useMemo(
    () => buildSeededQualifiers(groups, normalizedQualifiers, standings),
    [groups, normalizedQualifiers, standings]
  );
  const knockoutRounds = useMemo(
    () => buildKnockoutRounds(qualifiers, knockoutWinners).map((round, index) => ({
      ...round,
      matches: applyFixtureOrder(round.matches, knockoutMatchOrder[`r${index}`]),
    })),
    [knockoutWinners, qualifiers, knockoutMatchOrder]
  );
  const canGenerateKnockout = qualifiers.length >= 2;

  useEffect(() => {
    if (teams.length === 0 || configuredGroups) return;
    setGroupCount((current) => Math.min(current, maxGroups));
  }, [configuredGroups, maxGroups, teams.length]);

  useEffect(() => {
    if (teams.length === 0) return;
    setQualifiersPerGroup((current) => Math.min(current, maxQualifiers));
  }, [maxQualifiers, teams.length]);

  const handleStandingChange = (teamId, value) => {
    if (!canEditFixtures || saving) return;
    setStandings((current) => ({
      ...current,
      [teamId]: value,
    }));
    setKnockoutWinners({});
  };

  const handleWinnerChange = (matchId, teamId) => {
    if (!canEditFixtures || saving) return;
    setKnockoutWinners((current) => {
      const next = {};
      const changedRoundIndex = Number(matchId.match(/^r(\d+)-/)?.[1] || 0);

      Object.entries(current).forEach(([key, value]) => {
        const roundIndex = Number(key.match(/^r(\d+)-/)?.[1] || 0);
        if (roundIndex <= changedRoundIndex && key !== matchId) {
          next[key] = value;
        }
      });

      if (teamId) {
        next[matchId] = teamId;
      }

      return next;
    });
  };

  const handleGroupCountChange = (value) => {
    if (!canEditFixtures || saving || configuredGroups) return;
    setGroupCount(value);
    setKnockoutWinners({});
    setGroupMatchOrder([]);
    setKnockoutMatchOrder({});
  };

  const handleQualifiersChange = (value) => {
    if (!canEditFixtures || saving) return;
    setQualifiersPerGroup(value);
    setKnockoutWinners({});
    setKnockoutMatchOrder({});
  };

  const handleMatchMove = (matchId, position, roundIndex = null) => {
    if (!canEditFixtures || saving) return;
    setSaveMessage("");
    if (roundIndex === null) {
      setGroupMatchOrder(moveFixture(groupFixtures, matchId, position).map((match) => match.id));
    } else {
      setKnockoutMatchOrder((current) => ({
        ...current,
        [`r${roundIndex}`]: moveFixture(knockoutRounds[roundIndex].matches, matchId, position).map((match) => match.id),
      }));
    }
  };

  const renderOrderControl = (match, index, matches, roundIndex = null) => canEditFixtures && matches.length > 1 && (
    <label className="mt-3 flex items-center gap-2 text-xs text-gray-300">
      Play position
      <select
        aria-label={`Play position for ${roundIndex === null
          ? `${getTeamLabel(match.home)} vs ${getTeamLabel(match.away)}`
          : `${knockoutRounds[roundIndex].name} bracket match ${Number(match.id.match(/-m(\d+)$/)?.[1] || 0) + 1}`}`}
        value={index}
        onChange={(event) => handleMatchMove(match.id, Number(event.target.value), roundIndex)}
        disabled={saving}
        className="input-surface rounded-md px-3 py-2"
      >
        {matches.map((_, position) => (
          <option key={position} value={position}>{position + 1}</option>
        ))}
      </select>
    </label>
  );

  const saveFixtureSetup = async () => {
    if (!activeTournament || !canEditFixtures || saving || needsMoreTeams) return;

    setSaving(true);
    setSaveMessage("");
    try {
      await setDoc(getFixtureDocRef(activeTournament), {
        tournamentId: activeTournament.id,
        tournamentYear: activeTournament.year || null,
        groupCount: normalizedGroupCount,
        qualifiersPerGroup: normalizedQualifiers,
        standings,
        knockoutWinners,
        groupMatchOrder: groupFixtures.map((match) => match.id),
        knockoutMatchOrder: Object.fromEntries(knockoutRounds.map((round, index) => [
          `r${index}`, round.matches.map((match) => match.id),
        ])),
        groups: serializeGroups(groups),
        groupFixtures: serializeGroupFixtures(groupFixtures),
        knockoutRounds: serializeKnockoutRounds(knockoutRounds),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaveMessage("Fixture setup saved for this tournament.");
    } catch (err) {
      console.error("Unable to save fixture setup:", err);
      setSaveMessage(err.code === "permission-denied"
        ? "Only the tournament creator with an active subscription or a platform administrator can save fixtures."
        : err.message);
    } finally {
      setSaving(false);
    }
  };

  const ruleOptions = [
    { value: 1, label: "Top 1 from each group" },
    { value: 2, label: "Top 2 from each group" },
    { value: 3, label: "Top 3 from each group" },
    { value: 4, label: "Top 4 from each group" },
  ].filter((option) => option.value <= maxQualifiers);

  return (
    <div className="mx-auto max-w-7xl px-0 py-4 text-white sm:px-4 sm:py-8">
      <div className="surface rounded-lg p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-yellow-200">Tournament structure</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Fixtures & Groups</h1>
            {activeTournament && (
              <p className="safe-text mt-2 text-gray-300">{activeTournament.name} • {activeTournament.year}</p>
            )}
          </div>
          <span className="rounded-md border border-white/10 bg-gray-950/70 px-3 py-2 text-sm text-gray-300">
            {teams.length} team{teams.length === 1 ? "" : "s"}
          </span>
        </div>

        {!activeTournament ? (
          <p className="mt-6 rounded-md border border-white/10 bg-gray-950/70 p-4 text-gray-300">
            Select a tournament first.
          </p>
        ) : loading || fixtureLoading ? (
          <p className="mt-6 text-gray-300">Loading fixture details...</p>
        ) : error ? (
          <p className="mt-6 rounded-md border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>
        ) : teams.length < 2 || needsMoreTeams ? (
          <p className="mt-6 rounded-md border border-white/10 bg-gray-950/70 p-4 text-gray-300">
            Add at least {normalizedGroupCount * 2} teams for {normalizedGroupCount} group{normalizedGroupCount === 1 ? "" : "s"} before creating fixtures.
          </p>
        ) : (
          <>
            {!canEditFixtures && (
              <p className="mt-6 rounded-md border border-yellow-300/30 bg-yellow-300/10 p-4 text-yellow-100">
                This view is read-only for you. Tournament creators and platform administrators can plan fixtures.
              </p>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <label className="block text-sm text-gray-300">
                Number of groups
                <select
                  value={normalizedGroupCount}
                  onChange={(event) => handleGroupCountChange(Number(event.target.value))}
                  disabled={!canEditFixtures || saving || Boolean(configuredGroups)}
                  className="input-surface mt-1 w-full rounded-md px-3 py-2"
                >
                  {Array.from({ length: configuredGroups || maxGroups }, (_, index) => index + 1)
                    .filter((value) => value <= teams.length && teams.length / value >= 1)
                    .map((value) => (
                      <option key={value} value={value}>{value} group{value === 1 ? "" : "s"}</option>
                    ))}
                </select>
              </label>

              <label className="block text-sm text-gray-300">
                Qualification rule
                <select
                  value={normalizedQualifiers}
                  onChange={(event) => handleQualifiersChange(Number(event.target.value))}
                  disabled={!canEditFixtures || saving}
                  className="input-surface mt-1 w-full rounded-md px-3 py-2"
                >
                  {ruleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="rounded-md border border-white/10 bg-gray-950/70 p-4 text-sm text-gray-300">
                <p className="font-semibold text-yellow-100">Knockout pairing</p>
                <p className="mt-1">
                  Highest ranked qualifier is paired against the lowest ranked available qualifier from another group.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-400">
                Fixture data is stored against the selected tournament and shown read-only to signed-in users.
              </p>
              {canEditFixtures && (
                <button
                  type="button"
                  onClick={saveFixtureSetup}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center rounded-md bg-yellow-400 px-4 py-2 font-semibold text-gray-950 hover:bg-yellow-300 disabled:opacity-60 sm:w-auto"
                >
                  {saving ? "Saving..." : "Save Fixtures"}
                </button>
              )}
            </div>
            {saveMessage && (
              <p className="mt-3 rounded-md border border-white/10 bg-gray-950/70 p-3 text-sm text-gray-200">
                {saveMessage}
              </p>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {groups.map((group) => (
                <section key={group.id} className="rounded-lg border border-white/10 bg-gray-950/70 p-4">
                  <h2 className="text-lg font-bold text-yellow-300">{group.name}</h2>
                  <div className="mt-4 space-y-3">
                    {group.teams.map((team, index) => (
                      <div key={team.id} className="grid gap-2 rounded-md border border-white/10 bg-white/5 p-3 sm:grid-cols-[1fr_8rem] sm:items-center">
                        <div className="min-w-0">
                          <p className="safe-text font-semibold text-white">{getTeamLabel(team)}</p>
                          {team.teamUniqueId && <p className="break-all text-xs text-gray-400">{team.teamUniqueId}</p>}
                        </div>
                        <label className="text-xs text-gray-400">
                          Rank
                          <select
                            value={standings[team.id] || index + 1}
                            onChange={(event) => handleStandingChange(team.id, event.target.value)}
                            disabled={!canEditFixtures || saving}
                            className="input-surface mt-1 w-full rounded-md px-2 py-2"
                          >
                            {group.teams.map((_, rankIndex) => (
                              <option key={rankIndex + 1} value={rankIndex + 1}>{rankIndex + 1}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <section className="rounded-lg border border-white/10 bg-gray-950/70 p-4">
                <h2 className="text-xl font-bold text-white">Group Stage Fixtures</h2>
                {canEditFixtures && (
                  <p className="mt-2 text-sm text-gray-400">Choose a play position to move a match earlier or later, including across groups. Click Save Fixtures to keep the order.</p>
                )}
                <div className="mt-4 space-y-3">
                  {groupFixtures.map((fixture, index) => (
                    <div key={fixture.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-yellow-200">
                        Match {index + 1} • {fixture.group}
                      </p>
                      <p className="safe-text mt-1 font-semibold text-white">
                        {getTeamLabel(fixture.home)} vs {getTeamLabel(fixture.away)}
                      </p>
                      {renderOrderControl(fixture, index, groupFixtures)}
                    </div>
                  ))}
                  {groupFixtures.length === 0 && (
                    <p className="text-gray-400">No group fixtures available for this setup.</p>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-white/10 bg-gray-950/70 p-4">
                <h2 className="text-xl font-bold text-white">Knockout Bracket</h2>
                {canEditFixtures && (
                  <p className="mt-2 text-sm text-gray-400">Reorder matches within each round. Bracket match numbers and winner paths stay fixed; each round follows the previous round.</p>
                )}
                {!canGenerateKnockout ? (
                  <p className="mt-4 text-gray-400">Choose enough qualifiers to generate knockout fixtures.</p>
                ) : (
                  <div className="mt-4 space-y-5">
                    {knockoutRounds.map((round, roundIndex) => (
                      <div key={`${round.name}-${roundIndex}`}>
                        <h3 className="font-semibold text-yellow-300">{round.name}</h3>
                        <div className="mt-3 space-y-3">
                          {round.matches.map((match, matchIndex) => (
                            <div key={match.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Play {matchIndex + 1} • Bracket match {Number(match.id.match(/-m(\d+)$/)?.[1] || 0) + 1}
                              </p>
                              <p className="safe-text mt-1 font-semibold text-white">
                                {getEntrantLabel(match.home)} vs {getEntrantLabel(match.away)}
                              </p>
                              {(getEntrantMeta(match.home) || getEntrantMeta(match.away)) && (
                                <p className="mt-1 text-xs text-gray-400">
                                  {[getEntrantMeta(match.home), getEntrantMeta(match.away)].filter(Boolean).join(" vs ")}
                                </p>
                              )}

                              {renderOrderControl(match, matchIndex, round.matches, roundIndex)}
                              <label className="mt-3 block text-xs text-gray-400">
                                Winner
                                <select
                                  value={match.selectedWinnerId}
                                  onChange={(event) => handleWinnerChange(match.id, event.target.value)}
                                  disabled={!canEditFixtures || saving || match.options.length < 2}
                                  className="input-surface mt-1 w-full rounded-md px-3 py-2"
                                >
                                  <option value="">
                                    {match.options.length < 2 ? "Waiting for previous winner" : "Select winner"}
                                  </option>
                                  {match.options.map((entrant) => (
                                    <option key={entrant.team.id} value={entrant.team.id}>
                                      {getTeamLabel(entrant.team)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {match.selectedWinnerId && (
                                <p className="safe-text mt-2 rounded-md bg-green-400/10 px-3 py-2 text-sm font-semibold text-green-200">
                                  Winner: {getTeamLabel(match.options.find((entrant) => entrant.team.id === match.selectedWinnerId)?.team)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
