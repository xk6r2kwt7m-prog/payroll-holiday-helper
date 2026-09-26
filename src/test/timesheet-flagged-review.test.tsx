import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const m = vi.hoisted(() => ({ approve: vi.fn() }));
vi.mock("@/hooks/useTimeEntries", () => ({
  useApproveTimeEntries: () => ({ mutateAsync: m.approve, isPending: false }),
  useRejectTimeEntry: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useEvidence", () => ({ useEvidenceFiles: () => ({ data: [] }) }));
vi.mock("@/components/attendance/ManagerTimesheetDialog", () => ({ ManagerTimesheetDialog: () => null }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { TimesheetReviewPanel } from "@/components/attendance/TimesheetReviewPanel";

const entry = {
  id: "entry-one", employee_id: "employee-one", status: "pending", branch: "Site A",
  clock_in_time: "2026-07-02T09:00:00Z", clock_out_time: "2026-07-02T17:00:00Z",
  total_hours: 7.5, break_minutes: 30, shift_id: "shift-one",
  clock_in_latitude: null, clock_in_longitude: null,
  clock_out_latitude: 51.1, clock_out_longitude: -0.1,
  clock_out_within_geofence: true,
};

beforeEach(() => m.approve.mockReset().mockResolvedValue({ approved: 1 }));

describe("flagged timesheet review", () => {
  it("requires a written reason and records the flag in the approval audit input", async () => {
    render(<TimesheetReviewPanel entry={entry} open onClose={vi.fn()} />);
    expect(screen.getByText(/Clock-in location unavailable/)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Approve" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Why is it appropriate/), { target: { value: "Confirmed shift with site manager" } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(m.approve).toHaveBeenCalledWith(expect.objectContaining({
      entryIds: ["entry-one"], mode: "approve_single", reviewReason: "Confirmed shift with site manager",
      reviewedFlags: expect.arrayContaining([expect.stringContaining("Clock-in location unavailable")]),
    })));
  });

  it("cannot approve a pending entry with missing worked hours even with a reason", () => {
    render(<TimesheetReviewPanel entry={{ ...entry, total_hours: null }} open onClose={vi.fn()} />);
    expect(screen.getByText("Worked hours are missing or invalid")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Why is it appropriate/), { target: { value: "Checked with site manager" } });
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(m.approve).not.toHaveBeenCalled();
  });
});
