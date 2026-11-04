import { useState } from "react";
import { ChevronLeft, ChevronRight, Circle, CircleAlert, CircleCheck, Pencil, Plus } from "lucide-react";
import LogWorkoutButton from "../components/LogWorkoutButton";
import { usePlan } from "../components/PlanProvider";
import { useWorkouts } from "../components/WorkoutsProvider";
import { PageHeader } from "../components/ui";
import { getDayState, monthGrid, shiftMonth, weekRange, type DayState } from "../lib/calendar";
import { formatDuration, formatPace, paceSecPerKm } from "../lib/format";
import { summarize } from "../lib/history";
import { RUN_TYPE_LABEL, todayISO } from "../lib/workout";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TEXT: Record<DayState, string> = { completed: "text-done", planned: "text-muted", missed: "text-missed", rest: "text-muted" };
const long = (iso: string) => new Date(`${iso}T00:00`).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

function Legend() {
  const items: [string, ReactNodeLike][] = [
    ["Completed", <CircleCheck size={11} className="text-done" />], ["Planned", <Circle size={11} />],
    ["Missed", <CircleAlert size={11} className="text-missed" />], ["Rest", <span className="px-1">–</span>],
  ];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-muted">
      {items.map(([label, icon]) => <span key={label} className="flex items-center gap-1.5">{icon}{label}</span>)}
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-accent" />Today / selected</span>
    </div>
  );
}
type ReactNodeLike = React.ReactNode;

export default function Calendar() {
  const { workouts, openForm } = useWorkouts();
  const { sessions } = usePlan();
  const planned = sessions.filter((s) => s.status !== "skipped").map((s) => ({ id: s.id, date: s.date, runType: s.type, targetKm: s.targetKm }));
  const today = todayISO();
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  const [selected, setSelected] = useState(today);

  const grid = monthGrid(cursor.year, cursor.month);
  const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const go = (n: number) => setCursor(shiftMonth(cursor.year, cursor.month, n));
  const goToday = () => { setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }); setSelected(today); };

  const onDay = (date: string) => workouts.filter((w) => w.date === date);
  const picked = onDay(selected);
  const plannedOn = planned.find((p) => p.date === selected);
  const week = weekRange(today);
  const weekRuns = workouts.filter((w) => w.date >= week.start && w.date <= week.end);
  const weekSum = summarize(weekRuns);
  const canLog = selected <= today;

  return (
    <>
      <PageHeader eyebrow="Make room for your next run" title="Training calendar" subtitle="Your completed runs, upcoming sessions and recovery days, in balance." action={<LogWorkoutButton />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-lg border border-line bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">{title}</h2>
            <div className="flex items-center gap-2">
              <button aria-label="Previous month" onClick={() => go(-1)} className="rounded-md border border-line p-1.5"><ChevronLeft size={14} /></button>
              <button onClick={goToday} className="rounded-md border border-line px-3 py-1.5 text-xs">Today</button>
              <button aria-label="Next month" onClick={() => go(1)} className="rounded-md border border-line p-1.5"><ChevronRight size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((d) => <p key={d} className="pb-1 text-center text-[10px] uppercase tracking-wider text-muted">{d}</p>)}
            {grid.map(({ date, inMonth }) => {
              const runs = onDay(date);
              const state = getDayState(date, workouts, planned, today);
              const km = runs.reduce((a, w) => a + w.distanceKm, 0);
              const isToday = date === today, isSel = date === selected;
              return (
                <button key={date} aria-pressed={isSel} aria-label={`${long(date)}, ${state}${km ? `, ${km.toFixed(1)} km` : ""}`}
                  onClick={() => { setSelected(date); if (!inMonth) setCursor({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) - 1 }); }}
                  className={`h-[68px] overflow-hidden rounded-md border p-1 text-left text-[10px] sm:h-[74px] sm:p-2 ${isSel ? "border-accent bg-accent-soft" : isToday ? "border-accent/60 bg-raised" : "border-line bg-raised/40"} ${inMonth ? "" : "opacity-40"}`}>
                  <span className="flex justify-between text-[11px]"><span>{Number(date.slice(8))}</span>{isToday && <span className="hidden text-[9px] font-semibold text-accent sm:inline">TODAY</span>}</span>
                  {state === "completed" ? (
                    <span className={`mt-1 block ${TEXT.completed}`}>
                      <span className="flex items-center gap-1"><CircleCheck size={10} />{runs.length > 1 ? `${runs.length} runs` : RUN_TYPE_LABEL[runs[0].runType]}</span>
                      <span className="font-mono">{km.toFixed(1)} km</span>
                    </span>
                  ) : (() => { const p = planned.find((x) => x.date === date); return p ? <span className={`mt-1 block ${TEXT[state]}`}><span className="flex items-center gap-1">{state === "missed" ? <CircleAlert size={10} /> : <Circle size={10} />}{RUN_TYPE_LABEL[p.runType]}</span><span className="font-mono">{p.targetKm} km</span></span> : <span className="mt-1 block text-muted">Rest day</span>; })()}
                </button>
              );
            })}
          </div>
          <Legend />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-card p-5">
            <h3 className="text-sm font-semibold">{long(selected)}</h3>
            <span className="mt-2 inline-block rounded bg-accent-soft px-2 py-0.5 text-[10px] text-accent">{selected === today ? "Today · Selected" : "Selected"}</span>
            {picked.length === 0 ? (
              <p className="mt-4 text-xs text-muted">{plannedOn ? `Planned: ${RUN_TYPE_LABEL[plannedOn.runType]}, ${plannedOn.targetKm} km. ${selected < today ? "No run was logged for this day." : "Log it when you've run."}` : selected > today ? "Nothing planned." : "Rest day. Nothing logged for this date."}</p>
            ) : picked.map((w) => (
              <div key={w.id} className="mt-4 border-t border-line pt-4">
                <p className="text-sm font-semibold">{w.name}</p>
                <span className="mt-2 inline-block rounded bg-done/15 px-2 py-0.5 text-[10px] text-done">Completed</span>
                <div className="mt-3 flex justify-between font-mono text-lg"><span>{w.distanceKm.toFixed(1)}<small className="block font-sans text-[10px] text-muted">kilometres</small></span><span>{formatDuration(w.durationSec)}<small className="block font-sans text-[10px] text-muted">moving time</small></span></div>
                <p className="mt-2 text-[11px] text-muted">{w.startTime && `${w.startTime} · `}{formatPace(paceSecPerKm(w.distanceKm, w.durationSec))} /km · {RUN_TYPE_LABEL[w.runType]}</p>
                {w.notes && <p className="mt-2 text-[11px] italic text-muted">“{w.notes}”</p>}
                <button onClick={() => openForm(w)} className="mt-3 flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs"><Pencil size={12} /> Edit workout</button>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-line bg-card p-5 text-xs">
            <div className="flex justify-between"><h3 className="text-sm font-semibold">This week</h3><span className="text-[11px] text-muted">{week.start.slice(8)}–{week.end.slice(8)} {new Date(`${week.end}T00:00`).toLocaleDateString("en-ZA", { month: "short" })}</span></div>
            <p className="mt-3 flex justify-between"><span className="text-muted">Distance</span><span className="font-mono">{weekSum.distanceKm.toFixed(1)} km</span></p>
            <p className="mt-2 flex justify-between"><span className="text-muted">Runs logged</span><span className="font-mono">{weekSum.count}</span></p>
          </div>

          <div className="rounded-lg border border-line bg-card p-5 text-xs">
            <p className="font-semibold">Ran on a different day?</p>
            <p className="mt-1 text-[11px] text-muted">Select any past date, then add a backdated workout.</p>
            <button disabled={!canLog} onClick={() => openForm(undefined, selected)} className="mt-3 flex items-center gap-2 rounded-md border border-line px-3 py-2 disabled:opacity-40">
              <Plus size={12} /> Log workout for {Number(selected.slice(8))} {new Date(`${selected}T00:00`).toLocaleDateString("en-ZA", { month: "short" })}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
