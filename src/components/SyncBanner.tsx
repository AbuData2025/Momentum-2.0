import { useSyncExternalStore } from "react";
import { dismissFailure, getSnapshot, runUpdate, subscribe } from "../lib/sync";

export default function SyncBanner() {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  const row = "flex items-center justify-between gap-3 border-b border-line bg-raised px-4 py-2 text-[11px] md:px-8";
  return (
    <>
      {s.failed && <div role="alert" className={`${row} text-accent`}><span>A change made while offline couldn't be saved. Please check your latest entries and try again.</span><button onClick={dismissFailure} className="rounded-md border border-line px-2 py-1">Dismiss</button></div>}
      {!s.online && <div role="status" className={row}><span>You're offline. Runs and changes are saved on this device and will sync when you're back online.</span></div>}
      {s.online && s.pending > 0 && <div role="status" className={row}><span>Syncing {s.pending} {s.pending === 1 ? "change" : "changes"}…</span></div>}
      {s.updateReady && <div role="status" className={row}><span>A new version of Momentum is ready.</span><button onClick={() => runUpdate()} className="rounded-md border border-line px-2 py-1">Reload</button></div>}
    </>
  );
}
