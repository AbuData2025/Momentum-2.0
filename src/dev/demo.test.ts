import { describe, expect, it, vi } from "vitest";
vi.mock("../lib/firebase", () => ({ db: {} }));
vi.mock("../lib/plans", () => ({ createPlan: vi.fn(), deletePlan: vi.fn() }));
vi.mock("../lib/workouts", () => ({ createWorkout: vi.fn() }));
import { workoutSchema } from "../lib/workout";
import { buildDemo } from "./demo";

const today = "2026-10-22";
describe("buildDemo", () => {
  const d = buildDemo(today);
  it("only logs runs in the past, and every one is valid", () => {
    expect(d.workouts.length).toBeGreaterThan(12);
    for (const w of d.workouts) { expect(w.date < today).toBe(true); expect(workoutSchema.safeParse(w).success).toBe(true); }
  });
  it("leaves a few past sessions missed and the future planned", () => {
    const past = d.plan.sessions.filter((s) => s.date < today);
    expect(past.length - d.workouts.length).toBeGreaterThanOrEqual(2);
    expect(d.plan.sessions.some((s) => s.date >= today)).toBe(true);
  });
  it("shows a mix of run types", () => {
    const types = new Set(d.workouts.map((w) => w.runType));
    for (const t of ["easy", "tempo", "long"]) expect(types.has(t as never)).toBe(true);
  });
  it("is deterministic", () => expect(buildDemo(today)).toEqual(d));
});
