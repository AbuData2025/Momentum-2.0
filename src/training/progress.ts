import { dayNum } from "./generate";

type S = { date: string; status: "scheduled" | "skipped" };
export type SessionStatus = "completed" | "missed" | "skipped" | "planned";

/** Status is derived, never stored: a run on the session's date completes it, and a past
 *  date with no run is missed. Nothing changes just because the app wasn't opened. */
export const sessionStatus = (s: S, runDates: string[], today: string): SessionStatus =>
  s.status === "skipped" ? "skipped" : runDates.includes(s.date) ? "completed" : s.date < today ? "missed" : "planned";

export function planProgress(sessions: S[], runDates: string[], today: string) {
  const st = sessions.map((s) => sessionStatus(s, runDates, today));
  const n = (k: SessionStatus) => st.filter((x) => x === k).length;
  const completed = n("completed"), missed = n("missed"), due = completed + missed;
  return { completed, missed, skipped: n("skipped"), due, total: sessions.length, pct: due ? Math.round((completed / due) * 100) : 0 };
}

export const currentWeek = (startDate: string, weeks: number, today: string) =>
  Math.min(weeks, Math.max(1, Math.floor((dayNum(today) - dayNum(startDate)) / 7) + 1));
