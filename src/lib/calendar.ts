import { addDaysISO, weekStartISO } from "./history";
import type { RunType } from "./workout";
import type { Workout } from "./workouts";

export type DayState = "completed" | "planned" | "missed" | "rest";
/** Plan sessions arrive in milestone 5; the calendar already understands them. */
export type PlannedSession = { id: string; date: string; runType: RunType; targetKm: number };

export function getDayState(date: string, workouts: Workout[], sessions: PlannedSession[], today: string): DayState {
  if (workouts.some((w) => w.date === date)) return "completed";
  if (sessions.some((s) => s.date === date)) return date < today ? "missed" : "planned";
  return "rest";
}

export function monthGrid(year: number, month: number) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const days = new Date(year, month + 1, 0).getDate();
  const start = addDaysISO(`${year}-${String(month + 1).padStart(2, "0")}-01`, -offset);
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
    const date = addDaysISO(start, i);
    return { date, inMonth: Number(date.slice(5, 7)) === month + 1 };
  });
}

export const shiftMonth = (year: number, month: number, n: number) => {
  const d = new Date(year, month + n, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};

export function weekRange(today: string) {
  const start = weekStartISO(today);
  return { start, end: addDaysISO(start, 6) };
}
