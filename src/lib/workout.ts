import { z } from "zod";

export const RUN_TYPES = ["easy", "steady", "tempo", "long", "intervals"] as const;
export type RunType = (typeof RUN_TYPES)[number];
export const RUN_TYPE_LABEL: Record<RunType, string> = {
  easy: "Easy", steady: "Steady", tempo: "Tempo", long: "Long run", intervals: "Intervals",
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "1:51:00" or "58:00" (mm:ss) to seconds. Returns null when malformed. */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const n = parts.map(Number);
  const [h, m, s] = parts.length === 3 ? n : [0, n[0], n[1]];
  if (m > 59 || s > 59) return null;
  return h * 3600 + m * 60 + s;
}

export const workoutSchema = z.object({
  name: z.string().trim().min(1, "Give the workout a name.").max(80, "Keep the name under 80 characters."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.").refine((d) => d <= todayISO(), "Future dates can't be logged."),
  startTime: z.string().default(""),
  runType: z.enum(RUN_TYPES),
  distanceKm: z.number().gt(0, "Enter a distance greater than 0 km.").lt(120, "Distance must be under 120 km."),
  durationSec: z.number().int().gt(0, "Enter a moving time greater than 0:00:00."),
  notes: z.string().max(500, "Keep notes under 500 characters.").default(""),
});
export type WorkoutInput = z.infer<typeof workoutSchema>;
