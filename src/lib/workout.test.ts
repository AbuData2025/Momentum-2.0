import { describe, expect, it } from "vitest";
import { parseDuration, todayISO, workoutSchema } from "./workout";

const valid = { name: "Steady run", date: todayISO(), startTime: "06:10", runType: "steady", distanceKm: 10, durationSec: 3480, notes: "" };

describe("parseDuration", () => {
  it("parses h:mm:ss and mm:ss", () => {
    expect(parseDuration("1:51:00")).toBe(6660);
    expect(parseDuration("58:00")).toBe(3480);
  });
  it("rejects malformed input", () => {
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("1:75:00")).toBeNull();
    expect(parseDuration("58")).toBeNull();
  });
});

describe("workoutSchema", () => {
  it("accepts a valid workout", () => expect(workoutSchema.safeParse(valid).success).toBe(true));
  it("rejects zero distance", () => expect(workoutSchema.safeParse({ ...valid, distanceKm: 0 }).success).toBe(false));
  it("rejects future dates", () => expect(workoutSchema.safeParse({ ...valid, date: "2999-01-01" }).success).toBe(false));
  it("accepts backdated runs", () => expect(workoutSchema.safeParse({ ...valid, date: "2026-01-05" }).success).toBe(true));
});
