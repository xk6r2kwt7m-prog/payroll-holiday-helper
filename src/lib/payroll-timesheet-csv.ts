/**
 * Shared timesheet-CSV parsing for payroll.
 *
 * Extracted from ImportPayrollDialog so that other surfaces (e.g. adding a
 * single employee to an existing period) can read the SAME source-of-truth
 * timesheet file that was imported for the period, with identical parsing
 * rules. Parsing is read-only — it never mutates stored evidence.
 */

// ─── CSV section → location/department mappings ───
export const SECTION_LOCATION_MAP: Record<string, string> = {
  "[BOH]BOH - Brixton": "Brixton (BOH)",
  "[FOH]FOH - Brixton": "Brixton (FOH)",
  "[RTD]KITCHEN": "CPU Kitchen",
  "[E98]FOH": "Fitzrovia (FOH)",
  "[YT5]30 Rathbone Place Ugly Dumpling WT 1JG,uk": "Fitzrovia (CPU)",
  "[KVQ]BOH": "Carnaby (BOH)",
  "[UGL]FOH": "Carnaby (FOH)",
};

export const SECTION_DEPT_MAP: Record<string, string> = {
  "[BOH]BOH - Brixton": "BOH",
  "[FOH]FOH - Brixton": "FOH",
  "[RTD]KITCHEN": "BOH",
  "[E98]FOH": "FOH",
  "[YT5]30 Rathbone Place Ugly Dumpling WT 1JG,uk": "CPU",
  "[KVQ]BOH": "BOH",
  "[UGL]FOH": "FOH",
};

export const SKIP_NAMES = new Set(["zak cope"]);

/** Resolve the department label for a parsed location name. */
export function departmentForLocation(locationName: string): string | null {
  const sectionKey = Object.keys(SECTION_LOCATION_MAP).find(
    (k) => SECTION_LOCATION_MAP[k] === locationName,
  );
  return (sectionKey && SECTION_DEPT_MAP[sectionKey]) || null;
}

export interface ParsedRow {
  csvName: string;
  hours: number;
  section: string;
  location: string;
}

export interface ParserSkippedSummary {
  /** Rows that appeared before any recognised section header. */
  beforeSection: number;
  /** Rows whose section header was recognised but format could not be parsed. */
  unknownFormat: number;
  /** Rows explicitly skipped by hard-coded SKIP_NAMES (e.g. platform admins). */
  skipNames: number;
  /** Section headers with no configured location/department mapping. */
  unmappedSections: string[];
}

export interface ParserResult {
  rows: ParsedRow[];
  skipped: ParserSkippedSummary;
}

export function parseTimesheetCSV(csvText: string): ParserResult {
  const lines = csvText.split("\n");
  const rows: ParsedRow[] = [];
  const skipped: ParserSkippedSummary = {
    beforeSection: 0,
    unknownFormat: 0,
    skipNames: 0,
    unmappedSections: [],
  };
  const seenUnmapped = new Set<string>();
  let currentSection = "";

  // Detect Timesheet Hour column from header row
  const headerLine = lines[0]?.toLowerCase() || "";
  const headerCols = headerLine.match(/("(?:[^"]|"")*"|[^,]*)/g) || [];
  let timesheetColIndex = headerCols.findIndex(
    (c) => c.replace(/"/g, "").trim() === "timesheet hour"
  );
  // Fallback to index 2 if header not found (backward compat)
  if (timesheetColIndex < 0) timesheetColIndex = 2;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\s*"?\s*(\[.+?\].+?)"?\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      if (!SECTION_LOCATION_MAP[currentSection] && !seenUnmapped.has(currentSection)) {
        seenUnmapped.add(currentSection);
        skipped.unmappedSections.push(currentSection);
      }
      continue;
    }

    if (line.toLowerCase().includes("total for") || line.toLowerCase().includes("grand total") || line.toLowerCase().includes("unpaid leave")) continue;

    const cols = line.match(/("(?:[^"]|"")*"|[^,]*)/g);
    if (!cols || cols.length < 3) {
      skipped.unknownFormat++;
      continue;
    }

    const name = cols[0]?.replace(/"/g, "").trim();
    const timesheetHoursStr = cols[timesheetColIndex]?.replace(/"/g, "").replace(/,/g, "").trim();

    if (!name) continue;
    if (name.toLowerCase().startsWith("total for")) continue;

    if (!currentSection) {
      skipped.beforeSection++;
      continue;
    }
    if (SKIP_NAMES.has(name.toLowerCase())) {
      skipped.skipNames++;
      continue;
    }

    const hours = parseFloat(timesheetHoursStr) || 0;
    if (hours === 0 && timesheetHoursStr === "-") continue;

    rows.push({
      csvName: name,
      hours,
      section: currentSection,
      location: SECTION_LOCATION_MAP[currentSection] || currentSection,
    });
  }
  return { rows, skipped };
}
