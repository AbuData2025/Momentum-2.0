import { describe, expect, it } from "vitest";
import { formatDuration, formatPace, paceSecPerKm } from "./format";

describe("format", () => {
  it("derives pace from distance and time", () => {
    expect(formatPace(paceSecPerKm(10, 3480))).toBe("5:48");
  });
  it("formats durations", () => {
    expect(formatDuration(3480)).toBe("58:00");
    expect(formatDuration(6660)).toBe("1:51:00");
  });
  it("guards zero distance", () => {
    expect(paceSecPerKm(0, 100)).toBe(0);
  });
});
