import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import DurationInput from "../components/DurationInput";
import { usePlan } from "../components/PlanProvider";
import { PageHeader } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { formatDuration, formatPace } from "../lib/format";
import { createPlan } from "../lib/plans";
import { parseDuration, todayISO } from "../lib/workout";
import { GOALS, generatePlan, goalPaceSecPerKm, type Experience, type Goal, type Objective } from "../training/generate";

const GOAL_SUB: Record<Goal, string> = { "5k": "Speed and consistency", "10k": "Aerobic strength and threshold", half: "Endurance for 21.1 km", marathon: "42.2 km, built patiently" };
const LEVELS: [Experience, string, string][] = [["beginner", "Beginner", "New to running, or returning"], ["intermediate", "Intermediate", "Run regularly, some races"], ["advanced", "Advanced", "Structured training, chasing times"]];
const OBJECTIVES: [Objective, string][] = [["finish", "Complete the distance"], ["time", "Hit a target time"], ["fitness", "Improve my fitness"]];
const STEPS = ["Goal", "About you", "Your week", "Review"];

function Choice({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-lg border p-4 text-left ${on ? "border-accent bg-accent-soft" : "border-line bg-card"}`}>
      <p className="text-sm font-semibold">{title}</p>{sub && <p className="mt-1 text-[11px] text-muted">{sub}</p>}
    </button>
  );
}
const Label = ({ children }: { children: ReactNode }) => <p className="mb-2 mt-6 text-xs font-semibold first:mt-0">{children}</p>;
const field = "rounded-md border border-line bg-page px-3 py-2 text-xs [color-scheme:dark]";

export default function PlanSetup() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { plan: active } = usePlan();
  const today = todayISO();
  const [step, setStep] = useState(0);
  const [s, setS] = useState({ goal: "" as Goal | "", experience: "" as Experience | "", objective: "finish" as Objective, target: "", weeklyKm: "", runDays: 4, longRunDay: "sun" as "sat" | "sun", raceDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }));

  const targetSec = s.objective === "time" ? parseDuration(s.target) : null;
  const km = Number(s.weeklyKm);
  const valid = [!!s.goal, !!s.experience && s.weeklyKm !== "" && km >= 0 && km <= 200 && (s.objective !== "time" || (targetSec ?? 0) > 0), true, true][step];

  const result = useMemo(() => step < 3 || !s.goal || !s.experience ? null : generatePlan({
    goal: s.goal, experience: s.experience, objective: s.objective, targetTimeSec: targetSec ?? undefined,
    raceDate: s.raceDate || undefined, weeklyKm: km || 0, runDays: s.runDays, longRunDay: s.longRunDay, today,
  }), [step, s, targetSec, km, today]);

  async function save() {
    if (!result?.ok || !user || !s.goal || !s.experience) return;
    setSaving(true); setError(false);
    try {
      await createPlan(user.uid, { goal: s.goal, experience: s.experience, objective: s.objective, targetTimeSec: targetSec, raceDate: s.raceDate || null, runDays: s.runDays, longRunDay: s.longRunDay }, result.plan, active?.id);
      nav("/plan");
    } catch { setError(true); setSaving(false); }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Personalised training" title="Build your training plan" subtitle="A few quick questions so the plan fits you and your week." />
      <ol className="mb-6 flex gap-2 text-[11px]" aria-label="Progress">
        {STEPS.map((t, i) => <li key={t} className={`flex-1 border-t-2 pt-2 ${i <= step ? "border-accent text-ink" : "border-line text-muted"}`}>{i + 1}. {t}</li>)}
      </ol>
      <div className="rounded-lg border border-line bg-card p-6">
        {step === 0 && (<><Label>What are you training for?</Label>
          <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(GOALS) as Goal[]).map((g) => <Choice key={g} on={s.goal === g} onClick={() => set("goal", g)} title={GOALS[g].label} sub={GOAL_SUB[g]} />)}</div></>)}

        {step === 1 && (<>
          <Label>Running experience</Label>
          <div className="grid gap-3 sm:grid-cols-3">{LEVELS.map(([v, t, sub]) => <Choice key={v} on={s.experience === v} onClick={() => set("experience", v)} title={t} sub={sub} />)}</div>
          <Label>How far do you run in a typical week? (km)</Label>
          <input inputMode="decimal" aria-label="Weekly distance in kilometres" className={`${field} w-32`} value={s.weeklyKm} onChange={(e) => set("weeklyKm", e.target.value)} placeholder="e.g. 20" />
          <p className="mt-1 text-[11px] text-muted">New to running? Enter 0 and we'll start gently.</p>
          <Label>What's your objective?</Label>
          <div className="grid gap-3 sm:grid-cols-3">{OBJECTIVES.map(([v, t]) => <Choice key={v} on={s.objective === v} onClick={() => set("objective", v)} title={t} />)}</div>
          {s.objective === "time" && (<><Label>Target finish time</Label><DurationInput value={s.target} onChange={(v) => set("target", v)} /></>)}
        </>)}

        {step === 2 && (<>
          <Label>How many days a week can you run?</Label>
          <div className="flex gap-2">{[2, 3, 4, 5, 6].map((n) => <button key={n} type="button" aria-pressed={s.runDays === n} onClick={() => set("runDays", n)} className={`h-10 w-10 rounded-md border text-sm ${s.runDays === n ? "border-accent bg-accent-soft" : "border-line"}`}>{n}</button>)}</div>
          <Label>Long-run day</Label>
          <div className="grid max-w-xs grid-cols-2 gap-3"><Choice on={s.longRunDay === "sat"} onClick={() => set("longRunDay", "sat")} title="Saturday" /><Choice on={s.longRunDay === "sun"} onClick={() => set("longRunDay", "sun")} title="Sunday" /></div>
          <Label>Race date (optional)</Label>
          <input type="date" aria-label="Race date" min={today} className={field} value={s.raceDate} onChange={(e) => set("raceDate", e.target.value)} />
          <p className="mt-1 text-[11px] text-muted">{s.raceDate ? "We'll build the plan back from race day." : "Race date not set. We'll use a standard-length plan."}</p>
        </>)}

        {step === 3 && result && (result.ok ? (() => { const p = result.plan; const first = p.sessions.filter((x) => x.week === 1); return (<>
          <h2 className="text-lg font-semibold">{GOALS[s.goal as Goal].label} · {p.weeks} weeks</h2>
          <p className="mt-1 text-xs text-muted">Starts {new Date(`${p.startDate}T00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long" })} · {s.raceDate ? `Race day ${new Date(`${s.raceDate}T00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}` : "Race date not set"} · Peaks at {Math.max(...p.weeklyKm)} km a week</p>
          {targetSec ? <p className="mt-1 text-xs text-muted">Goal {formatDuration(targetSec)} is about {formatPace(goalPaceSecPerKm(s.goal as Goal, targetSec))} /km</p> : null}
          {p.warnings.map((w) => <p key={w} role="alert" className="mt-3 rounded-md border border-line bg-raised p-3 text-xs text-missed">{w}</p>)}
          <p className="mb-2 mt-5 text-xs font-semibold">Week 1</p>
          <ul className="space-y-2 text-xs">{first.map((x) => <li key={x.date} className="flex justify-between rounded-md bg-raised px-3 py-2"><span>{new Date(`${x.date}T00:00`).toLocaleDateString("en-ZA", { weekday: "short" })} · {x.title}</span><span className="font-mono">{x.targetKm} km</span></li>)}</ul>
          {active && <p className="mt-4 text-[11px] text-muted">This replaces your current plan. Your logged runs are kept.</p>}
          <p className="mt-4 text-[11px] text-muted">General training guidance, not medical advice. Stop and see a professional if something hurts.</p>
          {error && <p role="alert" className="mt-3 text-xs text-accent">We couldn't save your plan. Check your connection and try again.</p>}
        </>); })() : <p role="alert" className="text-sm">{result.reason}</p>)}
      </div>
      <div className="mt-4 flex justify-between">
        <button onClick={() => (step === 0 ? nav("/plan") : setStep(step - 1))} className="rounded-md border border-line px-4 py-2 text-xs">{step === 0 ? "Cancel" : "Back"}</button>
        {step < 3 ? <button disabled={!valid} onClick={() => setStep(step + 1)} className="rounded-md bg-accent px-5 py-2 text-xs font-semibold disabled:opacity-50">Next</button>
          : <button disabled={!result?.ok || saving} onClick={save} className="rounded-md bg-accent px-5 py-2 text-xs font-semibold disabled:opacity-50">{saving ? "Saving…" : active ? "Replace my plan" : "Create my plan"}</button>}
      </div>
    </div>
  );
}
