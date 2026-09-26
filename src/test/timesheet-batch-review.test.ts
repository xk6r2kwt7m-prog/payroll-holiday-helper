import { describe, expect, it } from "vitest";
import { partitionBatchSelection } from "@/lib/time-entry-batch-review";
import { computeFlags } from "@/components/attendance/TimesheetReviewPanel";

const clean = {
  id: "clean", status: "pending", clock_in_time: "2026-07-02T09:00:00Z",
  clock_out_time: "2026-07-02T17:00:00Z", total_hours: 7.5, break_minutes: 30,
  shift_id: "shift-one", clock_in_latitude: 51.1, clock_in_longitude: -0.1,
  clock_out_latitude: 51.1, clock_out_longitude: -0.1,
  clock_in_within_geofence: true, clock_out_within_geofence: true,
};

describe("batch timesheet approval selection", () => {
  it("holds both missing GPS and outside-site GPS instead of approving either", () => {
    const entries = [clean,
      { ...clean, id: "no-gps", clock_in_latitude: null, clock_in_longitude: null },
      { ...clean, id: "outside", clock_out_within_geofence: false },
    ];
    expect(partitionBatchSelection(entries, entries.map(e => e.id), computeFlags)).toEqual({
      eligibleIds: ["clean"], heldIds: ["no-gps", "outside"],
    });
  });

  it("holds any warning, incomplete hours, old status and stale selection", () => {
    const entries = [clean,
      { ...clean, id: "no-break", break_minutes: 0 },
      { ...clean, id: "no-out", clock_out_time: null },
      { ...clean, id: "zero-hours", total_hours: 0 },
      { ...clean, id: "already-approved", status: "approved" },
    ];
    expect(partitionBatchSelection(entries, ["clean", "no-break", "no-out", "zero-hours", "already-approved", "missing", "clean"], computeFlags)).toEqual({
      eligibleIds: ["clean"], heldIds: ["no-break", "no-out", "zero-hours", "already-approved", "missing"],
    });
  });
});
