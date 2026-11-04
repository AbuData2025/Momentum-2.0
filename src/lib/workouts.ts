import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { WorkoutInput } from "./workout";

export type Workout = WorkoutInput & { id: string };
const col = (uid: string) => collection(db, "users", uid, "workouts");
const ref = (uid: string, id: string) => doc(db, "users", uid, "workouts", id);

export const subscribeWorkouts = (uid: string, onData: (w: Workout[]) => void, onError: (e: Error) => void) =>
  onSnapshot(col(uid), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as WorkoutInput) }));
    list.sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));
    onData(list);
  }, onError);

export const createWorkout = (uid: string, input: WorkoutInput) =>
  addDoc(col(uid), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const updateWorkout = (uid: string, id: string, input: WorkoutInput) =>
  updateDoc(ref(uid, id), { ...input, updatedAt: serverTimestamp() });
export const removeWorkout = (uid: string, id: string) => deleteDoc(ref(uid, id));
