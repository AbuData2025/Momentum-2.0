import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { usePlan } from "../components/PlanProvider";
import { EmptyState, PageHeader, StatCard } from "../components/ui";
import { useWorkouts } from "../components/WorkoutsProvider";
import { formatDuration, formatPace } from "../lib/format";
import { addDaysISO } from "../lib/history";
import { deletePlan, rescheduleSession, setSkipped, type Session } from "../lib/plans";
import { todayISO } from "../lib/workout";
import { GOALS, goalPaceSecPerKm } from "../training/generate";
import { currentWeek, planProgress, sessionStatus, type SessionStatus } from "../training/progress";

const BADGE: Record<SessionStatus, string> = { completed: "bg-done/15 text-done", missed: "bg-missed/15 text-missed", planned: "bg-accent-soft text-accent", skipped: "bg-raised text-muted" };
const PHASE: Record<string, string> = { base: "Base", build: "Build", peak: "Peak", taper: "Taper" };
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(`${iso}T00:00`).toLocaleDateString("en-ZA", o);
const btn = "rounded-md border border-line px-3 py-1.5 text-[11px]";

export default function Plan() {
  const { user } = useAuth();
  const { plan, sessions, loading } = usePlan();
  const { workouts, openForm } = useWorkouts();
  const today = todayISO();
  const [sel, setSel] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [moving, setMoving] = useState<{ id: string; date: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  if (loading) return <p className="text-xs text-muted">Loading your plan…</p>;
  if (!plan)
    return (<>
      <PageHeader eyebrow="Personalised training" title="Your training plan" subtitle="A plan built around your goal, your running and your week." />
      <EmptyState title="No training plan yet" body="Choose 5K, 10K, half marathon or marathon and answer a few questions." />
      <Link to="/plan/new" className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-xs font-semibold">Build your plan</Link>
    </>);

  const dates = workouts.map((w) => w.date);
  const week = sel ?? currentWeek(plan.startDate, plan.weeks, today);
  const ws = addDaysISO(plan.startDate, (week - 1) * 7), we = addDaysISO(ws, 6);
  const list = sessions.filter((s) => s.week === week);
  const planned = list.filter((s) => s.status !== "skipped").reduce((a, s) => a + s.targetKm, 0);
  const kmIn = (a: string, b: string) => workouts.filter((w) => w.date >= a && w.date <= b).reduce((t, w) => t + w.distanceKm, 0);
  const prog = planProgress(sessions, dates, today);
  const maxKm = Math.max(...plan.weeklyKm);
  const run = async (f: () => Promise<unknown>) => { try { await f(); setFailed(false); } catch { setFailed(true); } };

  const row = (s: Session) => {
    const st = sessionStatus(s, dates, today);
    return (
      <li key={s.id} className="border-t border-line px-4 py-3 first:border-t-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-20 text-[11px] text-muted">{fmt(s.date, { weekday: "short", day: "numeric", month: "short" })}</span>
          <button onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id} className="min-w-40 flex-1 text-left">
            <span className="text-xs font-semibold">{s.title}</span> <span className="font-mono text-[11px] text-muted">{s.targetKm} km</span>
            <span className="block text-[11px] text-muted">{s.effort}</span>
          </button>
          <span className={`rounded px-2 py-0.5 text-[10px] capitalize ${BADGE[st]}`}>{st}</span>
        </div>
        {open === s.id && <p className="mt-2 text-xs text-muted">{s.description}</p>}
        {st !== "completed" && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {st !== "skipped" && s.date <= today && <button onClick={() => openForm(undefined, s.date)} className={btn}>Log this run</button>}
            {st !== "skipped" && <button onClick={() => setMoving({ id: s.id, date: s.date > today ? s.date : today })} className={btn}>Move</button>}
            <button onClick={() => run(() => setSkipped(user!.uid, plan.id, s.id, st !== "skipped"))} className={btn}>{st === "skipped" ? "Restore" : "Skip"}</button>
          </div>
        )}
        {moving?.id === s.id && (
          <div className="mt-2 flex items-center gap-2">
            <input type="date" aria-label="New date" min={today} value={moving.date} onChange={(e) => setMoving({ id: s.id, date: e.target.value })} className="rounded-md border border-line bg-page px-2 py-1 text-xs [color-scheme:dark]" />
            <button disabled={!moving.date || moving.date < today} onClick={() => run(async () => { await rescheduleSession(user!.uid, plan.id, s.id, moving.date); setMoving(null); })} className={`${btn} bg-accent`}>Save</button>
            <button onClick={() => setMoving(null)} className={btn}>Cancel</button>
          </div>
        )}
      </li>
    );
  };

  return (<>
    <PageHeader eyebrow={`${PHASE[plan.phases[week - 1]]} phase`} title={`Your ${GOALS[plan.goal].label.toLowerCase()} plan`}
      subtitle={`${plan.raceDate ? `Race day ${fmt(plan.raceDate, { day: "numeric", month: "long", year: "numeric" })}` : "Race date not set"}${plan.targetTimeSec ? ` · Goal ${formatDuration(plan.targetTimeSec)} (${formatPace(goalPaceSecPerKm(plan.goal, plan.targetTimeSec))} /km)` : ""}`}
      action={<div className="flex gap-2"><Link to="/plan/new" className={btn}>New plan</Link><button onClick={() => setConfirmDel(true)} className={`${btn} text-accent`}>Delete plan</button></div>} />
    {plan.warnings.map((w) => <p key={w} className="mb-3 rounded-md border border-line bg-card p-3 text-xs text-missed">{w}</p>)}
    {confirmDel && (
      <div role="alertdialog" aria-label="Delete training plan" className="mb-4 rounded-lg border border-accent bg-card p-4 text-xs">
        <p className="font-semibold">Delete this training plan?</p>
        <p className="mt-1 text-muted">All its planned sessions are removed. Your logged runs are kept. This can't be undone.</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setConfirmDel(false)} className={btn}>Keep plan</button>
          <button onClick={() => run(async () => { await deletePlan(user!.uid, plan.id); setConfirmDel(false); })} className={`${btn} border-accent text-accent`}>Delete plan</button>
        </div>
      </div>
    )}
    {failed && <p role="alert" className="mb-3 text-xs text-accent">That didn't save. Check your connection and try again.</p>}
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Week" value={`${week} / ${plan.weeks}`} note={PHASE[plan.phases[week - 1]]} />
      <StatCard label="This week" value={kmIn(ws, we).toFixed(1)} unit={`/ ${planned} km`} note="Logged / planned" />
      <StatCard label="Plan completion" value={String(prog.pct)} unit="%" note={`${prog.completed} of ${prog.due} sessions due`} />
      <StatCard label="Missed · skipped" value={`${prog.missed} · ${prog.skipped}`} note="Never stacked onto other days" />
    </div>

    <div className="mt-6 rounded-lg border border-line bg-card">
      <div className="flex items-center justify-between p-4">
        <div><h2 className="text-sm font-semibold">Week {week}</h2><p className="text-[11px] text-muted">{fmt(ws, { day: "numeric", month: "short" })} – {fmt(we, { day: "numeric", month: "short" })}</p></div>
        <div className="flex items-center gap-2">
          <button aria-label="Previous week" disabled={week <= 1} onClick={() => setSel(week - 1)} className="rounded-md border border-line p-1.5 disabled:opacity-40"><ChevronLeft size={14} /></button>
          <button onClick={() => setSel(null)} className={btn}>This week</button>
          <button aria-label="Next week" disabled={week >= plan.weeks} onClick={() => setSel(week + 1)} className="rounded-md border border-line p-1.5 disabled:opacity-40"><ChevronRight size={14} /></button>
        </div>
      </div>
      <ul className="border-t border-line">{list.length ? list.map(row) : <li className="p-4 text-xs text-muted">Nothing scheduled this week.</li>}</ul>
    </div>

    <div className="mt-6 rounded-lg border border-line bg-card p-5">
      <h2 className="text-sm font-semibold">Your {plan.weeks}-week journey</h2>
      <div className="mt-4 flex h-28 items-end gap-1.5">
        {plan.weeklyKm.map((km, i) => {
          const n = i + 1, done = Math.min(1, kmIn(addDaysISO(plan.startDate, i * 7), addDaysISO(plan.startDate, i * 7 + 6)) / (km || 1));
          return (
            <button key={n} onClick={() => setSel(n)} aria-label={`Week ${n}, ${km} km planned`} className="flex h-full flex-1 flex-col justify-end">
              <span className={`relative block w-full overflow-hidden rounded-sm ${n === week ? "ring-1 ring-accent" : ""} bg-raised`} style={{ height: `${(km / maxKm) * 100}%` }}>
                <span className="absolute bottom-0 block w-full bg-accent" style={{ height: `${done * 100}%` }} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5 text-[9px] text-muted">{plan.weeklyKm.map((_, i) => <span key={i} className="flex-1 text-center">{i + 1}</span>)}</div>
      <p className="mt-3 text-[11px] text-muted">{(["base", "build", "peak", "taper"] as const).map((p) => `${PHASE[p]} ${plan.phases.filter((x) => x === p).length}w`).join(" · ")}</p>
    </div>
    <p className="mt-4 text-[11px] text-muted">General training guidance, not medical advice.</p>
  </>);
}
