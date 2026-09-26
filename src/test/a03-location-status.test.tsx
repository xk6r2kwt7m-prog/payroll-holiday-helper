import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClockLocationStatus } from "@/components/dashboard/ClockLocationStatus";
import { clockLocationFlags } from "@/lib/clock-location-review";

describe("staff clock location guidance", () => {
  it("uses the selected site's radius rather than a fixed distance", () => {
    render(<ClockLocationStatus status="granted" distance={150} radius={100} />);
    expect(screen.getByRole("status")).toHaveTextContent("150m from the selected workplace");
    expect(screen.queryByText("Near the selected workplace")).not.toBeInTheDocument();
  });
  it("explains what happens if location permission is denied", () => {
    render(<ClockLocationStatus status="denied" />);
    expect(screen.getByRole("status")).toHaveTextContent("You may clock in; a manager will review it");
  });
  it("distinguishes missing GPS from a real out-of-area reading on manager review", () => {
    const flags = clockLocationFlags({
      clock_in_latitude: null, clock_in_longitude: null, clock_in_within_geofence: false,
      clock_out_time: "2026-09-20T17:00:00Z", clock_out_latitude: 0, clock_out_longitude: 0,
      clock_out_within_geofence: false,
    });
    expect(flags).toEqual([
      { type: "location", label: "Clock-in location unavailable — check with staff", severity: "warning" },
      { type: "location", label: "Clock-out outside geofence", severity: "error" },
    ]);
  });
});
