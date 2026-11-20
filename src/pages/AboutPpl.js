import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Pencil, Plus, Save, ShieldCheck, Trash2, Trophy, X } from "lucide-react";
import { doc, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useTournament } from "../context/TournamentContext";
import { LEGACY_PPL_2025_ID } from "../utils/tournamentData";
import { canEditTournamentAbout, newAboutId, readAbout, safeAboutImage, validateAbout } from "../utils/tournamentAbout";
import { legacyTournamentAbout } from "../data/legacyTournamentAbout";
import { ConfirmModal } from "../components/ui/AppModal";

const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";

function Field({ label, multiline = false, ...props }) {
  const Input = multiline ? "textarea" : "input";
  return <label className="block space-y-2 text-sm text-gray-300">
    <span>{label}</span>
    <Input {...props} rows={multiline ? 4 : undefined} className="input-surface w-full rounded-xl px-3 py-2.5 text-white" />
  </label>;
}

export function AboutPpl() {
  const auth = useAuth();
  const { activeTournament, loading } = useTournament();
  const canEdit = canEditTournamentAbout(activeTournament, auth);
  if (loading || auth.loading) return <p role="status" className="p-8 text-center text-gray-300">Loading tournament…</p>;
  if (!activeTournament) return <section className="surface mx-auto max-w-2xl space-y-4 rounded-2xl p-8 text-center">
    <BookOpen className="mx-auto text-yellow-300" size={32} />
    <h1 className="text-2xl font-bold">Select a tournament to view its About page</h1>
    <p className="text-gray-400">Each tournament has its own history, sponsors and organising committee.</p>
    <Link to="/" className={button}>Back to landing page</Link>
  </section>;
  return <TournamentAboutPage key={`${activeTournament.id}:${auth.user?.uid}:${canEdit}`} tournament={activeTournament} user={auth.user} canEdit={canEdit} />;
}

export function TournamentAboutPage({ tournament, user, canEdit }) {
  const [page, setPage] = useState(() => tournament.id === LEGACY_PPL_2025_ID ? legacyTournamentAbout : { intro: "", sections: [] });
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState(null);
  const [draftRevision, setDraftRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = onSnapshot(doc(db, "tournamentAbout", tournament.id), snapshot => {
      if (!active) return;
      setPage(snapshot.exists() ? readAbout(snapshot.data()) : tournament.id === LEGACY_PPL_2025_ID ? legacyTournamentAbout : { intro: "", sections: [] });
      setRevision(snapshot.exists() ? snapshot.data().revision || 0 : 0);
      setLoading(false);
      setLoadError("");
    }, () => {
      if (!active) return;
      setLoading(false);
      setLoadError("Unable to load this tournament’s About page. Please try again. If this feature was just installed, its database rules must be published first.");
    });
    return () => { active = false; unsubscribe(); };
  }, [tournament.id]);

  const startEditing = () => {
    setDraft(readAbout(page));
    setDraftRevision(revision);
    setError("");
    setNotice("");
  };
  const updateSection = (id, update) => setDraft(current => ({ ...current, sections: current.sections.map(section => section.id === id ? { ...section, ...update } : section) }));
  const updateEntry = (section, id, update) => updateSection(section.id, { entries: section.entries.map(entry => entry.id === id ? { ...entry, ...update } : entry) });
  const save = async () => {
    if (!canEdit || saving) return;
    setError("");
    setSaving(true);
    try {
      const content = validateAbout(draft);
      const ref = doc(db, "tournamentAbout", tournament.id);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        const currentRevision = snapshot.exists() ? snapshot.data().revision || 0 : 0;
        if (currentRevision !== draftRevision) throw new Error("Someone updated this page while you were editing. Cancel editing to load the latest version, then apply your changes again.");
        transaction.set(ref, { ...content, revision: currentRevision + 1, updatedAt: serverTimestamp(), updatedBy: user.uid });
      });
      setDraft(null);
      setNotice("About page updated.");
    } catch (failure) {
      setError(failure.code === "permission-denied" ? "You do not have permission to update this tournament. Check your organiser access and the deployed database rules." : failure.message || "Unable to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const displayed = draft || page;

  return <div className="mx-auto max-w-6xl space-y-6">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-yellow-200">← Back to landing page</Link>
    <section className="relative overflow-hidden rounded-2xl border border-yellow-300/20 bg-gradient-to-br from-yellow-400/10 via-slate-900 to-slate-950 p-6 sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-yellow-200"><Trophy size={14} /> {tournament.sport || "Tournament"} · {tournament.year}</span>
          <h1 className="safe-text text-3xl font-bold text-white sm:text-5xl">About {tournament.name}</h1>
          {!draft && !loading && !loadError && page.intro && <p className="whitespace-pre-line text-base leading-8 text-gray-300">{page.intro}</p>}
        </div>
        {canEdit && !draft && <button type="button" disabled={loading || !!loadError} onClick={startEditing} className={button}><Pencil size={16} /> Edit About page</button>}
      </div>
      {canEdit && <p className="mt-6 inline-flex items-center gap-2 text-xs text-yellow-100/70"><ShieldCheck size={14} /> You can manage this tournament’s About content.</p>}
    </section>

    {loading && <p role="status" className="surface rounded-2xl p-8 text-center">Loading About content…</p>}
    {loadError && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{loadError}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-500/10 p-4 text-emerald-200">{notice}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-200">{error}</p>}
    {draft && draftRevision !== revision && <p role="alert" className="rounded-xl bg-amber-400/10 p-4 text-amber-200">This page has changed since you started editing. Cancel editing to see the latest version.</p>}

    {!loading && !loadError && <>
      {draft && <div className="surface space-y-4 rounded-2xl p-5 sm:p-6">
        <h2 className="text-xl font-bold text-white">Page introduction</h2>
        <p className="text-sm leading-6 text-gray-400">Add sections for history, your mission, sponsors or the committee. Cards can include people, season results, images and details. Save to publish your changes.</p>
        <fieldset disabled={saving}><Field label="Introduction" multiline maxLength={2000} value={draft.intro} onChange={event => setDraft({ ...draft, intro: event.target.value })} /></fieldset>
      </div>}
      {!draft && !displayed.sections.length && !displayed.intro && <div className="surface rounded-2xl p-10 text-center text-gray-400"><BookOpen className="mx-auto mb-4 text-gray-500" size={28} /><h2 className="text-xl font-semibold text-white">The story starts here</h2><p className="mt-2">{canEdit ? "Add an introduction, tournament history, sponsors and committee members using Edit About page." : "The organiser has not added About content for this tournament yet."}</p></div>}
      {displayed.sections.map(section => <section key={section.id} className="surface space-y-5 rounded-2xl p-5 sm:p-7">
        {draft ? <fieldset disabled={saving} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-yellow-200">Edit section</h2><button type="button" className={`${button} text-red-200`} onClick={() => setConfirm({ title: "Remove section?", message: "This section and its cards will be removed when you save the page.", action: () => setDraft(current => ({ ...current, sections: current.sections.filter(item => item.id !== section.id) })) })}><Trash2 size={15} /> Remove section</button></div>
          <Field label="Section title" required maxLength={120} value={section.title} onChange={event => updateSection(section.id, { title: event.target.value })} />
          <Field label="Section text" multiline maxLength={6000} value={section.body} onChange={event => updateSection(section.id, { body: event.target.value })} />
        </fieldset> : <div className="space-y-3"><h2 className="safe-text text-2xl font-bold text-yellow-200">{section.title}</h2>{section.body && <p className="whitespace-pre-line leading-7 text-gray-300">{section.body}</p>}</div>}

        <div className={`grid gap-4 ${draft ? "lg:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {section.entries.map(entry => draft ? <fieldset key={entry.id} disabled={saving} className="space-y-4 rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <Field label="Card title / name / season" required maxLength={120} value={entry.title} onChange={event => updateEntry(section, entry.id, { title: event.target.value })} />
            <Field label="Subtitle / role / champion" maxLength={200} value={entry.subtitle} onChange={event => updateEntry(section, entry.id, { subtitle: event.target.value })} />
            <Field label="Details" multiline maxLength={2000} value={entry.description} onChange={event => updateEntry(section, entry.id, { description: event.target.value })} />
            <Field label="Image URL (HTTPS, optional)" value={entry.imageUrl} onChange={event => updateEntry(section, entry.id, { imageUrl: event.target.value })} />
            <button type="button" className={`${button} text-red-200`} onClick={() => setConfirm({ title: "Remove card?", message: "This card will be removed when you save the page.", action: () => updateSection(section.id, { entries: section.entries.filter(item => item.id !== entry.id) }) })}><Trash2 size={15} /> Remove card</button>
          </fieldset> : <article key={entry.id} className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/50">
            {safeAboutImage(entry.imageUrl) && <img src={safeAboutImage(entry.imageUrl)} alt={entry.title} loading="lazy" referrerPolicy="no-referrer" className="h-48 w-full object-contain bg-white/5" />}
            <div className="space-y-2 p-5"><h3 className="safe-text text-lg font-bold text-white">{entry.title}</h3>{entry.subtitle && <p className="safe-text text-sm font-medium text-yellow-200">{entry.subtitle}</p>}{entry.description && <p className="safe-text whitespace-pre-line text-sm leading-6 text-gray-400">{entry.description}</p>}</div>
          </article>)}
        </div>
        {draft && <button type="button" disabled={saving || section.entries.length >= 30} className={button} onClick={() => updateSection(section.id, { entries: [...section.entries, { id: newAboutId(), title: "", subtitle: "", description: "", imageUrl: "" }] })}><Plus size={16} /> Add card</button>}
      </section>)}
      {draft && <div className="sticky bottom-4 z-20 flex flex-wrap gap-3 rounded-2xl border border-yellow-300/20 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
        <button type="button" disabled={saving || draft.sections.length >= 20} className={button} onClick={() => setDraft(current => ({ ...current, sections: [...current.sections, { id: newAboutId(), title: "", body: "", entries: [] }] }))}><Plus size={16} /> Add section</button>
        <button type="button" disabled={saving || draftRevision !== revision} onClick={save} className={`${button} bg-yellow-400 text-gray-950 hover:bg-yellow-300`}><Save size={16} /> {saving ? "Saving…" : "Save changes"}</button>
        <button type="button" disabled={saving} onClick={() => setConfirm({ title: "Discard changes?", message: "Your unsaved edits will be discarded.", action: () => { setDraft(null); setError(""); } })} className={button}><X size={16} /> Cancel editing</button>
      </div>}
    </>}
    <ConfirmModal open={!!confirm} title={confirm?.title} message={confirm?.message} confirmText="Confirm" onCancel={() => setConfirm(null)} onConfirm={() => { confirm?.action(); setConfirm(null); }} />
  </div>;
}
