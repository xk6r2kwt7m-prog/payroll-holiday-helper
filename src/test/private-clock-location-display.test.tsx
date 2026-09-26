import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocationMapPreview } from "@/components/attendance/LocationMapPreview";

describe("private clock location evidence", () => {
  it("shows the recorded point and review status without loading an external map", () => {
    const { container } = render(<LocationMapPreview label="Clock-in" lat={51.123456} lng={-0.123456} withinGeofence={false} showInlineMap />);
    expect(screen.getByText("Outside geofence")).toBeInTheDocument();
    expect(screen.getByText(/Clock-in coordinates: 51.12346, -0.12346/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /View details/ }));
    expect(screen.getByText(/Exact coordinates: 51.123456, -0.123456/)).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
    expect(document.querySelector('a[href*="maps"], iframe[src*="openstreetmap"]')).toBeNull();
  });

  it("does not invent a point if location is missing", () => {
    render(<LocationMapPreview label="Clock-out" lat={null} lng={null} withinGeofence={false} />);
    expect(screen.getByText("No location data for clock-out")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /View details/ })).toBeNull();
  });
});
