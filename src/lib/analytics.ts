import { dayNum } from "../training/generate";
import { sessionStatus } from "../training/progress";
import { formatDuration, formatPace } from "./format";
import { addDaysISO, summarize, weekStartISO } from "./history";
import type { RunType } from "./workout";
import type { Workout } from "./workouts";

type Sess = { date: string; status: "scheduled" | "skipped" };

/** The last n Mondays, ending with the current week. */
export const weekStarts = (today: string, n: number) => {
  const cur = weekStartISO(today);
  return Array.from({ length: n }, (_, i) => addDaysISO(cur, -(n - 1 - i) * 7));
};

export const inRange = (list: Workout[], from: string, to: string) => list.filter((w) => w.date >= from && w.date <= to);

export const weeklyStats = (list: Workout[], starts: string[]) =>
  starts.map((start) => {
    const s = summarize(inRange(list, start, addDaysISO(start, 6)));
    return { start, km: s.distanceKm, seconds: s.seconds, runs: s.count, paceSec: s.paceSec };
  });

/** The same stretch of the previous period, so a half-finished week isn't compared with a full one. */
export function comparisonWindow(from: string, today: string, weeks: number) {
  const prevFrom = addDaysISO(from, -weeks * 7);
  return { from: prevFrom, to: addDaysISO(prevFrom, dayNum(today) - dayNum(from)) };
}

export const percentChange = (current: number, previous: number) => (previous > 0 ? ((current - previous) / previous) * 100 : null);

export function trainingMix(list: Workout[]) {
  const total = list.reduce((a, w) => a + w.distanceKm, 0);
  const by = new Map<RunType, number>();
  for (const w of list) by.set(w.runType, (by.get(w.runType) ?? 0) + w.distanceKm);
  return [...by.entries()].map(([type, km]) => ({ type, km, pct: total ? (km / total) * 100 : 0 })).sort((a, b) => b.km - a.km);
}

export function consistencyByWeek(sessions: Sess[], runDates: string[], starts: string[], today: string) {
  return starts.map((start) => {
    const end = addDaysISO(start, 6);
    const st = sessions.filter((s) => s.date >= start && s.date <= end).map((s) => sessionStatus(s, runDates, today));
    const n = (k: string) => st.filter((x) => x === k).length;
    return { start, completed: n("completed"), due: n("completed") + n("missed"), upcoming: n("planned"), skipped: n("skipped") };
  });
}

export const weeksComplete = (startDate: string, weeks: number, today: string) =>
  Math.min(weeks, Math.max(0, Math.floor((dayNum(today) - dayNum(startDate)) / 7)));

export const hoursMinutes = (sec: number) => `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}`;

export const weeklyCSV = (rows: ReturnType<typeof weeklyStats>) =>
  ["Week starting,Distance (km),Runs,Moving time,Average pace (min/km)",
    ...rows.map((r) => [r.start, r.km.toFixed(1), r.runs, formatDuration(r.seconds), r.paceSec ? formatPace(r.paceSec) : ""].join(","))].join("\n");

export const shortDate = (iso: string) => new Date(`${iso}T00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
export function rangeLabel(a: string, b: string) {
  const d = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(`${iso}T00:00`).toLocaleDateString("en-ZA", o);
  return a.slice(5, 7) === b.slice(5, 7)
    ? `${Number(a.slice(8))}–${d(b, { day: "numeric", month: "long", year: "numeric" })}`
    : `${d(a, { day: "numeric", month: "long" })} – ${d(b, { day: "numeric", month: "long", year: "numeric" })}`;
}
