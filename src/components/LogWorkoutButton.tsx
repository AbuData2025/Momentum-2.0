import { Plus } from "lucide-react";
import { useWorkouts } from "./WorkoutsProvider";

export default function LogWorkoutButton() {
  const { openForm } = useWorkouts();
  return (
    <button onClick={() => openForm()} className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold hover:brightness-110">
      <Plus size={14} /> Log workout
    </button>
  );
}
