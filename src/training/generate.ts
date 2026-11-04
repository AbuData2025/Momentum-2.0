import { addDaysISO, weekStartISO } from "../lib/history";
import type { RunType } from "../lib/workout";

export type Goal = "5k" | "10k" | "half" | "marathon";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Objective = "finish" | "time" | "fitness";
export type Phase = "base" | "build" | "peak" | "taper";

export type PlanInput = {
  goal: Goal; experience: Experience; objective: Objective; targetTimeSec?: number;
  raceDate?: string; weeklyKm: number; runDays: number; longRunDay: "sat" | "sun"; today: string;
};
export type PlannedSessionData = {
  date: string; week: number; phase: Phase; type: RunType; title: string; targetKm: number; effort: string; description: string;
};
export type GeneratedPlan = { weeks: number; startDate: string; phases: Phase[]; weeklyKm: number[]; sessions: PlannedSessionData[]; warnings: string[] };
export type PlanResult = { ok: true; plan: GeneratedPlan } | { ok: false; reason: string; suggestedWeeks?: number };

/** Each distance has its own shape: length, taper, long-run ceiling and weekly-volume target. */
export const GOALS: Record<Goal, { label: string; km: number; weeks: number; minWeeks: number; taper: number; peakLong: Record<Experience, number>; longBoost: number; peak: Record<Experience, number> }> = {
  "5k": { label: "5K", km: 5, weeks: 8, minWeeks: 6, taper: 1, peakLong: { beginner: 6, intermediate: 8, advanced: 10 }, longBoost: 1, peak: { beginner: 25, intermediate: 35, advanced: 45 } },
  "10k": { label: "10K", km: 10, weeks: 10, minWeeks: 8, taper: 1, peakLong: { beginner: 12, intermediate: 14, advanced: 16 }, longBoost: 1, peak: { beginner: 32, intermediate: 45, advanced: 60 } },
  half: { label: "Half marathon", km: 21.0975, weeks: 12, minWeeks: 10, taper: 2, peakLong: { beginner: 16, intermediate: 19, advanced: 22 }, longBoost: 1.1, peak: { beginner: 40, intermediate: 55, advanced: 70 } },
  marathon: { label: "Marathon", km: 42.195, weeks: 16, minWeeks: 12, taper: 2, peakLong: { beginner: 26, intermediate: 30, advanced: 32 }, longBoost: 1.2, peak: { beginner: 50, intermediate: 65, advanced: 85 } },
};

// Weekday indexes (Mon = 0). The last entry is always the long run.
const PATTERNS: Record<"sat" | "sun", Record<number, number[]>> = {
  sun: { 2: [2, 6], 3: [1, 3, 6], 4: [0, 2, 4, 6], 5: [0, 1, 3, 4, 6], 6: [0, 1, 2, 3, 4, 6] },
  sat: { 2: [1, 5], 3: [1, 3, 5], 4: [0, 1, 3, 5], 5: [0, 1, 2, 3, 5], 6: [0, 1, 2, 3, 4, 5] },
};
const LONG_FRAC: Record<number, number> = { 2: 0.55, 3: 0.45, 4: 0.38, 5: 0.34, 6: 0.3 };
const REPS: Record<Goal, { m: number; rec: string }> = {
  "5k": { m: 400, rec: "90 seconds" }, "10k": { m: 800, rec: "90 seconds" }, half: { m: 1000, rec: "2 minutes" }, marathon: { m: 1000, rec: "2 minutes" },
};

export const dayNum = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5);
export const goalPaceSecPerKm = (goal: Goal, targetSec: number) => targetSec / GOALS[goal].km;
const r5 = (x: number) => Math.round(x * 2) / 2;
const km = (x: number) => `${Number.isInteger(x) ? x : x.toFixed(1)} km`;

function phasePlan(weeks: number, taper: number): Phase[] {
  const b = weeks - taper;
  let base = Math.max(1, Math.round(b * 0.35)), peak = Math.max(1, Math.round(b * 0.25)), build = b - base - peak;
  if (build < 1) { build = 1; base = b - build - peak; }
  return [...Array(base).fill("base"), ...Array(build).fill("build"), ...Array(peak).fill("peak"), ...Array(taper).fill("taper")] as Phase[];
}

/** Growth is capped at 10% a week, every 4th week is a cutback, and the final weeks taper. */
function weeklyVolumes(weeks: number, taper: number, start: number, peak: number) {
  const out: number[] = [];
  let base = start;
  for (let i = 1; i <= weeks - taper; i++) {
    if (i > 1 && i % 4 === 0) { out.push(r5(base * 0.8)); continue; }
    if (i > 1) base = Math.min(base * 1.1, Math.max(peak, start));
    out.push(r5(base));
  }
  const top = Math.max(...out);
  for (let t = 1; t <= taper; t++) out.push(r5(top * (taper === 1 ? 0.6 : [0.75, 0.5][t - 1])));
  return out;
}

function qualityType(goal: Goal, exp: Experience, phase: Phase, week: number): RunType {
  if (phase === "taper" || week % 4 === 0) return "steady"; // taper and cutback weeks stay light
  const q = week - Math.floor(week / 4); // counts only non-cutback weeks, so the rotation never stalls
  if (exp === "beginner") return phase !== "base" && q % 2 === 0 ? "tempo" : "steady"; // short tempo only, no intervals
  if (phase === "base") return q % 2 === 0 ? "tempo" : "steady";
  return q % (goal === "5k" || goal === "10k" ? 2 : 3) === 0 ? "intervals" : "tempo";
}

function detail(type: RunType, distance: number, goal: Goal, phase: Phase, week: number, exp: Experience) {
  switch (type) {
    case "steady":
      return { title: "Steady run", effort: "Comfortably brisk", description: `1 km easy warm-up, ${km(distance - 2)} at a steady effort (a notch above easy, short sentences only), then 1 km easy cool-down.` };
    case "tempo": {
      const main = Math.max(2, Math.min(exp === "beginner" ? 3 : 99, r5(distance - 3.5)));
      return { title: "Tempo run", effort: "Comfortably hard", description: `2 km easy warm-up, ${km(main)} at tempo effort (you could say a few words, not a conversation), then ${km(Math.max(1, distance - 2 - main))} easy cool-down.` };
    }
    case "intervals": {
      const { m, rec } = REPS[goal];
      const reps = Math.min(10, Math.max(3, Math.floor((distance - 3.5) / (m / 1000 + 0.2))));
      const short = goal === "5k" || goal === "10k";
      return {
        title: "Interval session", effort: short ? "Hard but controlled (about 5K effort)" : "Threshold: comfortably hard",
        description: `2 km easy warm-up, ${reps} × ${m} m at ${short ? "hard 5K effort" : "threshold effort"} with ${rec} easy jogging between, then easy cool-down. About ${km(distance)} in total.`,
      };
    }
    case "long": {
      const finish = (goal === "half" || goal === "marathon") && exp !== "beginner" && (phase === "build" || phase === "peak") && week % 2 === 0
        ? ` Over the last ${km(r5(Math.min(distance * 0.25, goal === "marathon" ? 8 : 5)))}, lift to ${goal === "marathon" ? "marathon" : "half-marathon"} effort.` : "";
      return { title: "Long run", effort: "Easy and steady", description: `${km(distance)} at a relaxed, conversational pace. Walk breaks are fine, and bring water or fuel if you'll be out over 75 minutes.${finish}` };
    }
    default:
      return { title: "Easy run", effort: "Easy: you can chat in full sentences", description: `${km(distance)} at a relaxed pace. This is where your base is built, so keep it comfortable.` };
  }
}

export function generatePlan(input: PlanInput): PlanResult {
  const g = GOALS[input.goal];
  const exp = input.experience;
  const runDays = Math.min(6, Math.max(2, Math.round(input.runDays)));
  const minWeeks = g.minWeeks + (exp === "beginner" && (input.goal === "half" || input.goal === "marathon") ? 2 : 0);
  const warnings: string[] = [];
  const mondayToday = weekStartISO(input.today) === input.today;
  const firstMonday = mondayToday ? input.today : addDaysISO(weekStartISO(input.today), 7);

  let weeks = g.weeks, startDate = firstMonday;
  if (input.raceDate) {
    if (input.raceDate <= input.today) return { ok: false, reason: "That race date has already passed. Pick a future date, or leave it blank." };
    const raceWeek = weekStartISO(input.raceDate);
    const avail = (dayNum(raceWeek) - dayNum(firstMonday)) / 7 + 1;
    if (avail < minWeeks)
      return { ok: false, suggestedWeeks: minWeeks, reason: `Your race is about ${Math.max(0, Math.floor(avail))} training weeks away. A safe ${g.label} plan for a ${exp} runner needs at least ${minWeeks}. Try a later race, a shorter distance, or leave the date blank.` };
    weeks = Math.min(avail, g.weeks + 4);
    startDate = addDaysISO(raceWeek, -(weeks - 1) * 7);
    if (avail < g.weeks) warnings.push(`This is shorter than the usual ${g.weeks} weeks, so progress is a little quicker than ideal. Listen to your body.`);
  }

  const phases = phasePlan(weeks, g.taper);
  const startKm = Math.max(Math.min(Math.max(input.weeklyKm, 0), 200), runDays * 3);
  const vols = weeklyVolumes(weeks, g.taper, startKm, g.peak[exp]);
  const topKm = Math.max(...vols);
  if (topKm < g.peak[exp] * 0.75)
    warnings.push(`Your weekly distance peaks at ${topKm} km, lower than is typical for a ${g.label} (around ${g.peak[exp]} km). Treat the goal as finishing comfortably, or start earlier.`);

  const days = PATTERNS[input.longRunDay][runDays];
  const nonLong = days.slice(0, -1), hasQ = nonLong.length >= 2, qIdx = Math.floor(nonLong.length / 2);
  const sessions: PlannedSessionData[] = [];

  // Long runs climb steadily to the peak (never dipping, even in cutback weeks), then drop only in the taper.
  const buildW = weeks - g.taper, peakLong = g.peakLong[exp];
  const startLong = Math.min(peakLong, Math.max(3, r5(vols[0] * Math.min(0.5, LONG_FRAC[runDays] * g.longBoost))));
  const step = buildW > 1 ? Math.min(2, Math.max(0.5, Math.ceil(((peakLong - startLong) / (buildW - 1)) * 2) / 2)) : 0.5;
  const longs = vols.map((_, w) => (w < buildW ? Math.min(peakLong, r5(startLong + w * step)) : 0));
  for (let t = 1; t <= g.taper; t++) longs[buildW - 1 + t] = r5(longs[buildW - 1] * (g.taper === 1 ? 0.6 : [0.7, 0.5][t - 1]));

  for (let w = 0; w < weeks; w++) {
    const week = w + 1, phase = phases[w], vol = vols[w];
    const longKm = longs[w];
    const weights = nonLong.map((_, i) => (hasQ && i === qIdx ? 1.2 : 1));
    const tw = weights.reduce((a, b) => a + b, 0);
    const add = (dayIdx: number, type: RunType, dist: number) => {
      if (exp === "beginner" && type === "tempo") dist = Math.min(dist, 7);
      if ((type === "tempo" || type === "intervals") && dist < 6) type = "steady";
      if (type === "steady" && dist < 4) type = "easy";
      sessions.push({ date: addDaysISO(startDate, w * 7 + dayIdx), week, phase, type, targetKm: dist, ...detail(type, dist, input.goal, phase, week, exp) });
    };
    nonLong.forEach((d, i) => add(d, hasQ && i === qIdx ? qualityType(input.goal, exp, phase, week) : "easy", Math.max(3, r5(((vol - longKm) * weights[i]) / tw))));
    add(days[days.length - 1], "long", longKm);
  }

  const kept = input.raceDate ? sessions.filter((s) => s.date < input.raceDate!) : sessions;
  const weeklyKm = vols.map((_, i) => r5(kept.filter((s) => s.week === i + 1).reduce((a, s) => a + s.targetKm, 0)));
  return { ok: true, plan: { weeks, startDate, phases, weeklyKm, sessions: kept, warnings } };
}
