const getTeamLabel = (team) => team?.teamName || team?.name || "Team";

const numberToGroupName = (index) => {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + (value - 1) % 26) + name;
  }
  return name;
};

export const makeGroups = (teams, groupCount) => {
  const groups = Array.from({ length: groupCount }, (_, index) => ({
    id: numberToGroupName(index),
    name: `Group ${numberToGroupName(index)}`,
    teams: [],
  }));

  teams.forEach((team, index) => {
    groups[index % groupCount].teams.push(team);
  });

  return groups;
};

export const makeGroupFixtures = (groups) =>
  groups.flatMap((group) => {
    const fixtures = [];
    for (let i = 0; i < group.teams.length; i += 1) {
      for (let j = i + 1; j < group.teams.length; j += 1) {
        fixtures.push({
          id: JSON.stringify([group.id, ...[group.teams[i].id, group.teams[j].id].sort()]),
          group: group.name,
          home: group.teams[i],
          away: group.teams[j],
        });
      }
    }
    return fixtures;
  });

// Keep match identity separate from its playing position. Ignore removed matches
// and append new matches so saved schedules survive team changes safely.
export const applyFixtureOrder = (matches, order = []) => {
  const positions = new Map((Array.isArray(order) ? order : []).map((id, index) => [id, index]));
  return [...matches].sort((a, b) =>
    (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
};

export const moveFixture = (matches, matchId, position) => {
  const next = [...matches];
  const index = next.findIndex((match) => match.id === matchId);
  if (index < 0 || !Number.isInteger(position) || position < 0 || position >= next.length) return next;
  const [match] = next.splice(index, 1);
  next.splice(position, 0, match);
  return next;
};

const getRoundName = (matchCount) => {
  if (matchCount === 1) return "Final";
  if (matchCount === 2) return "Semi Finals";
  if (matchCount === 4) return "Quarter Finals";
  return `Round of ${matchCount * 2}`;
};

export const buildSeededQualifiers = (groups, qualifiersPerGroup, standings) =>
  groups.flatMap((group) =>
    group.teams
      .map((team, index) => ({
        team,
        groupId: group.id,
        groupName: group.name,
        rank: Number(standings[team.id] || index + 1),
      }))
      .sort((a, b) => a.rank - b.rank || getTeamLabel(a.team).localeCompare(getTeamLabel(b.team)))
      .slice(0, qualifiersPerGroup)
  );

const buildCrossGroupMatches = (qualifiers) => {
  const remaining = [...qualifiers].sort((a, b) => a.rank - b.rank);
  const matches = [];

  while (remaining.length > 1) {
    const top = remaining.shift();
    let opponentIndex = -1;

    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      if (remaining[index].groupId !== top.groupId) {
        opponentIndex = index;
        break;
      }
    }

    if (opponentIndex === -1) {
      opponentIndex = remaining.length - 1;
    }

    const bottom = remaining.splice(opponentIndex, 1)[0];
    matches.push({ home: top, away: bottom });
  }

  return matches;
};

export const buildKnockoutRounds = (qualifiers, winners = {}) => {
  if (qualifiers.length < 2) return [];
  const size = 2 ** Math.ceil(Math.log2(qualifiers.length));
  const seeded = [...qualifiers].sort((a, b) => a.rank - b.rank);
  const byeCount = size - seeded.length;
  const byes = seeded.splice(0, byeCount).map((entrant) => ({ home: entrant, away: null }));
  const initial = [...byes, ...buildCrossGroupMatches(seeded)];
  const rounds = [];
  const resolveMatch = (match) => {
    const options = [match.home, match.away].filter((entrant) => entrant?.team?.id);
    const isBye = !match.away;
    const selectedWinnerId = isBye ? match.home?.team?.id || "" :
      options.length === 2 && options.some((entrant) => entrant.team.id === winners[match.id]) ? winners[match.id] : "";
    return { ...match, options, isBye, selectedWinnerId };
  };
  const winnerOf = (match, index) => match.options.find((entrant) => entrant.team.id === match.selectedWinnerId)
    || { label: `Winner ${index + 1}` };
  let matches = initial.map((match, index) => resolveMatch({ ...match, id: `r0-m${index}` }));
  let roundIndex = 0;
  while (matches.length) {
    rounds.push({ name: getRoundName(matches.length), matches });
    if (matches.length === 1) break;
    const previous = matches;
    roundIndex += 1;
    const currentRoundIndex = roundIndex;
    matches = Array.from({ length: previous.length / 2 }, (_, index) => resolveMatch({
      id: `r${currentRoundIndex}-m${index}`,
      home: winnerOf(previous[index * 2], index * 2),
      away: winnerOf(previous[index * 2 + 1], index * 2 + 1),
    }));
  }
  return rounds;
};
