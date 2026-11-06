// Tracks connectivity and un-acknowledged writes. Deliberately free of Firebase imports so it is easy to test.
export type SyncState = { online: boolean; pending: number; failed: boolean; updateReady: boolean };

let state: SyncState = { online: typeof navigator === "undefined" ? true : navigator.onLine, pending: 0, failed: false, updateReady: false };
let applyUpdate: (() => void) | null = null;
const subs = new Set<() => void>();
const set = (patch: Partial<SyncState>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };

if (typeof window !== "undefined") {
  window.addEventListener("online", () => set({ online: true }));
  window.addEventListener("offline", () => set({ online: false }));
}

export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const getSnapshot = () => state;
export const dismissFailure = () => set({ failed: false });
export const setUpdateReady = (fn: () => void) => { applyUpdate = fn; set({ updateReady: true }); };
export const runUpdate = () => applyUpdate?.();

/** Counts a write as pending until the server acknowledges it (Firestore queues it locally meanwhile). */
export function track<T>(p: Promise<T>): Promise<T> {
  set({ pending: state.pending + 1 });
  const done = () => set({ pending: Math.max(0, state.pending - 1) });
  p.then(done, done);
  return p;
}

/**
 * Firestore only resolves a write once the server confirms it, which never happens while offline.
 * The local copy is saved straight away, so stop waiting: immediately when offline, after 4s on a slow
 * connection. A quick failure (such as a permission error) is still thrown to the caller; a failure
 * that arrives after we stopped waiting is flagged for the banner.
 */
export async function settle(p: Promise<unknown>): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queued = new Promise<"queued">((resolve) => { timer = setTimeout(() => resolve("queued"), navigator.onLine ? 4000 : 0); });
  try {
    const r = await Promise.race([p, queued]);
    if ((r as unknown) === "queued") { p.catch(() => set({ failed: true })); return undefined; }
    return r;
  } finally { clearTimeout(timer); }
}
