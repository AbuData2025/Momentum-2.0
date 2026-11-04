import { describe, expect, it } from "vitest";
import { getDayState, monthGrid, shiftMonth, weekRange } from "./calendar";
import type { Workout } from "./workouts";

const run = { id: "1", date: "2026-10-22", name: "Run", runType: "easy", distanceKm: 5, durationSec: 1500, notes: "", startTime: "" } as Workout;
const session = (date: string) => ({ id: date, date, runType: "easy" as const, targetKm: 6 });
const today = "2026-10-22";

describe("getDayState", () => {
  it("completed when a workout exists, even with a session", () => expect(getDayState("2026-10-22", [run], [session("2026-10-22")], today)).toBe("completed"));
  it("planned for today or the future", () => {
    expect(getDayState("2026-10-22", [], [session("2026-10-22")], today)).toBe("planned");
    expect(getDayState("2026-10-24", [], [session("2026-10-24")], today)).toBe("planned");
  });
  it("missed for a past session with no run", () => expect(getDayState("2026-10-21", [], [session("2026-10-21")], today)).toBe("missed"));
  it("rest when nothing is scheduled", () => expect(getDayState("2026-10-23", [], [], today)).toBe("rest"));
});

describe("calendar helpers", () => {
  it("builds a Monday-first grid for October 2026", () => {
    const g = monthGrid(2026, 9);
    expect(g).toHaveLength(35);
    expect(g[0]).toEqual({ date: "2026-09-28", inMonth: false });
    expect(g[34].date).toBe("2026-11-01");
  });
  it("shifts months across years", () => expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 }));
  it("gives Monday to Sunday for the week", () => expect(weekRange("2026-10-22")).toEqual({ start: "2026-10-19", end: "2026-10-25" }));
});
