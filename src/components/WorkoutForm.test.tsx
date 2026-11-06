// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../lib/workouts", () => ({ createWorkout: vi.fn(), updateWorkout: vi.fn(), removeWorkout: vi.fn() }));
import { todayISO } from "../lib/workout";
import { createWorkout } from "../lib/workouts";
import WorkoutForm from "./WorkoutForm";

const setup = () => { const onClose = vi.fn(); render(<WorkoutForm uid="u1" workout={null} onClose={onClose} />); return { user: userEvent.setup(), onClose }; };
const fillValid = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Workout name *"), "Steady morning run");
  await user.type(screen.getByLabelText("Distance (km) *"), "10");
  await user.type(screen.getByLabelText("Hours"), "0");
  await user.type(screen.getByLabelText("Minutes"), "58");
  await user.type(screen.getByLabelText("Seconds"), "00");
};

beforeEach(() => vi.mocked(createWorkout).mockReset().mockResolvedValue({} as never));
afterEach(cleanup);

describe("WorkoutForm", () => {
  it("explains what is missing instead of saving", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Save workout" }));
    expect(await screen.findByText("Give the workout a name.")).toBeTruthy();
    expect(screen.getByText("Enter a distance greater than 0 km.")).toBeTruthy();
    expect(screen.getByText(/Enter your moving time/)).toBeTruthy();
    expect(createWorkout).not.toHaveBeenCalled();
  });
  it("calculates pace and saves a valid run", async () => {
    const { user, onClose } = setup();
    await fillValid(user);
    expect(screen.getByText("5:48 /km")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Save workout" }));
    await waitFor(() => expect(createWorkout).toHaveBeenCalledTimes(1));
    expect(vi.mocked(createWorkout).mock.calls[0][0]).toBe("u1");
    expect(vi.mocked(createWorkout).mock.calls[0][1]).toMatchObject({ name: "Steady morning run", distanceKm: 10, durationSec: 3480, runType: "easy", date: todayISO() });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
  it("moves to the next time box after two digits", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText("Hours"), "01");
    expect(document.activeElement).toBe(screen.getByLabelText("Minutes"));
  });
  it("closes without waiting for the server when offline", async () => {
    const spy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.mocked(createWorkout).mockReturnValueOnce(new Promise(() => {}) as never);
    const { user, onClose } = setup();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Save workout" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByText(/couldn't save your changes/)).toBeNull();
    spy.mockRestore();
  });
  it("does not offer future dates", () => {
    setup();
    expect(screen.getByLabelText("Date *").getAttribute("max")).toBe(todayISO());
  });
  it("keeps the entries and offers a retry when saving fails", async () => {
    vi.mocked(createWorkout).mockRejectedValueOnce(new Error("offline"));
    const { user } = setup();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Save workout" }));
    expect(await screen.findByText(/couldn't save your changes/)).toBeTruthy();
    expect((screen.getByLabelText("Workout name *") as HTMLInputElement).value).toBe("Steady morning run");
    await user.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(createWorkout).toHaveBeenCalledTimes(2));
  });
});
