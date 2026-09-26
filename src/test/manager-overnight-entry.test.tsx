import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const m = vi.hoisted(() => ({
  edit: vi.fn(), add: vi.fn(), timezone: "Europe/London" as string | null,
}));
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ tenantTimezone: m.timezone }) }));
vi.mock("@/hooks/useTimeEntries", () => ({
  useManagerEditTimeEntry: () => ({ mutateAsync: m.edit, isPending: false }),
  useManagerAddTimeEntry: () => ({ mutateAsync: m.add, isPending: false }),
}));
vi.mock("@/hooks/useSchedule", () => ({ useBranchLocations: () => ({ data: [] }) }));
vi.mock("@/hooks/useEmployees", () => ({ useEmployees: () => ({ data: [] }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ManagerTimesheetDialog } from "@/components/attendance/ManagerTimesheetDialog";
import { toast } from "sonner";

const entry = {
  id: "entry-one", employee_id: "employee-one", branch: "Site A",
  clock_in_time: "2026-07-02T21:00:00Z", clock_out_time: null, break_minutes: 0,
};

beforeEach(() => {
  m.timezone = "Europe/London";
  m.edit.mockReset().mockResolvedValue({});
  m.add.mockReset().mockResolvedValue({});
  vi.mocked(toast.error).mockClear();
});

describe("manager closes an overnight timesheet", () => {
  it("saves the following day's clock-out as a London instant", async () => {
    render(<ManagerTimesheetDialog open onClose={vi.fn()} entry={entry} />);
    expect((screen.getByLabelText("Clock-in date") as HTMLInputElement).value).toBe("2026-07-02");
    fireEvent.change(screen.getByLabelText("Clock-out date"), { target: { value: "2026-07-03" } });
    fireEvent.change(screen.getByLabelText("Clock-out time (optional)"), { target: { value: "06:00" } });
    fireEvent.change(screen.getByPlaceholderText("Explain why this entry is being added or changed"), { target: { value: "Overnight shift completed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(m.edit).toHaveBeenCalledWith(expect.objectContaining({
      entryId: "entry-one", updates: expect.objectContaining({
        clock_in_time: "2026-07-02T21:00:00Z", clock_out_time: "2026-07-03T05:00:00.000Z",
      }),
    })));
  });

  it("refuses a clock-out earlier than clock-in without saving", async () => {
    render(<ManagerTimesheetDialog open onClose={vi.fn()} entry={entry} />);
    fireEvent.change(screen.getByLabelText("Clock-out time (optional)"), { target: { value: "06:00" } });
    fireEvent.change(screen.getByPlaceholderText("Explain why this entry is being added or changed"), { target: { value: "Review" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("choose the next date")));
    expect(m.edit).not.toHaveBeenCalled();
  });
});
