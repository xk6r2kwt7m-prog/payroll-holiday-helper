type ClockLocation = {
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_within_geofence: boolean | null;
  clock_out_time: string | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_out_within_geofence: boolean | null;
};

/** The absence of coordinates is unknown evidence, never an outside-area finding. */
export function clockLocationFlags(entry: ClockLocation) {
  const flags: { type: "location"; label: string; severity: "warning" | "error" }[] = [];
  for (const event of ["in", "out"] as const) {
    if (event === "out" && !entry.clock_out_time) continue;
    const label = `Clock-${event}`;
    if (entry[`clock_${event}_latitude`] == null || entry[`clock_${event}_longitude`] == null) {
      flags.push({ type: "location", label: `${label} location unavailable — check with staff`, severity: "warning" });
    } else if (entry[`clock_${event}_within_geofence`] === false) {
      flags.push({ type: "location", label: `${label} outside geofence`, severity: "error" });
    }
  }
  return flags;
}
