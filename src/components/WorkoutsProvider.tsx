import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { subscribeWorkouts, type Workout } from "../lib/workouts";
import WorkoutForm from "./WorkoutForm";

type Ctx = { workouts: Workout[]; loading: boolean; error: boolean; openForm: (w?: Workout, date?: string) => void };
const WorkoutsCtx = createContext<Ctx | null>(null);

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<{ workout: Workout | null; date?: string } | undefined>(undefined); // undefined = closed, null = new

  useEffect(() => {
    if (!uid) return;
    return subscribeWorkouts(uid, (w) => { setWorkouts(w); setLoading(false); setError(false); }, () => { setError(true); setLoading(false); });
  }, [uid]);

  return (
    <WorkoutsCtx.Provider value={{ workouts, loading, error, openForm: (w, date) => setForm({ workout: w ?? null, date }) }}>
      {children}
      {uid && form !== undefined && <WorkoutForm uid={uid} workout={form.workout} initialDate={form.date} onClose={() => setForm(undefined)} />}
    </WorkoutsCtx.Provider>
  );
}

export const useWorkouts = () => {
  const c = useContext(WorkoutsCtx);
  if (!c) throw new Error("useWorkouts must be used inside WorkoutsProvider");
  return c;
};
