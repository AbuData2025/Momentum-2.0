import { collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { track } from "./sync";
import type { Experience, GeneratedPlan, Goal, Objective, Phase, PlannedSessionData } from "../training/generate";

export type Plan = {
  id: string; goal: Goal; experience: Experience; objective: Objective; targetTimeSec: number | null; raceDate: string | null;
  startDate: string; weeks: number; phases: Phase[]; weeklyKm: number[]; runDays: number; longRunDay: "sat" | "sun";
  warnings: string[]; status: "active" | "archived";
};
export type Session = PlannedSessionData & { id: string; originalDate: string; status: "scheduled" | "skipped" };
export type PlanSettings = Pick<Plan, "goal" | "experience" | "objective" | "targetTimeSec" | "raceDate" | "runDays" | "longRunDay">;

const plans = (uid: string) => collection(db, "users", uid, "plans");

export function subscribeActivePlan(uid: string, onData: (d: { plan: Plan | null; sessions: Session[] }) => void, onError: (e: Error) => void) {
  let stopSessions = () => {};
  const stopPlan = onSnapshot(query(plans(uid), where("status", "==", "active")), (snap) => {
    stopSessions();
    const d = snap.docs[0];
    if (!d) return onData({ plan: null, sessions: [] });
    const plan = { id: d.id, ...d.data() } as Plan;
    stopSessions = onSnapshot(collection(d.ref, "sessions"), (s) =>
      onData({ plan, sessions: s.docs.map((x) => ({ id: x.id, ...x.data() }) as Session).sort((a, b) => a.date.localeCompare(b.date)) }), onError);
  }, onError);
  return () => { stopPlan(); stopSessions(); };
}

/** Archives the current plan (if any) and writes the new one atomically. Logged workouts are never touched. */
export async function createPlan(uid: string, settings: PlanSettings, gen: GeneratedPlan, replacingId?: string) {
  const batch = writeBatch(db);
  if (replacingId) batch.update(doc(plans(uid), replacingId), { status: "archived", archivedAt: serverTimestamp() });
  const ref = doc(plans(uid));
  batch.set(ref, { ...settings, startDate: gen.startDate, weeks: gen.weeks, phases: gen.phases, weeklyKm: gen.weeklyKm, warnings: gen.warnings, status: "active", createdAt: serverTimestamp() });
  for (const s of gen.sessions) batch.set(doc(collection(ref, "sessions")), { ...s, originalDate: s.date, status: "scheduled" });
  await track(batch.commit());
}

const sessionRef = (uid: string, planId: string, id: string) => doc(db, "users", uid, "plans", planId, "sessions", id);
export const setSkipped = (uid: string, planId: string, id: string, skipped: boolean) =>
  track(updateDoc(sessionRef(uid, planId, id), { status: skipped ? "skipped" : "scheduled" }));
export const rescheduleSession = (uid: string, planId: string, id: string, date: string) => track(updateDoc(sessionRef(uid, planId, id), { date }));

/** Deletes the plan and its sessions. Logged workouts are separate documents and are never touched.
 *  Every delete is queued up front, so none is lost if the connection drops part-way. */
export async function deletePlan(uid: string, planId: string) {
  const ref = doc(plans(uid), planId);
  const snap = await getDocs(collection(ref, "sessions"));
  const ops: Promise<void>[] = [];
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    ops.push(batch.commit());
  }
  ops.push(deleteDoc(ref));
  await track(Promise.all(ops));
}
