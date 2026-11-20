import { getRegisteredPlayerCount } from "../utils/tournamentLimits";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, CheckCircle2, Gavel, Network, Pencil, QrCode, Radio, Save, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { useTournament } from "../context/TournamentContext";
import { getRegistrationStatus } from "../utils/tournamentData";
import { useAuth } from "../context/AuthContext";
import { ConfirmModal } from "../components/ui/AppModal";
import { canEditTournamentUntilRegistrationEnd } from "../utils/tournamentLimits";

const emptyForm = () => ({
  name: "",
  sport: "Cricket",
  year: new Date().getFullYear(),
  registrationStart: "",
  registrationEnd: "",
  maxTeams: "",
  maxPlayers: "",
  groupCount: "",
  winnerPrize: "",
  runnerUpPrize: "",
  ownerPhone: "",
  upiId: "",
  paymentQr: "",
  auctionEnabled: true,
});

const tournamentForm = (tournament) => ({
  name: tournament.name || "",
  sport: tournament.sport || "Cricket",
  year: tournament.year || new Date().getFullYear(),
  registrationStart: tournament.registrationStart || "",
  registrationEnd: tournament.registrationEnd || "",
  maxTeams: tournament.maxTeams ?? "",
  maxPlayers: tournament.maxPlayers ?? "",
  groupCount: tournament.groupCount ?? "",
  winnerPrize: tournament.winnerPrize ?? "",
  runnerUpPrize: tournament.runnerUpPrize ?? "",
  ownerPhone: tournament.ownerPhone || "",
  upiId: tournament.upiId || "",
  paymentQr: tournament.paymentQr || "",
  auctionEnabled: Boolean(tournament.auctionEnabled),
});

export default function TournamentManager() {
  const { tournaments, activeTournament, error: loadError, selectTournament, createTournament, updateTournament, deleteTournament } = useTournament();
  const { user, role, isCreator } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const isPlatformAdmin = isCreator || role === "platformAdmin";
  const ownedTournaments = tournaments.filter((tournament) =>
    !tournament.isLegacy &&
    (isPlatformAdmin || tournament.ownerId === user?.uid || tournament.ownerEmail === user?.email)
  );
  const activeOwnedTournament = ownedTournaments.find((tournament) => tournament.id === activeTournament?.id);

  const startEdit = (tournament) => {
    setEditingId(tournament.id);
    setForm(tournamentForm(tournament));
    setError("");
    setNotice("");
    selectTournament(tournament.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId("");
    setForm(emptyForm());
    setError("");
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const resizePaymentQr = (file) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = async () => {
        URL.revokeObjectURL(objectUrl);
        const maxSize = 700;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error("Could not process payment QR image."));
            return;
          }

          resolve(await fileToDataUrl(blob));
        }, "image/jpeg", 0.82);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Invalid payment QR image."));
      };

      image.src = objectUrl;
    });

  const handleChange = (event) => {
    const { name, value, type, checked, files } = event.target;

    if (name === "paymentQr") {
      const file = files?.[0];
      if (!file) return;

      resizePaymentQr(file)
        .then((paymentQr) => {
          setForm((current) => ({ ...current, paymentQr }));
          setError("");
        })
        .catch((err) => setError(err.message));
      return;
    }

    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateTournament(editingId, form);
        setNotice("Tournament updated successfully.");
        setEditingId("");
      } else {
        await createTournament(form);
        setNotice("Tournament created successfully.");
      }
      setForm(emptyForm());
    } catch (err) {
      console.error("Tournament save failed:", err);
      setError(err.code === "permission-denied"
        ? "Changes are allowed only for the tournament creator or a platform administrator, through the last registration date."
        : err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const tournament = deleteCandidate;
    setDeleteCandidate(null);
    if (!tournament) return;
    setDeletingId(tournament.id);
    setError("");
    setNotice("");
    try {
      await deleteTournament(tournament.id);
      if (editingId === tournament.id) cancelEdit();
      setNotice(`${tournament.name} was deleted.`);
    } catch (err) {
      console.error("Tournament deletion failed:", err);
      setError(err.code === "permission-denied" ? "You do not have permission to delete this tournament." : err.message);
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="min-h-screen px-0 py-4 text-white sm:px-4 sm:py-8">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <form onSubmit={handleSubmit} className="surface rounded-lg p-4 space-y-4 sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-yellow-200">Organizer console</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{editingId ? "Update Tournament" : "Create Tournament"}</h1>
            {editingId && <p className="mt-2 text-sm text-gray-400">The tournament year stays fixed so its teams, players and fixtures remain connected.</p>}
          </div>
          <input name="name" value={form.name} onChange={handleChange} required placeholder="Tournament name" className="input-surface w-full rounded-md px-3 py-2" />
          <div className="grid sm:grid-cols-2 gap-4">
            <input name="sport" value={form.sport} onChange={handleChange} required placeholder="Sport" className="input-surface w-full rounded-md px-3 py-2" />
            <input name="year" type="number" value={form.year} onChange={handleChange} required disabled={!!editingId} title={editingId ? "Tournament year cannot be changed after creation" : undefined} className="input-surface w-full rounded-md px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm text-gray-300">Number of teams
              <input name="maxTeams" type="number" min="2" step="1" value={form.maxTeams} onChange={handleChange} required className="input-surface mt-1 w-full rounded-md px-3 py-2" />
            </label>
            <label className="block text-sm text-gray-300">Maximum player registrations
              <input name="maxPlayers" type="number" min="1" step="1" value={form.maxPlayers} onChange={handleChange} required className="input-surface mt-1 w-full rounded-md px-3 py-2" />
            </label>
            <label className="block text-sm text-gray-300">Number of groups
              <input name="groupCount" type="number" min="1" max={form.maxTeams ? Math.floor(Number(form.maxTeams) / 2) : undefined} step="1" value={form.groupCount} onChange={handleChange} required className="input-surface mt-1 w-full rounded-md px-3 py-2" />
            </label>
          </div>
          <p className="text-xs text-gray-400">Each group needs at least two teams. Only approved players count toward the player limit. Pending and repeated submissions do not reserve places.</p>
          <input name="ownerPhone" value={form.ownerPhone} onChange={handleChange} required placeholder="Organizer WhatsApp / phone number" className="input-surface w-full rounded-md px-3 py-2" />
          <label className="block text-sm text-gray-300">
            Registration starts
            <input name="registrationStart" type="datetime-local" value={form.registrationStart} onChange={handleChange} required className="input-surface mt-1 w-full rounded-md px-3 py-2" />
          </label>
          <label className="block text-sm text-gray-300">
            Registration ends
            <input name="registrationEnd" type="datetime-local" value={form.registrationEnd} onChange={handleChange} required className="input-surface mt-1 w-full rounded-md px-3 py-2" />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm text-gray-300">
              Winner prize
              <input name="winnerPrize" type="number" min="0" value={form.winnerPrize} onChange={handleChange} required placeholder="Winner amount" className="input-surface mt-1 w-full rounded-md px-3 py-2" />
            </label>
            <label className="block text-sm text-gray-300">
              Runner-up prize
              <input name="runnerUpPrize" type="number" min="0" value={form.runnerUpPrize} onChange={handleChange} required placeholder="Runner-up amount" className="input-surface mt-1 w-full rounded-md px-3 py-2" />
            </label>
          </div>
          <div className="rounded-lg border border-white/10 bg-gray-950/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-100">
              <QrCode size={17} />
              Registration Payment Details
            </div>
            <label className="block text-sm text-gray-300">
              UPI ID
              <input name="upiId" value={form.upiId} onChange={handleChange} required placeholder="example@upi" className="input-surface mt-1 w-full rounded-md px-3 py-2" />
            </label>
            <label className="mt-4 block text-sm text-gray-300">
              Scan & pay QR image
              <input name="paymentQr" type="file" accept="image/*" onChange={handleChange} required={!form.paymentQr} className="input-surface mt-1 w-full rounded-md px-3 py-2 text-sm" />
            </label>
            {form.paymentQr && (
              <img src={form.paymentQr} alt="Selected UPI QR" className="mt-4 h-32 w-32 rounded-lg bg-white object-contain p-2" />
            )}
          </div>
          <label className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
            <input name="auctionEnabled" type="checkbox" checked={form.auctionEnabled} onChange={handleChange} />
            Enable auction utility
          </label>
          {error && <p role="alert" className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
          {notice && <p role="status" className="rounded-md border border-green-400/30 bg-green-500/10 p-3 text-sm text-green-100">{notice}</p>}
          <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-gray-950 shadow-lg shadow-yellow-500/20 hover:bg-yellow-300 disabled:opacity-60">
            {editingId ? <Save size={18} /> : <CalendarPlus size={18} />}
            {saving ? "Saving..." : editingId ? "Save Tournament Changes" : "Create Tournament"}
          </button>
          {editingId && <button type="button" disabled={saving} onClick={cancelEdit} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-3 font-semibold text-gray-200 hover:bg-white/10"><X size={18} /> Cancel Editing</button>}
        </form>

        <section className="surface rounded-lg p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-yellow-200">Workspace</p>
              <h2 className="text-2xl font-bold text-white">Your Tournaments</h2>
            </div>
            {activeOwnedTournament && (
              <span className="inline-flex items-center gap-2 rounded-md bg-green-400/10 px-3 py-2 text-sm text-green-200">
                <ShieldCheck size={16} />
                Active selected
              </span>
            )}
          </div>
          {loadError && (
            <p className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
              {loadError}
            </p>
          )}
          <div className="mt-4 space-y-3">
            {ownedTournaments.map((tournament) => {
              const canEdit = canEditTournamentUntilRegistrationEnd(tournament);
              return (
              <div key={tournament.id} className="rounded-md border border-white/10 bg-gray-950/70 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="safe-text font-semibold text-white">{tournament.name}</p>
                    <p className="text-sm text-gray-400">{tournament.year} • {tournament.sport}</p>
                    {(tournament.winnerPrize || tournament.runnerUpPrize) && (
                      <p className="mt-1 text-sm text-green-200">
                        Prizes: Winner Rs. {Number(tournament.winnerPrize || 0).toLocaleString("en-IN")} • Runner-up Rs. {Number(tournament.runnerUpPrize || 0).toLocaleString("en-IN")}
                      </p>
                    )}
                    {tournament.maxTeams && <p className="mt-1 text-sm text-gray-300">Teams: {tournament.teamCount || 0}/{tournament.maxTeams} • Players: {getRegisteredPlayerCount(tournament)}/{tournament.maxPlayers} • Groups: {tournament.groupCount}</p>}
                    {tournament.upiId && (
                      <p className="mt-1 text-sm text-yellow-100">UPI: {tournament.upiId}</p>
                    )}
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                    <button type="button" onClick={() => selectTournament(tournament.id)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15 sm:flex-none">
                      {activeTournament?.id === tournament.id && <CheckCircle2 size={16} className="text-green-300" />}
                      {activeTournament?.id === tournament.id ? "Selected" : "Select"}
                    </button>
                    <button type="button" disabled={!canEdit} title={canEdit ? "Edit tournament" : "The last registration date has passed"} onClick={() => startEdit(tournament)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"><Pencil size={15} /> {canEdit ? "Edit" : "Editing closed"}</button>
                    <button type="button" disabled={deletingId === tournament.id} onClick={() => setDeleteCandidate(tournament)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/20 disabled:opacity-50 sm:flex-none"><Trash2 size={15} /> {deletingId === tournament.id ? "Deleting..." : "Delete"}</button>
                  </div>
                </div>
              </div>
              );
            })}
            {ownedTournaments.length === 0 && (
              <p className="rounded-md border border-white/10 bg-gray-950/70 p-4 text-gray-300">
                You have not created any tournaments yet.
              </p>
            )}
          </div>

          {activeOwnedTournament && (
            <div className="mt-6 flex flex-wrap gap-3">
              {getRegistrationStatus(activeTournament).isOpen ? (<Link to="/registration" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-2 hover:bg-white/15 sm:w-auto"><Users size={17} /> Registration</Link>) : (<span aria-disabled="true" className="rounded-md bg-white/5 px-4 py-2 text-gray-500">Closed</span>)}
              <Link to="/create-team" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-2 hover:bg-white/15 sm:w-auto"><ShieldCheck size={17} /> Teams</Link>
              <Link to="/fixtures" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-2 hover:bg-white/15 sm:w-auto"><Network size={17} /> Fixtures & Groups</Link>
              <Link to="/auction" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow-400 px-4 py-2 font-semibold text-gray-950 hover:bg-yellow-300 sm:w-auto"><Gavel size={17} /> Auction Utility</Link>
              <Link to="/live-auction" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-400 sm:w-auto"><Radio size={17} /> Live Dashboard</Link>
            </div>
          )}
        </section>
      </div>
      <ConfirmModal
        open={!!deleteCandidate}
        title="Delete tournament?"
        message={deleteCandidate ? `${deleteCandidate.name} will be permanently deleted. This is allowed only after all teams and player registrations have been removed.` : ""}
        confirmText="Delete Tournament"
        tone="warning"
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
