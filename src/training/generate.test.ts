import { describe, expect, it } from "vitest";
import { GOALS, dayNum, generatePlan, type Experience, type Goal, type PlanInput } from "./generate";
import { currentWeek, planProgress, sessionStatus } from "./progress";

const base: PlanInput = { goal: "10k", experience: "intermediate", objective: "finish", weeklyKm: 25, runDays: 4, longRunDay: "sun", today: "2026-10-22" };
const plan = (o: Partial<PlanInput> = {}) => { const r = generatePlan({ ...base, ...o }); if (!r.ok) throw new Error(r.reason); return r.plan; };
const goals = Object.keys(GOALS) as Goal[];
const levels: Experience[] = ["beginner", "intermediate", "advanced"];

describe("generatePlan", () => {
  it("is deterministic", () => expect(plan()).toEqual(plan()));
  it.each(goals)("%s: default length, phases in order, ends in taper", (goal) => {
    const p = plan({ goal });
    expect(p.weeks).toBe(GOALS[goal].weeks);
    expect(p.phases[0]).toBe("base");
    expect(p.phases[p.phases.length - 1]).toBe("taper");
    expect(p.phases.filter((x) => x === "taper")).toHaveLength(GOALS[goal].taper);
  });
  it("never exceeds the weekly target and tapers below the peak", () => {
    for (const goal of goals) for (const experience of levels) {
      const p = plan({ goal, experience, weeklyKm: 30 });
      const top = Math.max(...p.weeklyKm.slice(0, p.weeks - GOALS[goal].taper));
      expect(top).toBeLessThanOrEqual(Math.max(GOALS[goal].peak[experience], 30) + 3);
      expect(p.weeklyKm[p.weeks - 1]).toBeLessThan(top);
    }
  });
  it("caps week-on-week growth at 10% outside cutbacks", () => {
    const p = plan({ goal: "marathon", experience: "advanced", weeklyKm: 30, runDays: 5 });
    for (let i = 1; i < p.weeks - 2; i++) {
      if ((i + 1) % 4 === 0 || i % 4 === 0) continue; // cutback week, or the week after it
      expect(p.weeklyKm[i]).toBeLessThanOrEqual(p.weeklyKm[i - 1] * 1.1 + 1.5);
    }
  });
  it("keeps beginners off intervals and gives them only short tempo work after the base phase", () => {
    for (const goal of goals) {
      const p = plan({ goal, experience: "beginner" });
      expect(p.sessions.some((s) => s.type === "intervals")).toBe(false);
      for (const s of p.sessions.filter((x) => x.type === "tempo")) { expect(s.phase).not.toBe("base"); expect(s.targetKm).toBeLessThanOrEqual(7); }
    }
  });
  it("includes every run type across a plan", () => {
    for (const goal of goals) for (const experience of ["intermediate", "advanced"] as const) {
      const types = new Set(plan({ goal, experience }).sessions.map((s) => s.type));
      for (const t of ["easy", "steady", "tempo", "intervals", "long"]) expect(types.has(t as never)).toBe(true);
    }
    for (const goal of goals) expect(plan({ goal, experience: "beginner" }).sessions.some((s) => s.type === "tempo")).toBe(true);
  });
  it("raises the long run week by week and only drops it in the taper", () => {
    for (const goal of goals) for (const experience of levels) for (const longRunDay of ["sat", "sun"] as const) {
      const p = plan({ goal, experience, weeklyKm: 10, longRunDay });
      const longs = Array.from({ length: p.weeks }, (_, i) => p.sessions.find((s) => s.week === i + 1 && s.type === "long")!.targetKm);
      const build = p.weeks - GOALS[goal].taper;
      for (let i = 1; i < build; i++) { expect(longs[i]).toBeGreaterThanOrEqual(longs[i - 1]); expect(longs[i] - longs[i - 1]).toBeLessThanOrEqual(2); }
      for (let i = build; i < p.weeks; i++) expect(longs[i]).toBeLessThan(longs[build - 1]);
      expect(longs[build - 1]).toBeGreaterThan(longs[0]);
      expect(longs[build - 1]).toBeLessThanOrEqual(GOALS[goal].peakLong[experience]);
    }
  });
  it("steps the long run up by 1 km a week for a typical half-marathon runner", () => {
    const p = plan({ goal: "half", experience: "intermediate", weeklyKm: 25 });
    const longs = [1, 2, 3, 4, 5].map((w) => p.sessions.find((s) => s.week === w && s.type === "long")!.targetKm);
    expect(longs.map((x, i) => (i ? x - longs[i - 1] : 1))).toEqual([1, 1, 1, 1, 1]);
  });
  it("keeps hard sessions away from the long run and at most one a week", () => {
    for (const longRunDay of ["sat", "sun"] as const) for (const runDays of [2, 3, 4, 5, 6]) {
      const p = plan({ goal: "half", experience: "advanced", runDays, longRunDay });
      for (let w = 1; w <= p.weeks; w++) {
        const ws = p.sessions.filter((s) => s.week === w);
        const hard = ws.filter((s) => s.type === "tempo" || s.type === "intervals");
        expect(hard.length).toBeLessThanOrEqual(1);
        const long = ws.find((s) => s.type === "long")!;
        for (const h of hard) expect(Math.abs(dayNum(h.date) - dayNum(long.date))).toBeGreaterThan(1);
      }
    }
  });
  it("builds distance-specific plans, not a shortened marathon", () => {
    const five = plan({ goal: "5k", experience: "advanced", weeklyKm: 40 }), full = plan({ goal: "marathon", experience: "advanced", weeklyKm: 40, runDays: 5 });
    expect(Math.max(...five.sessions.filter((s) => s.type === "long").map((s) => s.targetKm))).toBeLessThanOrEqual(10);
    expect(Math.max(...full.sessions.filter((s) => s.type === "long").map((s) => s.targetKm))).toBeGreaterThan(25);
    expect(five.weeks).toBeLessThan(full.weeks);
  });
  it("gives every session instructions", () => {
    for (const s of plan({ goal: "marathon", experience: "advanced", runDays: 5 }).sessions) {
      expect(s.description.length).toBeGreaterThan(20);
      expect(s.effort).not.toBe("");
      expect(s.targetKm).toBeGreaterThanOrEqual(3);
    }
  });
  it("starts on a Monday and keeps sessions inside their week", () => {
    const p = plan();
    expect(p.startDate).toBe("2026-10-26");
    for (const s of p.sessions) expect(Math.floor((dayNum(s.date) - dayNum(p.startDate)) / 7) + 1).toBe(s.week);
  });
});

describe("race dates", () => {
  it("works without one", () => expect(generatePlan(base).ok).toBe(true));
  it("refuses a race that is too close instead of compressing the plan", () => {
    const r = generatePlan({ ...base, goal: "marathon", raceDate: "2026-11-22" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.suggestedWeeks).toBeGreaterThanOrEqual(12);
  });
  it("refuses a past race date", () => expect(generatePlan({ ...base, raceDate: "2026-10-01" }).ok).toBe(false));
  it("ends before the race and warns when shorter than usual", () => {
    const p = plan({ raceDate: "2026-12-20" });
    expect(p.sessions.every((s) => s.date < "2026-12-20")).toBe(true);
    expect(p.warnings.length).toBeGreaterThan(0);
  });
  it("starts later for a far-off race", () => {
    const p = plan({ goal: "5k", raceDate: "2027-06-20" });
    expect(p.weeks).toBe(GOALS["5k"].weeks + 4);
    expect(p.startDate > "2026-10-26").toBe(true);
  });
});

describe("progress", () => {
  const s = (date: string, status: "scheduled" | "skipped" = "scheduled") => ({ date, status });
  const today = "2026-10-22";
  it("derives status from runs and dates", () => {
    expect(sessionStatus(s("2026-10-20"), ["2026-10-20"], today)).toBe("completed");
    expect(sessionStatus(s("2026-10-20"), [], today)).toBe("missed");
    expect(sessionStatus(s("2026-10-22"), [], today)).toBe("planned");
    expect(sessionStatus(s("2026-10-20", "skipped"), [], today)).toBe("skipped");
  });
  it("excludes skipped and future sessions from completion", () => {
    const p = planProgress([s("2026-10-19"), s("2026-10-20"), s("2026-10-21", "skipped"), s("2026-10-25")], ["2026-10-19"], today);
    expect(p).toMatchObject({ completed: 1, missed: 1, skipped: 1, due: 2, pct: 50 });
  });
  it("finds the current week", () => {
    expect(currentWeek("2026-10-19", 8, "2026-10-22")).toBe(1);
    expect(currentWeek("2026-10-19", 8, "2026-10-26")).toBe(2);
    expect(currentWeek("2026-11-02", 8, "2026-10-22")).toBe(1);
    expect(currentWeek("2026-08-01", 8, "2026-10-22")).toBe(8);
  });
});
