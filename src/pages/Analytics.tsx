import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { BarChart, LineChart, SegmentedBar, TYPE_COLOR } from "../components/charts";
import { usePlan } from "../components/PlanProvider";
import { EmptyState, PageHeader, StatCard } from "../components/ui";
import { useWorkouts } from "../components/WorkoutsProvider";
import { comparisonWindow, consistencyByWeek, inRange, percentChange, rangeLabel, shortDate, trainingMix, weeklyCSV, weeklyStats, weekStarts } from "../lib/analytics";
import { formatDuration, formatPace } from "../lib/format";
import { addDaysISO, summarize } from "../lib/history";
import { RUN_TYPE_LABEL, todayISO } from "../lib/workout";
import { planProgress } from "../training/progress";

const RANGES = [4, 8, 12];

export default function Analytics() {
  const { workouts } = useWorkouts();
  const { plan, sessions } = usePlan();
  const [n, setN] = useState(4);
  const today = todayISO();

  const d = useMemo(() => {
    const starts = weekStarts(today, n);
    const from = starts[0], to = addDaysISO(starts[n - 1], 6);
    const list = inRange(workouts, from, to);
    const sum = summarize(list);
    const prevWin = comparisonWindow(from, today, n);
    const prev = summarize(inRange(workouts, prevWin.from, prevWin.to));
    const dates = workouts.map((w) => w.date);
    const inPlan = sessions.filter((s) => s.date >= from && s.date <= to);
    return { starts, from, to, list, sum, change: percentChange(sum.distanceKm, prev.distanceKm), weeks: weeklyStats(workouts, starts), mix: trainingMix(list),
      prog: planProgress(inPlan, dates, today), consist: consistencyByWeek(sessions, dates, starts, today), upcoming: inPlan.filter((s) => s.status === "scheduled" && s.date >= today && !dates.includes(s.date)).length };
  }, [workouts, sessions, n, today]);

  function exportReport() {
    const url = URL.createObjectURL(new Blob([weeklyCSV(d.weeks)], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `momentum-analytics-${n}-weeks.csv` }).click();
    URL.revokeObjectURL(url);
  }

  const labels = d.starts.map(shortDate);
  const card = "rounded-lg border border-line bg-card p-5";
  return (
    <>
      <PageHeader eyebrow="Understand your training" title="Training analytics" subtitle="A clear view of your volume, pace and consistency. Built from your logged runs."
        action={<button onClick={exportReport} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs"><Download size={13} /> Export report</button>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md border border-line bg-card p-1" role="group" aria-label="Time range">
          {RANGES.map((r) => <button key={r} aria-pressed={n === r} onClick={() => setN(r)} className={`rounded px-3 py-1.5 text-[11px] ${n === r ? "bg-raised font-semibold" : "text-muted"}`}>{r} weeks</button>)}
        </div>
        <p className="text-[11px] text-muted">{rangeLabel(d.from, d.to)} · Current week in progress</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total distance" value={d.sum.distanceKm.toFixed(1)} unit="km" note={d.change === null ? "No earlier runs to compare" : `${d.change >= 0 ? "↑" : "↓"} ${Math.abs(d.change).toFixed(1)}% vs previous ${n} weeks`} />
        <StatCard label="Moving time" value={formatDuration(d.sum.seconds)} note={`${d.sum.count} completed runs`} />
        <StatCard label="Average pace" value={d.sum.paceSec ? formatPace(d.sum.paceSec) : "–:––"} unit="/km" note="Total moving time ÷ distance" />
        <StatCard label="Plan completion" value={plan && d.prog.due ? String(d.prog.pct) : "–"} unit={plan && d.prog.due ? "%" : undefined} note={!plan ? "Build a plan to track this" : `${d.prog.completed} of ${d.prog.due} sessions due`} />
      </div>

      {d.list.length === 0 ? <div className="mt-6"><EmptyState title="No runs in this period" body="Log a run, or pick a longer range, to see your charts." /></div> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <div className="flex justify-between"><h2 className="text-sm font-semibold">Weekly distance</h2><span className="text-[11px] text-muted">km</span></div>
            <p className="mb-4 text-[11px] text-muted">Completed distance, week starting</p>
            <BarChart values={d.weeks.map((w) => w.km)} labels={labels} summary={`Weekly distance over ${n} weeks`} />
          </div>
          <div className={card}>
            <div className="flex justify-between"><h2 className="text-sm font-semibold">Average pace</h2><span className="text-[11px] text-muted">min/km · Lower is faster</span></div>
            <p className="mb-4 text-[11px] text-muted">Weekly averages across all run types</p>
            <LineChart points={d.weeks.map((w) => (w.paceSec ? w.paceSec : null))} labels={labels} format={formatPace} summary={`Average pace per week over ${n} weeks`} />
          </div>
          <div className={card}>
            <div className="mb-4 flex justify-between"><h2 className="text-sm font-semibold">Training mix</h2><span className="text-[11px] text-muted">By logged distance</span></div>
            <SegmentedBar parts={d.mix} />
            <ul className="mt-4 space-y-2 text-xs">
              {d.mix.map((m) => (
                <li key={m.type} className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm" style={{ background: TYPE_COLOR[m.type] }} /><span className="flex-1">{RUN_TYPE_LABEL[m.type]}</span><span className="font-mono">{Math.round(m.km)} km</span><span className="w-10 text-right font-mono text-muted">{Math.round(m.pct)}%</span></li>
              ))}
            </ul>
          </div>
          <div className={card}>
            <div className="mb-4 flex justify-between"><h2 className="text-sm font-semibold">Showing up, week after week</h2><span className="text-[11px] text-muted">Sessions due</span></div>
            {!plan ? <p className="text-xs text-muted">Build a training plan to see how consistently you complete your sessions.</p> : (
              <>
                <ul className="space-y-3">
                  {d.consist.map((c) => (
                    <li key={c.start} className="flex items-center gap-3 text-[11px]">
                      <span className="w-12 text-muted">{shortDate(c.start)}</span>
                      <span className="h-1.5 flex-1 rounded-full bg-raised"><span className="block h-full rounded-full bg-done" style={{ width: `${c.due ? (c.completed / c.due) * 100 : 0}%` }} /></span>
                      <span className="w-10 text-right font-mono">{c.due ? `${c.completed} / ${c.due}` : "–"}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] text-muted">{d.prog.completed} completed · {d.prog.missed} missed · {d.upcoming} upcoming. Future sessions are excluded from completion.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
