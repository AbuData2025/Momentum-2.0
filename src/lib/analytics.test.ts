import { describe, expect, it } from "vitest";
import { comparisonWindow, consistencyByWeek, percentChange, rangeLabel, trainingMix, weeklyStats, weekStarts, weeksComplete } from "./analytics";
import type { Workout } from "./workouts";

const w = (date: string, runType: Workout["runType"], distanceKm: number, durationSec: number) =>
  ({ id: date + runType, date, runType, distanceKm, durationSec, name: "Run", notes: "", startTime: "" }) as Workout;
const today = "2026-10-22"; // Thursday

describe("analytics", () => {
  it("lists the last n Mondays ending with this week", () => {
    expect(weekStarts(today, 4)).toEqual(["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"]);
  });
  it("totals each week and weights pace by distance", () => {
    const list = [w("2026-10-19", "easy", 6, 2160), w("2026-10-20", "tempo", 8, 2640), w("2026-10-12", "long", 16, 5760)];
    const [prev, cur] = weeklyStats(list, ["2026-10-12", "2026-10-19"]);
    expect(prev).toMatchObject({ km: 16, runs: 1 });
    expect(cur).toMatchObject({ km: 14, runs: 2, seconds: 4800 });
    expect(cur.paceSec).toBeCloseTo(4800 / 14);
  });
  it("compares against the same point in the previous period", () => {
    expect(comparisonWindow("2026-09-28", today, 4)).toEqual({ from: "2026-08-31", to: "2026-09-24" });
  });
  it("returns null change when there is nothing to compare", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(110, 100)).toBeCloseTo(10);
  });
  it("builds a training mix sorted by distance that adds to 100%", () => {
    const mix = trainingMix([w("2026-10-18", "long", 18, 6000), w("2026-10-19", "easy", 6, 2100), w("2026-10-20", "easy", 6, 2100)]);
    expect(mix.map((m) => m.type)).toEqual(["long", "easy"]);
    expect(mix.reduce((a, m) => a + m.pct, 0)).toBeCloseTo(100);
  });
  it("counts due sessions only, ignoring skipped and upcoming", () => {
    const sessions = [
      { date: "2026-10-19", status: "scheduled" as const }, { date: "2026-10-20", status: "scheduled" as const },
      { date: "2026-10-21", status: "skipped" as const }, { date: "2026-10-24", status: "scheduled" as const },
    ];
    expect(consistencyByWeek(sessions, ["2026-10-19"], ["2026-10-19"], today)[0]).toEqual({ start: "2026-10-19", completed: 1, due: 2, upcoming: 1, skipped: 1 });
  });
  it("counts finished plan weeks", () => {
    expect(weeksComplete("2026-10-19", 16, today)).toBe(0);
    expect(weeksComplete("2026-09-07", 16, today)).toBe(6);
    expect(weeksComplete("2026-01-05", 16, today)).toBe(16);
    expect(weeksComplete("2026-11-02", 16, today)).toBe(0);
  });
  it("formats date ranges", () => {
    expect(rangeLabel("2026-10-19", "2026-10-25")).toBe("19–25 October 2026");
    expect(rangeLabel("2026-09-28", "2026-10-25")).toContain("28 September");
  });
});
