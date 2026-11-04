import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { usePlan } from "../components/PlanProvider";
import { useWorkouts } from "../components/WorkoutsProvider";
import { todayISO } from "../lib/workout";
import { clearAll, loadDemo } from "./demo";

/** Shown only when VITE_ENABLE_DEMO=true. Fills the app with sample data for demos and screenshots. */
export default function DemoBanner() {
  const { user } = useAuth();
  const { workouts } = useWorkouts();
  const { plan } = usePlan();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [failed, setFailed] = useState(false);
  if (import.meta.env.VITE_ENABLE_DEMO !== "true" || !user) return null;
  const empty = workouts.length === 0 && !plan;
  const go = async (f: () => Promise<void>) => { setBusy(true); setFailed(false); try { await f(); setConfirm(false); } catch { setFailed(true); } setBusy(false); };
  const btn = "rounded-md border border-line px-3 py-1.5 text-[11px] disabled:opacity-50";
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line bg-card p-3 text-xs">
      <span className="text-muted">Demo mode</span>
      {empty ? <button disabled={busy} onClick={() => go(() => loadDemo(user.uid, todayISO()))} className={`${btn} bg-accent`}>{busy ? "Loading…" : "Load sample data"}</button>
        : confirm ? (<><span>Delete all runs and plans?</span><button disabled={busy} onClick={() => go(() => clearAll(user.uid, plan ? [plan.id] : []))} className={`${btn} text-accent`}>Yes, clear everything</button><button onClick={() => setConfirm(false)} className={btn}>Cancel</button></>)
        : <button onClick={() => setConfirm(true)} className={btn}>Clear all data</button>}
      {failed && <span role="alert" className="text-accent">That didn't work. Try again.</span>}
    </div>
  );
}
