import { useEffect, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import DurationInput from "./DurationInput";
import { formatDuration, formatPace, paceSecPerKm } from "../lib/format";
import { RUN_TYPES, RUN_TYPE_LABEL, parseDuration, todayISO, workoutSchema, type RunType } from "../lib/workout";
import { createWorkout, removeWorkout, updateWorkout, type Workout } from "../lib/workouts";

const input = (bad: boolean) =>
  `w-full rounded-md border bg-page px-3 py-2 text-xs [color-scheme:dark] ${bad ? "border-accent" : "border-line"}`;

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-[11px] font-medium">
      {label}
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-[11px] text-accent">{error}</p> : hint && <p className="mt-1 text-[11px] font-normal text-muted">{hint}</p>}
    </label>
  );
}

export default function WorkoutForm({ uid, workout, initialDate, onClose }: { uid: string; workout: Workout | null; initialDate?: string; onClose: () => void }) {
  const [f, setF] = useState({
    name: workout?.name ?? "", date: workout?.date ?? initialDate ?? todayISO(), startTime: workout?.startTime ?? "",
    runType: (workout?.runType ?? "easy") as RunType, distance: workout ? String(workout.distanceKm) : "",
    duration: workout ? formatDuration(workout.durationSec) : "", notes: workout?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const secs = parseDuration(f.duration);
  const km = Number(f.distance);
  const pace = secs && km > 0 ? formatPace(paceSecPerKm(km, secs)) : "–:––";

  async function save() {
    const parsed = workoutSchema.safeParse({
      name: f.name, date: f.date, startTime: f.startTime, runType: f.runType,
      distanceKm: km || 0, durationSec: secs ?? 0, notes: f.notes,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      if (secs === null) next.durationSec = "Enter your moving time. Minutes and seconds must be under 60.";
      setErrors(next);
      return;
    }
    setErrors({}); setSaveError(false); setSaving(true);
    try {
      await (workout ? updateWorkout(uid, workout.id, parsed.data) : createWorkout(uid, parsed.data));
      onClose();
    } catch { setSaveError(true); } finally { setSaving(false); }
  }

  async function remove() {
    if (!workout) return;
    setSaving(true);
    try { await removeWorkout(uid, workout.id); onClose(); } catch { setSaveError(true); setConfirmDelete(false); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={workout ? "Edit workout" : "Log workout"} className="w-full max-w-xl rounded-lg border border-line bg-card p-6">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent">{workout ? "Edit logged workout" : "Log new workout"}</p>
        <h2 className="mb-1 text-xl font-semibold">{workout ? "Edit workout" : "Log workout"}</h2>
        <p className="mb-5 text-xs text-muted">Today or any past date. Backdated runs appear on that day.</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Workout name *" error={errors.name}><input autoFocus className={input(!!errors.name)} value={f.name} onChange={set("name")} placeholder="Steady morning run" /></Field></div>
          <Field label="Date *" error={errors.date}><input type="date" max={todayISO()} className={input(!!errors.date)} value={f.date} onChange={set("date")} /></Field>
          <Field label="Start time" hint="Optional"><input type="time" className={input(false)} value={f.startTime} onChange={set("startTime")} /></Field>
          <Field label="Run type *"><select className={input(false)} value={f.runType} onChange={set("runType")}>{RUN_TYPES.map((t) => <option key={t} value={t}>{RUN_TYPE_LABEL[t]}</option>)}</select></Field>
          <Field label="Distance (km) *" error={errors.distanceKm}><input inputMode="decimal" className={input(!!errors.distanceKm)} value={f.distance} onChange={set("distance")} placeholder="10.00" /></Field>
          <Field label="Moving time *" error={errors.durationSec} hint="Hours : minutes : seconds"><DurationInput value={f.duration} onChange={(v) => setF((prev) => ({ ...prev, duration: v }))} invalid={!!errors.durationSec} /></Field>
          <Field label="Average pace" hint="Calculated from distance and time"><div className={`${input(false)} font-mono`}>{pace} /km</div></Field>
          <div className="col-span-2"><Field label="Notes" error={errors.notes}><textarea rows={3} className={input(!!errors.notes)} value={f.notes} onChange={set("notes")} /></Field></div>
        </div>

        {saveError && (
          <div role="alert" className="mt-4 flex items-center justify-between rounded-md border border-line bg-raised p-3 text-xs">
            <span>We couldn't save your changes. Your entries are still here. Check your connection and try again.</span>
            <button onClick={save} className="ml-3 shrink-0 rounded-md border border-line px-3 py-1.5 font-semibold">Retry save</button>
          </div>
        )}

        {confirmDelete ? (
          <div className="mt-5 rounded-md border border-line bg-raised p-4 text-xs">
            <p className="font-semibold">Delete this workout?</p>
            <p className="mt-1 text-muted">{workout?.name} · {workout?.date} · {workout?.distanceKm} km. This can't be undone.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="rounded-md border border-line px-3 py-1.5">Keep workout</button>
              <button onClick={remove} disabled={saving} className="rounded-md border border-accent px-3 py-1.5 text-accent">Delete workout</button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-center justify-between">
            {workout ? <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-accent"><Trash2 size={13} /> Delete workout</button> : <span />}
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-md border border-line px-4 py-2 text-xs">Cancel</button>
              <button onClick={save} disabled={saving} className="rounded-md bg-accent px-4 py-2 text-xs font-semibold disabled:opacity-60">{saving ? "Saving…" : workout ? "Save changes" : "Save workout"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
