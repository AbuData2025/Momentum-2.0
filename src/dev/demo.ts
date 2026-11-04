import { collection, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { addDaysISO, weekStartISO } from "../lib/history";
import { createPlan, deletePlan, type PlanSettings } from "../lib/plans";
import type { RunType, WorkoutInput } from "../lib/workout";
import { createWorkout } from "../lib/workouts";
import { generatePlan } from "../training/generate";

const PACE: Record<RunType, number> = { easy: 372, steady: 345, tempo: 322, intervals: 330, long: 368 }; // sec/km

/** A coherent, deterministic demo: a half-marathon plan that started 5 weeks ago, with most past sessions run. */
export function buildDemo(today: string) {
  const start = addDaysISO(weekStartISO(today), -35);
  const settings: PlanSettings = { goal: "half", experience: "intermediate", objective: "finish", targetTimeSec: null, raceDate: null, runDays: 4, longRunDay: "sun" };
  const r = generatePlan({ goal: "half", experience: "intermediate", objective: "finish", weeklyKm: 25, runDays: 4, longRunDay: "sun", today: start });
  if (!r.ok) throw new Error(r.reason);
  const workouts: WorkoutInput[] = [];
  r.plan.sessions.forEach((s, i) => {
    if (s.date >= today || i % 9 === 5) return; // future stays planned; a few past sessions are left missed
    const durationSec = Math.round(s.targetKm * PACE[s.type] * (1 - s.week * 0.004) * (1 + Math.sin(i * 1.7) * 0.02));
    workouts.push({ name: s.title, date: s.date, startTime: i % 2 ? "06:10" : "17:45", runType: s.type, distanceKm: s.targetKm, durationSec, notes: "" });
  });
  return { settings, plan: r.plan, workouts };
}

export async function loadDemo(uid: string, today: string, replacingPlanId?: string) {
  const d = buildDemo(today);
  await createPlan(uid, d.settings, d.plan, replacingPlanId);
  await Promise.all(d.workouts.map((w) => createWorkout(uid, w)));
}

/** Removes every workout and plan for this user. Demo use only. */
export async function clearAll(uid: string, planIds: string[]) {
  const runs = await getDocs(collection(db, "users", uid, "workouts"));
  await Promise.all(runs.docs.map((d) => deleteDoc(d.ref)));
  for (const id of planIds) await deletePlan(uid, id);
}
