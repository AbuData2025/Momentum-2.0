// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSnapshot, settle, track } from "./sync";

afterEach(() => vi.restoreAllMocks());

describe("sync", () => {
  it("counts a write as pending until it settles", async () => {
    let done!: () => void;
    const p = track(new Promise<void>((r) => { done = r; }));
    expect(getSnapshot().pending).toBe(1);
    done();
    await p;
    expect(getSnapshot().pending).toBe(0);
  });
  it("returns the result when the write succeeds", async () => expect(await settle(Promise.resolve(5))).toBe(5));
  it("rethrows a quick failure so the form can show it", async () => {
    await expect(settle(Promise.reject(new Error("denied")))).rejects.toThrow("denied");
    expect(getSnapshot().failed).toBe(false);
  });
  it("stops waiting while offline, and flags a failure that arrives later", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    let fail!: (e: Error) => void;
    const p = new Promise<void>((_, reject) => { fail = reject; });
    expect(await settle(p)).toBeUndefined();
    fail(new Error("denied"));
    await new Promise((r) => setTimeout(r, 0));
    expect(getSnapshot().failed).toBe(true);
  });
});
