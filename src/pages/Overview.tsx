import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import DemoBanner from "../dev/DemoBanner";
import { BarChart } from "../components/charts";
import LogWorkoutButton from "../components/LogWorkoutButton";
import { usePlan } from "../components/PlanProvider";
import UpNext from "../components/UpNext";
import { EmptyState, PageHeader, StatCard } from "../components/ui";
import { useWorkouts } from "../components/WorkoutsProvider";
import { hoursMinutes, rangeLabel, shortDate, weeklyStats, weeksComplete, weekStarts } from "../lib/analytics";
import { formatDuration, formatPace, paceSecPerKm } from "../lib/format";
import { addDaysISO } from "../lib/history";
import { RUN_TYPE_LABEL, todayISO } from "../lib/workout";
import { GOALS } from "../training/generate";
import { currentWeek, planProgress } from "../training/progress";

const PHASE: Record<string, string> = { base: "Base", build: "Build", peak: "Peak", taper: "Taper" };

export default function Overview() {
  const { workouts, loading, openForm } = useWorkouts();
  const { plan, sessions } = usePlan();
  const today = todayISO();
  const starts = weekStarts(today, 8);
  const weeks = weeklyStats(workouts, starts);
  const cur = weeks[7];
  const end = addDaysISO(starts[7], 6);
  const dates = workouts.map((w) => w.date);
  const thisWeek = sessions.filter((s) => s.date >= starts[7] && s.date <= end);
  const plannedKm = thisWeek.filter((s) => s.status !== "skipped").reduce((a, s) => a + s.targetKm, 0);
  const prog = planProgress(thisWeek, dates, today);
  const week = plan ? currentWeek(plan.startDate, plan.weeks, today) : 0;
  const done = plan ? weeksComplete(plan.startDate, plan.weeks, today) : 0;
  const block = weeks.reduce((a, x) => a + x.km, 0);

  return (
    <>
      <PageHeader eyebrow="Your training, in focus" title="Every run moves you forward." action={<LogWorkoutButton />}
        subtitle={`${plan ? `Week ${week} · ` : ""}${rangeLabel(starts[7], end)}${plan ? ` · ${PHASE[plan.phases[week - 1]]} phase` : ""}`} />
      <DemoBanner />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Weekly distance" value={cur.km.toFixed(1)} unit="km" note={plan && plannedKm ? `${Math.round(cur.km)} of ${Math.round(plannedKm)} km planned · ${Math.round((cur.km / plannedKm) * 100)}%` : "No plan active"} />
        <StatCard label="Time on your feet" value={hoursMinutes(cur.seconds)} unit="hrs" note={`${cur.runs} ${cur.runs === 1 ? "run" : "runs"} logged this week`} />
        <StatCard label="Average pace" value={cur.paceSec ? formatPace(cur.paceSec) : "–:––"} unit="/km" note="Moving time ÷ distance" />
        <StatCard label="Consistency" value={plan ? `${prog.completed} / ${prog.due}` : "–"} unit={plan ? "due runs" : undefined}
          note={!plan ? "Build a plan to track this" : prog.due === 0 ? "No sessions due yet" : prog.missed === 0 ? "All sessions due so far completed" : `${prog.missed} missed so far`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-card p-5">
            <div className="flex justify-between"><h2 className="text-sm font-semibold">Distance, week by week</h2><span className="text-[11px] text-muted">Last 8 weeks · km</span></div>
            <p className="mt-3 font-mono text-2xl">{Math.round(block)} <span className="text-xs text-muted">km in this block</span></p>
            <div className="mt-4"><BarChart values={weeks.map((x) => x.km)} labels={starts.map(shortDate)} summary={`Weekly distance for the last 8 weeks, ${Math.round(block)} km in total`} /></div>
          </div>
          <div className="rounded-lg border border-line bg-card p-5">
            <div className="flex justify-between"><h2 className="text-sm font-semibold">Recent workouts</h2><Link to="/history" className="text-[11px] text-muted hover:text-ink">View all →</Link></div>
            {loading ? <p className="mt-4 text-xs text-muted">Loading…</p> : workouts.length === 0 ? <div className="mt-4"><EmptyState title="No workouts yet" body="Log your first run and it will show up here." /></div> : (
              <ul className="mt-2">
                {workouts.slice(0, 3).map((x) => (
                  <li key={x.id} className="border-t border-line first:border-t-0">
                    <button onClick={() => openForm(x)} className="flex w-full items-center gap-4 py-3 text-left">
                      <span className="w-10 rounded-md bg-raised py-1 text-center"><span className="block font-mono text-sm">{Number(x.date.slice(8))}</span><span className="block text-[9px] uppercase text-muted">{new Date(`${x.date}T00:00`).toLocaleDateString("en-ZA", { month: "short" })}</span></span>
                      <span className="flex-1"><span className="block text-xs font-semibold">{x.name}</span><span className="text-[11px] text-muted">{RUN_TYPE_LABEL[x.runType]} · {new Date(`${x.date}T00:00`).toLocaleDateString("en-ZA", { weekday: "long" })}{x.startTime && `, ${x.startTime}`}</span></span>
                      <span className="text-right"><span className="block font-mono text-xs">{x.distanceKm.toFixed(1)} km</span><span className="font-mono text-[11px] text-muted">{formatDuration(x.durationSec)} · {formatPace(paceSecPerKm(x.distanceKm, x.durationSec))} /km</span></span>
                      <ChevronRight size={14} className="text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <UpNext />
          {plan && (
            <div className="rounded-lg border border-line bg-card p-5">
              <h3 className="text-sm font-semibold">Your {GOALS[plan.goal].label.toLowerCase()} chapter</h3>
              <p className="mt-3 flex items-center gap-2 font-mono text-lg">{GOALS[plan.goal].km.toFixed(1).replace(".0", "")} km <span className="rounded bg-accent-soft px-2 py-0.5 font-sans text-[10px] text-accent">{PHASE[plan.phases[week - 1]]} phase</span></p>
              <p className="mt-2 text-xs text-muted">{plan.raceDate ? `Race day ${new Date(`${plan.raceDate}T00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}` : "Race date not set"}</p>
              <div className="mt-4 h-1.5 rounded-full bg-raised"><div className="h-full rounded-full bg-accent" style={{ width: `${(done / plan.weeks) * 100}%` }} /></div>
              <p className="mt-2 flex justify-between text-[11px] text-muted"><span>{done} of {plan.weeks} weeks complete</span><span>{Math.round((done / plan.weeks) * 100)}%</span></p>
              <Link to="/plan" className="mt-3 inline-block text-[11px] text-accent">See plan progress →</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
