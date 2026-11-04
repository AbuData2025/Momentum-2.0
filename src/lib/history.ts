import { formatDuration, formatPace, paceSecPerKm } from "./format";
import { RUN_TYPE_LABEL, todayISO, type RunType } from "./workout";
import type { Workout } from "./workouts";

export type Filters = { query: string; type: RunType | "all"; days: number | null };

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDaysISO = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00`);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

/** Monday of the week containing the given date. */
export const weekStartISO = (iso: string) => addDaysISO(iso, -((new Date(`${iso}T00:00`).getDay() + 6) % 7));

export function filterWorkouts(list: Workout[], f: Filters, today = todayISO()) {
  const from = f.days ? addDaysISO(today, -(f.days - 1)) : null;
  const q = f.query.trim().toLowerCase();
  return list.filter(
    (w) =>
      (!from || w.date >= from) &&
      (f.type === "all" || w.runType === f.type) &&
      (!q || w.name.toLowerCase().includes(q) || w.notes.toLowerCase().includes(q)),
  );
}

export function summarize(list: Workout[]) {
  const distanceKm = list.reduce((a, w) => a + w.distanceKm, 0);
  const seconds = list.reduce((a, w) => a + w.durationSec, 0);
  // Weighted by distance: total time over total distance, not a mean of per-run paces.
  return { distanceKm, seconds, paceSec: distanceKm > 0 ? seconds / distanceKm : 0, count: list.length };
}

export function weekCounts(list: Workout[], today = todayISO()) {
  const thisWeek = weekStartISO(today);
  const lastWeek = addDaysISO(thisWeek, -7);
  return {
    thisWeek: list.filter((w) => w.date >= thisWeek).length,
    lastWeek: list.filter((w) => w.date >= lastWeek && w.date < thisWeek).length,
  };
}

export function paginate<T>(list: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * size;
  return { items: list.slice(start, start + size), page: p, pages, total: list.length, from: list.length ? start + 1 : 0, to: Math.min(start + size, list.length) };
}

// Prefix formula-like cells so spreadsheets don't execute them.
const cell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCSV(list: Workout[]) {
  const rows = list.map((w) =>
    [w.date, w.startTime, w.name, RUN_TYPE_LABEL[w.runType], w.distanceKm.toFixed(2), formatDuration(w.durationSec), formatPace(paceSecPerKm(w.distanceKm, w.durationSec)), w.notes].map(cell).join(","),
  );
  return ["Date,Start time,Name,Type,Distance (km),Moving time,Pace (min/km),Notes", ...rows].join("\n");
}
