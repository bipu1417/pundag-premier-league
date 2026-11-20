import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, Banknote, Clock3, Crown, Gauge, Radio, Shield,
  Sparkles, TrendingUp, Trophy, UserCheck, Users,
} from "lucide-react";
import { onSnapshot } from "../firebase";
import { useTournament } from "../context/TournamentContext";
import { getDataCollection } from "../utils/tournamentData";
import { buildAuctionDashboard, toMillis } from "../utils/auctionDashboard";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(Number(value || 0));

const activityTime = (value) => {
  const timestamp = toMillis(value);
  return timestamp ? new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(timestamp)) : "Recently";
};

const initials = (name = "Player") => name.split(/\s+/).filter(Boolean)
  .slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function Avatar({ player, large = false }) {
  const dimensions = large ? "h-14 w-14 text-base" : "h-11 w-11 text-sm";
  return player?.photo ? (
    <img src={player.photo} alt={player.name || "Player"} loading="lazy" decoding="async"
      className={`${dimensions} flex-none rounded-2xl border border-white/15 object-cover shadow-lg`} />
  ) : (
    <div className={`${dimensions} flex flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 font-black text-slate-950 shadow-lg`}>
      {initials(player?.name)}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, glow }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 p-5 shadow-xl backdrop-blur-xl">
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${glow}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="safe-text mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{value}</p>
          <p className="safe-text mt-1 text-xs text-slate-400">{detail}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-yellow-300"><Icon size={20} /></div>
      </div>
    </article>
  );
}

const Empty = ({ children }) => (
  <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.025] p-6 text-center text-sm text-slate-400">{children}</p>
);

export default function LiveAuctionDashboard() {
  const { activeTournament } = useTournament();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [unsoldEvents, setUnsoldEvents] = useState([]);
  const [ready, setReady] = useState({ players: false, teams: false, assignments: false, unsold: false });
  const [error, setError] = useState("");
  const tournamentKey = activeTournament
    ? `${activeTournament.isLegacy ? "legacy" : activeTournament.year}:${activeTournament.id}` : "";

  useEffect(() => {
    setPlayers([]); setTeams([]); setAssignments([]); setUnsoldEvents([]);
    setReady({ players: false, teams: false, assignments: false, unsold: false });
    setError("");
    if (!activeTournament) return undefined;

    const listen = (name, setter, key) => onSnapshot(
      getDataCollection(activeTournament, name),
      (snapshot) => {
        setter(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setReady((current) => ({ ...current, [key]: true }));
      },
      (listenerError) => {
        console.error(`Unable to load live auction ${name}:`, listenerError);
        setError(listenerError.code === "permission-denied"
          ? "You do not have permission to view this tournament's auction."
          : listenerError.message);
        setReady((current) => ({ ...current, [key]: true }));
      }
    );
    const subscriptions = [
      listen("players", setPlayers, "players"),
      listen("teamdetails", setTeams, "teams"),
      listen("AuctionDetails", setAssignments, "assignments"),
      listen("UnsoldDetails", setUnsoldEvents, "unsold"),
    ];
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
    // Selection key deliberately owns the listener lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentKey]);

  const data = useMemo(
    () => buildAuctionDashboard(players, teams, assignments, unsoldEvents),
    [players, teams, assignments, unsoldEvents]
  );
  const loading = !Object.values(ready).every(Boolean);
  const completion = data.totalPlayers ? Math.round((data.soldCount / data.totalPlayers) * 100) : 0;

  if (!activeTournament) return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-slate-950/70 p-8 text-center text-white">
      <Trophy className="mx-auto text-yellow-300" size={36} />
      <h1 className="mt-4 text-2xl font-black">Select a tournament</h1>
      <p className="mt-2 text-slate-400">Choose a tournament to open its live auction dashboard.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8 text-white sm:space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/70 p-5 shadow-2xl sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-yellow-400/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-red-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]" /> Live auction
            </div>
            <h1 className="safe-text mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{activeTournament.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span>{activeTournament.year}</span><span className="text-slate-600">•</span>
              <span>{activeTournament.sport || "Tournament"}</span><span className="text-slate-600">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-300"><Radio size={14} /> Realtime updates</span>
            </p>
          </div>
          <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur lg:max-w-sm">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Auction completion</span><span className="font-bold text-yellow-300">{completion}%</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-emerald-400 transition-all duration-700" style={{ width: `${completion}%` }} /></div>
            <p className="mt-2 text-xs text-slate-400">{data.soldCount} of {data.totalPlayers} registered players sold</p>
          </div>
        </div>
      </section>

      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</p>}
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />)}</div> : <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={UserCheck} label="Players sold" value={data.soldCount} detail={`${data.unsoldCount} still available`} glow="bg-emerald-400/20" />
          <Metric icon={Banknote} label="Total spent" value={money(data.totalSpend)} detail={`Average ${money(data.averagePrice)}`} glow="bg-yellow-400/20" />
          <Metric icon={Crown} label="Highest bid" value={money(data.highestPrice)} detail={data.topPricedPlayers[0]?.player?.name || "Waiting for first sale"} glow="bg-fuchsia-400/20" />
          <Metric icon={Shield} label="Teams active" value={data.teamStats.length} detail={data.leadingTeam ? `${data.leadingTeam.teamName} leads spending` : "No team activity yet"} glow="bg-cyan-400/20" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-xl backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-300">Live activity</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Latest sold players</h2></div><Activity className="text-emerald-300" /></div>
            <div className="mt-5 space-y-3">{data.recentSold.length ? data.recentSold.map((item, index) => (
              <article key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-yellow-300/30 hover:bg-white/[0.06] sm:p-4">
                <span className="hidden w-6 text-center text-xs font-black text-slate-600 sm:block">{String(index + 1).padStart(2,"0")}</span><Avatar player={item.player} />
                <div className="min-w-0 flex-1"><p className="safe-text font-bold">{item.player.name}</p><p className="safe-text text-xs text-slate-400">{item.player.playerType || "Player"} • {item.teamName}</p></div>
                <div className="text-right"><p className="font-black text-emerald-300">{money(item.price)}</p><p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500"><Clock3 size={11}/>{activityTime(item.createdAt)}</p></div>
              </article>
            )) : <Empty>No players have been sold yet.</Empty>}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-xl backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Auction results</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Latest unsold / passed</h2></div><Users className="text-cyan-300" /></div>
            <div className="mt-5 space-y-3">{data.recentUnsold.length ? data.recentUnsold.map((event) => (
              <article key={event.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-4"><Avatar player={event.player}/>
                <div className="min-w-0 flex-1"><p className="safe-text font-bold">{event.player.name || "Unnamed player"}</p><p className="safe-text text-xs text-slate-400">{event.player.playerType || "Player"} • {activityTime(event.createdAt)}</p></div>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-bold uppercase text-cyan-200">Unsold</span>
              </article>
            )) : <Empty>No players have been marked unsold yet.</Empty>}</div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 shadow-xl backdrop-blur-xl">
            <div className="border-b border-white/10 p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-yellow-400 p-2 text-slate-950"><Trophy size={20}/></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-300">Leaderboard</p><h2 className="mt-1 text-xl font-black">Top 5 most priced</h2></div></div></div>
            <div className="divide-y divide-white/10">{data.topPricedPlayers.length ? data.topPricedPlayers.map((item, index) => (
              <article key={item.id} className="flex items-center gap-3 p-4 sm:px-6"><span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg text-sm font-black ${index === 0 ? "bg-yellow-400 text-slate-950" : "bg-white/5 text-slate-400"}`}>{index+1}</span><Avatar player={item.player}/><div className="min-w-0 flex-1"><p className="safe-text font-bold">{item.player.name}</p><p className="safe-text text-xs text-slate-400">{item.teamName}</p></div><p className="font-black text-yellow-300">{money(item.price)}</p></article>
            )) : <div className="p-5"><Empty>Top prices will appear after the first sale.</Empty></div>}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5 shadow-xl backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300">Team economy</p><h2 className="mt-1 text-xl font-black">Purse utilization</h2></div><Gauge className="text-fuchsia-300" /></div>
            <div className="mt-5 space-y-4">{data.teamStats.length ? data.teamStats.map((team) => (
              <article key={team.id || team.teamName}><div className="flex items-end justify-between gap-3 text-sm"><div className="min-w-0"><p className="safe-text font-bold">{team.teamName}</p><p className="text-xs text-slate-400">{team.playersBought} player{team.playersBought === 1 ? "" : "s"} • {money(team.remaining)} remaining</p></div><p className="font-bold text-fuchsia-200">{money(team.spent)}</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-yellow-400 transition-all duration-700" style={{width:`${team.utilization}%`}} /></div></article>
            )) : <Empty>Add teams to see purse utilization.</Empty>}</div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Banknote className="text-yellow-300"/><div><p className="text-xs text-slate-400">Average winning bid</p><p className="font-black">{money(data.averagePrice)}</p></div></div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4"><TrendingUp className="text-emerald-300"/><div><p className="text-xs text-slate-400">Conversion rate</p><p className="font-black">{completion}% sold</p></div></div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Sparkles className="text-cyan-300"/><div><p className="text-xs text-slate-400">Live inventory</p><p className="font-black">{data.unsoldCount} available</p></div></div>
        </section>
      </>}
    </div>
  );
}
