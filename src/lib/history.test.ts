import { describe, expect, it } from "vitest";
import { filterWorkouts, paginate, summarize, toCSV, weekCounts, weekStartISO } from "./history";
import type { Workout } from "./workouts";

const w = (id: string, date: string, runType: Workout["runType"], distanceKm: number, durationSec: number, name = "Run", notes = ""): Workout =>
  ({ id, date, runType, distanceKm, durationSec, name, notes, startTime: "" });
const list = [w("1", "2026-10-22", "steady", 10, 3480, "Steady morning run", "Legs felt good"), w("2", "2026-10-20", "tempo", 8, 2640), w("3", "2026-10-05", "long", 16, 5760)];

describe("history", () => {
  it("filters by type, text and date window", () => {
    expect(filterWorkouts(list, { query: "", type: "tempo", days: null }, "2026-10-22")).toHaveLength(1);
    expect(filterWorkouts(list, { query: "legs", type: "all", days: null }, "2026-10-22")).toHaveLength(1);
    expect(filterWorkouts(list, { query: "", type: "all", days: 14 }, "2026-10-22")).toHaveLength(2);
  });
  it("weights average pace by distance", () => {
    const s = summarize(list.slice(0, 2));
    expect(s.distanceKm).toBe(18);
    expect(s.paceSec).toBeCloseTo(6120 / 18);
  });
  it("counts this week and last week from Monday", () => {
    expect(weekStartISO("2026-10-22")).toBe("2026-10-19");
    expect(weekCounts(list, "2026-10-22")).toEqual({ thisWeek: 2, lastWeek: 0 });
  });
  it("paginates and clamps the page", () => {
    const p = paginate([1, 2, 3, 4, 5], 9, 2);
    expect(p).toMatchObject({ page: 3, pages: 3, items: [5], from: 5, to: 5 });
  });
  it("escapes CSV cells and neutralises formulas", () => {
    const csv = toCSV([w("1", "2026-10-22", "easy", 5, 1500, 'He said "go"', "=SUM(A1)")]);
    expect(csv).toContain('"He said ""go"""');
    expect(csv).toContain("'=SUM(A1)");
  });
});
