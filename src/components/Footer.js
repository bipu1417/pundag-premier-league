import { Radio, ShieldCheck } from "lucide-react";
import leagueCraftLogo from "../assets/leaguecraft-logo.svg";

export default function Footer() {
  return (
    <footer className="app-footer mt-10 text-gray-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-7 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="brand-mark flex h-10 w-10 items-center justify-center p-1.5">
            <img src={leagueCraftLogo} alt="" className="h-full w-full rounded-md" />
          </span>
          <div>
            <p className="font-bold text-gray-100">LeagueCraft</p>
            <p className="text-xs text-slate-500">Every tournament. One command center.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <a href="/cricket-tournament-management" className="hover:text-yellow-200">Cricket tournaments</a>
          <a href="/football-tournament-organiser" className="hover:text-yellow-200">Football tournaments</a>
          <a href="/player-auction-software" className="hover:text-yellow-200">Player auctions</a>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-emerald-200">
            <span className="status-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <Radio size={13} /> Auction ready
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <ShieldCheck size={14} /> © {new Date().getFullYear()} LeagueCraft
          </span>
        </div>
      </div>
    </footer>
  );
}
