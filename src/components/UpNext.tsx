import { Link } from "react-router";
import { usePlan } from "./PlanProvider";
import { useWorkouts } from "./WorkoutsProvider";
import { sessionStatus } from "../training/progress";
import { todayISO } from "../lib/workout";

const box = "rounded-lg border border-accent bg-card p-5";

export default function UpNext() {
  const { plan, sessions, loading } = usePlan();
  const { workouts } = useWorkouts();
  const today = todayISO();
  if (loading) return null;
  if (!plan)
    return (
      <div className={box}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Up next</p>
        <h3 className="mt-2 text-lg font-semibold">Build your training plan</h3>
        <p className="mt-1 text-xs text-muted">Pick a goal and get a plan shaped around your running and your week.</p>
        <Link to="/plan/new" className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-xs font-semibold">Get started</Link>
      </div>
    );
  const dates = workouts.map((w) => w.date);
  const next = sessions.find((s) => s.date >= today && sessionStatus(s, dates, today) === "planned");
  return (
    <div className={box}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Up next</p>
      {next ? (
        <>
          <h3 className="mt-2 text-lg font-semibold">{next.title}</h3>
          <p className="mt-1 text-[11px] text-muted">{next.date === today ? "Today" : new Date(`${next.date}T00:00`).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} · {next.effort}</p>
          <p className="mt-3 font-mono text-2xl">{next.targetKm} <span className="text-xs text-muted">km</span></p>
          <p className="mt-2 text-xs text-muted">{next.description}</p>
        </>
      ) : <p className="mt-2 text-sm">No sessions left in your plan. Nicely done.</p>}
      <Link to="/plan" className="mt-4 inline-block rounded-md border border-line px-3 py-2 text-xs">View training plan</Link>
    </div>
  );
}
