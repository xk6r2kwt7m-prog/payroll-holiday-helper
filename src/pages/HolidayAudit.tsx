import { useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, AlertTriangle, CheckCircle2, Search, ArrowUpDown, Info } from "lucide-react";
import { useAllPayrollEntriesWithHoliday, formatHours, formatCurrency } from "@/hooks/useHolidays";
import { useLeaveRules } from "@/hooks/useLeaveRules";
import { useEmployees } from "@/hooks/useEmployees";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Name mapping to resolve CSV nicknames to DB employee names
const NAME_MAP: Record<string, string> = {
  "Maggie": "Anna Margarida Abreu Ribeiro",
  "khai": "Khai Everest-Perrin",
  "Sai": "Sai Thota",
  "SAM": "Samuel Thota",
  "kitty": "Kitty Oil Lan",
  "Nairobis De los Sant…": "Nairobys De los Santos",
  "Nairobis De los Sant": "Nairobys De los Santos",
  "Carlos": "Carlos Madrid",
  "Ruben": "Rubem Pereira",
  "Daniela": "Daniela Patricia Da Costa Almeida",
  "Fred": "Fred Vary",
  "Isabel": "Isabel Belobradic-Gonzales",
  "Jasmin": "Jasmin Llumiquinga",
  "Kavi": "Kavi Sanghani",
  "Kazumi": "Kazumi Ortega",
  "Tamar": "Tamar Rios",
  "Aaron": "Aaron Eganu",
  "Afonso": "Afonso Gomes",
  "Amie": "Amie Martinez-Amezquita",
  "Amelie": "Amelie Wilkinson-Zaza",
  "Heidy": "Heidy Ramos",
  "Ada": "Ada Feliz",
  "Sultan": "Sultan Al Mabrur",
  "Yariel": "Yariel Herrera",
  "Lissette": "Lissette Paredes",
  "Vicky": "Viktoriia Bastrakova",
  "Anny belkys": "Anny Matos",
  "Arun Kumar": "Arun Thota",
  "Nishanth Thota": "Nishanth Thota",
  "Rithwik Godishala": "Rithwik Godishala",
  "Harley Barker": "Harley Barker",
  "Marco": "Marco Ribeiro",
  "Ling chak": "Ling Chak",
  "Wing Lee": "Wing Lee",
  "Fatima": "Fatima Ashraf",
  "Jie-En": "Jie En Loh",
  "Joselin Chala": "Jocelyne Chala",
  "Rehana": "Rehana Ashraf",
  "Varsha": "Varsha Vadlapudi",
  "Sreeja": "Sreeja Vadlapudi",
  "Kim": "Kim Aglupos",
  "Luisa Valenzuela": "Luisa Valenzuela",
  "Molly Booker": "Molly Booker",
  "Olga Chala": "Olga Quilumba",
  "Hafiz Abdur Rahim": "Hafiz Rahim",
  "Jhuli Macias": "Jhuli Vallejos",
  "Adriana Baca": "Adriana Baca",
  "Keaton": "Keaton S H Mar",
  "Setareh": "Setareh Saeedfar",
  "Aris Feliz": "Arisnorky Feliz",
  "Diogo": "Diogo Pinto",
  "Gus Gumery": "Gus Gumery",
  "Joel": "Joel Bau",
  "Levi": "Levi Gomez",
  "Eva": "Eva Cater",
  "Inès": "Ines Couturier",
  "Chelsea Lourenco": "Chelsea Lourenco Ribeiro",
  "Raissa Fernandes": "Raissa Fernandes",
  "Venice Pintea": "Venice Pintea",
  "Wakako": "Wakako Ashida",
  "Maia": "Maia Kayi Megase",
  "maria": "Maria Palomeque",
  "Mariam Sardzhveladze": "Mariam Sardzhveladze",
  "Melanie Duarte": "Melanie Duarte",
  "Hannah Manning": "Hannah Manning",
  "Cecilia O'Mara - F&B…": "Cecilia O'Mara",
  "Steven": "Steven Cumba",
  "Jade": "Jade",
  "Monika": "Monika Dhillon",
  "Reshna": "Reshna",
  "Catty": "Catty",
  "Elsa": "Elsa Perez",
  "Ekaterina": "Ekaterina",
  "Hafiz": "Hafiz Rahim",
  // 2024 names
  "maribel": "Maribel",
  "Durga Chandan": "Durba Chandan",
  "Benjamin": "Benjamin Gra",
  "Rochelle": "Rochelle",
  "miama": "Miama",
  "David Rios": "David Rios",
  "Roger Rodriguez": "Roger Rodriguez",
  "Akshay Jacob Mathew": "Akshay Jacob Mathew",
  "Eli Sebastian": "Eli Sebastian",
  "nairoby": "Nairobys De los Santos",
  "Jess": "Jess",
  "Dimple": "Dimple",
  "Chloe Cook": "Chloe Cook",
  "Endea": "Endea",
  "Iara Cabrita": "Iara Cabrita",
  "Jhulia": "Jhulia",
  "Kate~": "Kate",
  "Sally Sano": "Sally Poh Ray Sano Lee",
  "Silvio": "Silvio",
  "Anna Khoptynska": "Anna Khoptynska",
  "Catalin Satcau": "Catalin Satcau",
  "Eve": "Eve",
  "Mason": "Mason",
  "Lorna Lorna": "Lorna",
  "Andre": "Andre",
};

interface ParsedCSVRow {
  name: string;
  timesheetHours: number;
  section: string;
}

interface AggregatedEmployee {
  csvName: string;
  resolvedName: string;
  csvTotalHours: number;
  dbTotalHours: number;
  dbAccrued: number;
  expectedAccrual: number;
  accrualDifference: number;
  matched: boolean;
  sections: string[];
  isAnnualLeave: boolean;
}

type SortField = "name" | "csvHours" | "dbHours" | "difference" | "accrualDiff";
type SortDir = "asc" | "desc";

function parseCSV(text: string): ParsedCSVRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rows: ParsedCSVRow[] = [];
  let currentSection = "";

  for (const line of lines) {
    // Section header: starts with space/quote and has bracket notation
    const sectionMatch = line.match(/^\s*"?\s*\[([^\]]+)\](.+?)"/);
    if (sectionMatch) {
      currentSection = sectionMatch[2].trim();
      continue;
    }
    // Check for "Annual Leave" section
    if (line.includes("Annual Leave")) {
      currentSection = "Annual Leave";
      continue;
    }
    // Skip header row
    if (line.startsWith('"Team Member"')) continue;
    // Skip total rows
    if (line.includes("Total for") || line.includes("Grand Total")) continue;

    // Parse data row
    const cols = line.match(/"([^"]*)"/g)?.map((c) => c.replace(/"/g, ""));
    if (!cols || cols.length < 3) continue;

    const name = cols[0].trim();
    const timesheetStr = cols[2].replace(/,/g, "").trim();
    const timesheetHours = parseFloat(timesheetStr);

    if (!name || isNaN(timesheetHours) || timesheetHours === 0) continue;

    rows.push({ name, timesheetHours, section: currentSection });
  }
  return rows;
}

function resolveEmployeeName(csvName: string): string {
  if (NAME_MAP[csvName]) return NAME_MAP[csvName];
  // Try partial match
  const trimmed = csvName.replace(/…$/, "").trim();
  if (NAME_MAP[trimmed]) return NAME_MAP[trimmed];
  return csvName;
}

export default function HolidayAudit() {
  const [csvData, setCsvData] = useState<ParsedCSVRow[] | null>(null);
  const [csvYear, setCsvYear] = useState<number>(2025);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("accrualDiff");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "discrepancy" | "matched" | "unmatched">("all");

  const { data: payrollEntries = [] } = useAllPayrollEntriesWithHoliday();
  const { data: employees = [] } = useEmployees();
  const { data: leaveRules } = useLeaveRules();

  // Aggregate DB data filtered by detected year
  const dbTotals = useMemo(() => {
    const yearStart = `${csvYear}-01-01`;
    const yearEnd = `${csvYear}-12-31`;
    const map = new Map<string, { hours: number; accrued: number; name: string }>();
    for (const entry of payrollEntries) {
      const period = entry.payroll_periods as any;
      if (!period?.start_date || period.start_date < yearStart || period.end_date > yearEnd) continue;
      const emp = entry.employees as any;
      if (!emp) continue;
      const key = `${emp.forename} ${emp.surname}`;
      const existing = map.get(key) || { hours: 0, accrued: 0, name: key };
      existing.hours += Number(entry.timesheet_hours) || 0;
      existing.accrued += Number(entry.holiday_accrued_hours) || 0;
      map.set(key, existing);
    }
    return map;
  }, [payrollEntries, csvYear]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    // Auto-detect year from filename
    const yearMatch = file.name.match(/(\d{4})/g);
    if (yearMatch && yearMatch.length >= 1) {
      const detectedYear = parseInt(yearMatch[yearMatch.length - 1]);
      if (detectedYear >= 2020 && detectedYear <= 2030) setCsvYear(detectedYear);
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvData(parseCSV(text));
    };
    reader.readAsText(file);
  }, []);

  // Aggregate CSV data by resolved name
  const comparison = useMemo((): AggregatedEmployee[] => {
    if (!csvData) return [];

    const map = new Map<string, { csvHours: number; sections: Set<string>; csvName: string; isAnnualLeave: boolean }>();
    for (const row of csvData) {
      const resolved = resolveEmployeeName(row.name);
      const existing = map.get(resolved) || { csvHours: 0, sections: new Set(), csvName: row.name, isAnnualLeave: false };
      existing.csvHours += row.timesheetHours;
      existing.sections.add(row.section);
      if (row.section === "Annual Leave") existing.isAnnualLeave = true;
      map.set(resolved, existing);
    }

    const results: AggregatedEmployee[] = [];
    for (const [resolved, csv] of map) {
      const db = dbTotals.get(resolved);
      const dbHours = db?.hours ?? 0;
      const dbAccrued = db?.accrued ?? 0;
      const expectedAccrual = csv.csvHours * (leaveRules?.accrualRate ?? 0);
      results.push({
        csvName: csv.csvName,
        resolvedName: resolved,
        csvTotalHours: csv.csvHours,
        dbTotalHours: dbHours,
        dbAccrued,
        expectedAccrual,
        accrualDifference: dbAccrued - expectedAccrual,
        matched: !!db,
        sections: Array.from(csv.sections),
        isAnnualLeave: csv.isAnnualLeave,
      });
    }

    // Also add DB employees not in CSV
    for (const [name, db] of dbTotals) {
      if (!map.has(name) && db.hours > 0) {
        results.push({
          csvName: "",
          resolvedName: name,
          csvTotalHours: 0,
          dbTotalHours: db.hours,
          dbAccrued: db.accrued,
          expectedAccrual: 0,
          accrualDifference: db.accrued,
          matched: false,
          sections: [],
          isAnnualLeave: false,
        });
      }
    }

    return results;
  }, [csvData, dbTotals]);

  // Filter and sort
  const filtered = useMemo(() => {
    let data = comparison;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((r) => r.resolvedName.toLowerCase().includes(q) || r.csvName.toLowerCase().includes(q));
    }
    if (filterStatus === "discrepancy") {
      data = data.filter((r) => Math.abs(r.csvTotalHours - r.dbTotalHours) > 5);
    } else if (filterStatus === "matched") {
      data = data.filter((r) => r.matched && Math.abs(r.csvTotalHours - r.dbTotalHours) <= 5);
    } else if (filterStatus === "unmatched") {
      data = data.filter((r) => !r.matched);
    }

    data.sort((a, b) => {
      let va: number, vb: number;
      switch (sortField) {
        case "name": return sortDir === "asc" ? a.resolvedName.localeCompare(b.resolvedName) : b.resolvedName.localeCompare(a.resolvedName);
        case "csvHours": va = a.csvTotalHours; vb = b.csvTotalHours; break;
        case "dbHours": va = a.dbTotalHours; vb = b.dbTotalHours; break;
        case "difference": va = Math.abs(a.csvTotalHours - a.dbTotalHours); vb = Math.abs(b.csvTotalHours - b.dbTotalHours); break;
        case "accrualDiff": va = Math.abs(a.accrualDifference); vb = Math.abs(b.accrualDifference); break;
        default: va = 0; vb = 0;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return data;
  }, [comparison, search, filterStatus, sortField, sortDir]);

  // Summary stats
  const stats = useMemo(() => {
    const total = comparison.length;
    const matched = comparison.filter((r) => r.matched).length;
    const discrepancies = comparison.filter((r) => r.matched && Math.abs(r.csvTotalHours - r.dbTotalHours) > 5).length;
    const unmatched = comparison.filter((r) => !r.matched).length;
    const totalCsvHours = comparison.reduce((s, r) => s + r.csvTotalHours, 0);
    const totalDbHours = comparison.reduce((s, r) => s + r.dbTotalHours, 0);
    const annualLeave = comparison.filter((r) => r.isAnnualLeave);
    return { total, matched, discrepancies, unmatched, totalCsvHours, totalDbHours, annualLeave };
  }, [comparison]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Holiday Audit</h1>
            <p className="text-sm text-muted-foreground">
              Upload an external timesheet CSV to cross-reference hours against payroll records and verify accrual accuracy
            </p>
          </div>
          {csvData && (
            <div className="text-right">
              <Badge variant="outline" className="text-sm">{csvYear} Data</Badge>
              {csvFileName && <p className="text-xs text-muted-foreground mt-1">{csvFileName}</p>}
            </div>
          )}
        </div>
        {/* Upload */}
        {!csvData && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-card-foreground">Upload Timesheet Export CSV</p>
                <p className="text-sm text-muted-foreground">
                  Upload a schedule vs timesheet report to compare against your payroll data
                </p>
              </div>
              <label className="cursor-pointer">
                <Input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                <Button asChild variant="default">
                  <span>Choose CSV File</span>
                </Button>
              </label>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {csvData && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="cursor-pointer" onClick={() => setFilterStatus("all")}>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Employees</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={() => setFilterStatus("matched")}>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-success">{stats.matched - stats.discrepancies}</p>
                  <p className="text-xs text-muted-foreground">Matched OK</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={() => setFilterStatus("discrepancy")}>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-warning">{stats.discrepancies}</p>
                  <p className="text-xs text-muted-foreground">Discrepancies</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={() => setFilterStatus("unmatched")}>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{stats.unmatched}</p>
                  <p className="text-xs text-muted-foreground">Unmatched</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{formatHours(stats.totalCsvHours - stats.totalDbHours)}</p>
                  <p className="text-xs text-muted-foreground">Hours Variance</p>
                </CardContent>
              </Card>
            </div>

            {/* Annual Leave Alert */}
            {stats.annualLeave.length > 0 && (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <Info className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-semibold text-card-foreground">Annual Leave Entries Found in CSV</p>
                    <p className="text-sm text-muted-foreground">
                      The following employees have hours recorded under "Annual Leave" in the external system. 
                      These represent holiday hours taken and should be cross-checked against your holiday_payments records:
                    </p>
                    <div className="mt-2 space-y-1">
                      {stats.annualLeave.map((emp) => (
                        <div key={emp.resolvedName} className="text-sm flex gap-2">
                          <span className="font-medium">{emp.resolvedName}</span>
                          <Badge variant="outline" className="text-xs">{formatHours(emp.csvTotalHours)} hrs</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {(["all", "discrepancy", "matched", "unmatched"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={filterStatus === status ? "default" : "outline"}
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === "all" ? "All" : status === "discrepancy" ? "Discrepancies" : status === "matched" ? "Matched" : "Unmatched"}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => setCsvData(null)}>
                Upload New CSV
              </Button>
            </div>

            {/* Comparison Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <SortHeader field="name">Employee</SortHeader>
                        <SortHeader field="csvHours">CSV Hours</SortHeader>
                        <SortHeader field="dbHours">DB Hours</SortHeader>
                        <SortHeader field="difference">Variance</SortHeader>
                        <TableHead>DB Accrued</TableHead>
                        <TableHead>Expected Accrual</TableHead>
                        <SortHeader field="accrualDiff">Accrual Diff</SortHeader>
                        <TableHead>Status</TableHead>
                        <TableHead>Locations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row, idx) => {
                        const hoursDiff = row.csvTotalHours - row.dbTotalHours;
                        const hasDiscrepancy = Math.abs(hoursDiff) > 5;
                        const accrualDiffAbs = Math.abs(row.accrualDifference);

                        return (
                          <TableRow key={row.resolvedName} className={hasDiscrepancy ? "bg-warning/5" : ""}>
                            <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium text-sm">{row.resolvedName}</span>
                                {row.csvName && row.csvName !== row.resolvedName && (
                                  <span className="block text-xs text-muted-foreground">CSV: {row.csvName}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{formatHours(row.csvTotalHours)}</TableCell>
                            <TableCell className="font-mono text-sm">{formatHours(row.dbTotalHours)}</TableCell>
                            <TableCell>
                              <span className={`font-mono text-sm font-medium ${Math.abs(hoursDiff) > 5 ? "text-warning" : "text-success"}`}>
                                {hoursDiff > 0 ? "+" : ""}{formatHours(hoursDiff)}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{formatHours(row.dbAccrued)}</TableCell>
                            <TableCell className="font-mono text-sm">{formatHours(row.expectedAccrual)}</TableCell>
                            <TableCell>
                              <span className={`font-mono text-sm font-medium ${accrualDiffAbs > 1 ? "text-warning" : "text-success"}`}>
                                {row.accrualDifference > 0 ? "+" : ""}{formatHours(row.accrualDifference)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {!row.matched ? (
                                <Badge variant="destructive" className="text-xs">Unmatched</Badge>
                              ) : hasDiscrepancy ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-xs text-warning border-warning/50">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Check
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Hours differ by {formatHours(Math.abs(hoursDiff))}</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Badge variant="outline" className="text-xs text-success border-success/50">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  OK
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {row.sections.map((s) => (
                                  <Badge key={s} variant="secondary" className="text-[10px] px-1">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            No results found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
