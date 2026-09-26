/** Timesheets are entered in the workspace's civil time, never the browser's timezone. */
export function timesheetWallParts(instant: string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const get = (part: string) => parts.find((p) => p.type === part)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function timesheetWallToIso(date: string, time: string, timezone: string): string {
  if (!timezone) throw new Error("Workspace timezone is unavailable. Please try again later.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Enter a valid date and time.");
  }
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wallUtc = Date.UTC(year, month - 1, day, hour, minute);
  if (new Date(wallUtc).toISOString().slice(0, 16) !== `${date}T${time}`) {
    throw new Error("Enter a valid date and time.");
  }

  // Sample offsets around the requested wall time; a DST transition can
  // introduce two possible instants or make a local time impossible.
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 3) {
    const instant = wallUtc + hours * 3_600_000;
    const local = timesheetWallParts(new Date(instant), timezone);
    const [y, m, d] = local.date.split("-").map(Number);
    const [h, min] = local.time.split(":").map(Number);
    offsets.add(Date.UTC(y, m - 1, d, h, min) - instant);
  }
  const candidates = [...offsets]
    .map((offset) => new Date(wallUtc - offset))
    .filter((instant) => {
      const local = timesheetWallParts(instant, timezone);
      return local.date === date && local.time === time;
    });
  if (candidates.length !== 1) {
    throw new Error(candidates.length ? "This time occurs twice when the clocks change. Choose another time or ask an administrator to review it." : "This time does not exist when the clocks change. Choose another time.");
  }
  return candidates[0].toISOString();
}
