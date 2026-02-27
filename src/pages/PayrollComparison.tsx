import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// CSV aggregated data (26 Jan – 22 Feb 2026) from the uploaded timesheet
const csvData: Record<string, { hours: number; locations: string }> = {
  "Arun Kumar": { hours: 68.22 + 37.95 + 99.87, locations: "Brixton BOH: 68.22h, Kitchen: 37.95h, Carnaby BOH: 99.87h" },
  "Rithwik Godishala": { hours: 66.30 + 111.79 + 5.42, locations: "Brixton BOH: 66.30h, Kitchen: 111.79h, Carnaby BOH: 5.42h" },
  "Sai": { hours: 64.96 + 154.54, locations: "Brixton BOH: 64.96h, Carnaby BOH: 154.54h" },
  "Benjamin": { hours: 5.00 + 7.92 + 13.32, locations: "Brixton FOH: 5.00h, Fitzrovia FOH: 7.92h, Carnaby FOH: 13.32h" },
  "kiara": { hours: 8.00 + 33.70 + 24.20, locations: "Brixton FOH: 8.00h, Fitzrovia FOH: 33.70h, Carnaby FOH: 24.20h" },
  "maria": { hours: 55.80 + 4.38, locations: "Brixton FOH: 55.80h, Carnaby FOH: 4.38h" },
  "Ruben": { hours: 153.93 + 9.70, locations: "Brixton FOH: 153.93h, Carnaby FOH: 9.70h" },
  "Ada": { hours: 107.78, locations: "Kitchen: 107.78h" },
  "Antonela": { hours: 39.48 + 19.42, locations: "Kitchen: 39.48h, Carnaby BOH: 19.42h" },
  "Aris Feliz": { hours: 66.49 + 62.18, locations: "Kitchen: 66.49h, Carnaby BOH: 62.18h" },
  "Heidy": { hours: 10.05 + 88.24, locations: "Kitchen: 10.05h, Carnaby BOH: 88.24h" },
  "Luisa Valenzuela": { hours: 62.32, locations: "Kitchen: 62.32h" },
  "Nishanth Thota": { hours: 37.70 + 97.00, locations: "Kitchen: 37.70h, Carnaby BOH: 97.00h" },
  "Sultan": { hours: 167.61 + 50.60, locations: "Kitchen: 167.61h, Carnaby BOH: 50.60h" },
  "Afonso": { hours: 116.90, locations: "Fitzrovia FOH: 116.90h" },
  "Daniela": { hours: 107.14, locations: "Fitzrovia FOH: 107.14h" },
  "Karl": { hours: 98.83 + 43.00, locations: "Fitzrovia FOH: 98.83h, Carnaby FOH: 43.00h" },
  "Lissette": { hours: 92.07, locations: "Fitzrovia FOH: 92.07h" },
  "Vicky": { hours: 94.28, locations: "Fitzrovia FOH: 94.28h" },
  "Wakako": { hours: 8.30, locations: "Fitzrovia FOH: 8.30h" },
  "Fatima": { hours: 173.80, locations: "CPU: 173.80h" },
  "Jie-En": { hours: 38.44, locations: "CPU: 38.44h" },
  "Joselin Chala": { hours: 68.99 + 12.90, locations: "CPU: 68.99h, Carnaby BOH: 12.90h" },
  "kitty": { hours: 146.72, locations: "CPU: 146.72h" },
  "Ling chak": { hours: 150.42, locations: "CPU: 150.42h" },
  "Nairobis De los Sant": { hours: 78.98, locations: "CPU: 78.98h" },
  "Rehana": { hours: 44.58 + 16.75, locations: "CPU: 44.58h, Carnaby BOH: 16.75h" },
  "SAM": { hours: 18.36, locations: "CPU: 18.36h" },
  "Sreeja": { hours: 33.81, locations: "CPU: 33.81h" },
  "Varsha": { hours: 93.66, locations: "CPU: 93.66h" },
  "Wing Lee": { hours: 149.26, locations: "CPU: 149.26h" },
  "Adriana Baca": { hours: 48.11, locations: "Carnaby BOH: 48.11h" },
  "Hafiz Abdur Rahim": { hours: 157.80, locations: "Carnaby BOH: 157.80h" },
  "Angel": { hours: 29.01, locations: "Carnaby FOH: 29.01h" },
  "Kazumi": { hours: 28.58, locations: "Carnaby FOH: 28.58h" },
  "Marco": { hours: 230.70, locations: "Carnaby FOH: 230.70h" },
  "Steven": { hours: 162.09, locations: "Carnaby FOH: 162.09h" },
  "Salma Laroussi": { hours: 68.44, locations: "Carnaby FOH: 68.44h (+ 7.50h unpaid leave)" },
};

// DB data for February 2026 period
const dbData: { name: string; department: string; hours: number; rate: number; sc: number; perf: number; spec: number; total: number; notes: string }[] = [
  { name: "Afonso Gomes", department: "FOH", hours: 139.48, rate: 11.00, sc: 1.00, perf: 50, spec: 0, total: 1723.76, notes: "Fitzrovia FOH" },
  { name: "Benjamin Gray", department: "FOH", hours: 26.24, rate: 12.00, sc: 1.50, perf: 0, spec: 0, total: 354.24, notes: "" },
  { name: "Daniela Patricia Da Costa Almeida", department: "FOH", hours: 132.09, rate: 11.50, sc: 1.50, perf: 50, spec: 0, total: 1767.17, notes: "Fitzrovia FOH" },
  { name: "Iara Maria Moniz Ferreira", department: "FOH", hours: 76.18, rate: 9.00, sc: 1.00, perf: 0, spec: 0, total: 761.80, notes: "Brixton + Carnaby" },
  { name: "Karl Ted Ledesma", department: "FOH", hours: 160.69, rate: 12.50, sc: 1.00, perf: 0, spec: 0, total: 2169.32, notes: "Fitzrovia + Carnaby" },
  { name: "Kazumi Ortega", department: "FOH", hours: 67.22, rate: 12.21, sc: 1.00, perf: 0, spec: 0, total: 887.98, notes: "Carnaby FOH" },
  { name: "Kiara Plaku", department: "FOH", hours: 66.59, rate: 11.00, sc: 1.00, perf: 0, spec: 0, total: 799.08, notes: "Fitzrovia + Carnaby" },
  { name: "Lissette Paredes", department: "FOH", hours: 133.65, rate: 12.21, sc: 4.00, perf: 90, spec: 0, total: 2256.47, notes: "Fitzrovia FOH" },
  { name: "Marco Ribeiro", department: "FOH", hours: 272.62, rate: 13.00, sc: 3.00, perf: 150, spec: 0, total: 4511.92, notes: "Carnaby FOH" },
  { name: "Rubem Pereira", department: "FOH", hours: 212.79, rate: 13.00, sc: 2.00, perf: 130, spec: 0, total: 3321.85, notes: "Brixton + Fitzrovia + Carnaby" },
  { name: "Salma Laroussi Beniiche", department: "FOH", hours: 68.44, rate: 11.00, sc: 1.00, perf: 0, spec: 0, total: 821.28, notes: "Carnaby FOH" },
  { name: "Steven Cumba", department: "FOH", hours: 201.36, rate: 12.50, sc: 1.50, perf: 50, spec: 0, total: 2869.04, notes: "Carnaby FOH" },
  { name: "Tiffany Antonela Bucheli Rubio", department: "FOH", hours: 58.90, rate: 12.50, sc: 1.00, perf: 0, spec: 0, total: 795.15, notes: "Kitchen + Carnaby BOH" },
  { name: "Viktoriia Bastrakova", department: "FOH", hours: 115.30, rate: 12.21, sc: 2.00, perf: 120, spec: 0, total: 1758.41, notes: "Fitzrovia FOH" },
  { name: "Wakako Ashida", department: "FOH", hours: 27.02, rate: 12.50, sc: 1.00, perf: 0, spec: 0, total: 364.77, notes: "Fitzrovia + Carnaby" },
  { name: "Yat Chun Wong", department: "FOH", hours: 29.01, rate: 12.50, sc: 1.00, perf: 0, spec: 0, total: 391.64, notes: "Carnaby FOH" },
  { name: "Ada Feliz", department: "BOH", hours: 100.00, rate: 12.21, sc: 3.00, perf: 120, spec: 0, total: 1641.00, notes: "Kitchen" },
  { name: "Adriana Baca", department: "BOH", hours: 66.64, rate: 12.21, sc: 2.00, perf: 0, spec: 0, total: 946.95, notes: "Carnaby BOH" },
  { name: "Arisnorky Feliz", department: "BOH", hours: 152.05, rate: 12.21, sc: 2.00, perf: 0, spec: 0, total: 2160.63, notes: "Kitchen + Carnaby BOH" },
  { name: "Arun Thota", department: "BOH", hours: 250.53, rate: 12.21, sc: 1.00, perf: 0, spec: 0, total: 3309.50, notes: "Brixton + Kitchen + Carnaby" },
  { name: "Hafiz Rahim", department: "BOH", hours: 205.71, rate: 14.50, sc: 0.50, perf: 100, spec: 0, total: 3185.65, notes: "Carnaby BOH" },
  { name: "Heidy Ramos", department: "BOH", hours: 98.29, rate: 12.21, sc: 1.50, perf: 0, spec: 0, total: 1347.54, notes: "Kitchen + Carnaby BOH" },
  { name: "Luisa Valenzuela", department: "BOH", hours: 62.32, rate: 12.21, sc: 1.50, perf: 0, spec: 0, total: 855.01, notes: "Kitchen" },
  { name: "Nishanth Thota", department: "BOH", hours: 134.70, rate: 12.21, sc: 0.56, perf: 0, spec: 0, total: 1718.90, notes: "Kitchen + Carnaby BOH" },
  { name: "Rithwik Godishala", department: "BOH", hours: 183.51, rate: 12.21, sc: 0.50, perf: 0, spec: 0, total: 2334.83, notes: "Brixton + Kitchen + Carnaby" },
  { name: "Saicharan Manepalli", department: "BOH", hours: 219.50, rate: 14.50, sc: 0, perf: 150, spec: 0, total: 3332.75, notes: "Brixton + Carnaby" },
  { name: "Sultan Al Mabrur", department: "BOH", hours: 218.21, rate: 12.21, sc: 1.50, perf: 120, spec: 0, total: 3113.71, notes: "Kitchen + Carnaby" },
  { name: "Fatima Ashraf", department: "CPU", hours: 173.80, rate: 12.21, sc: 0, perf: 0, spec: 80, total: 2202.20, notes: "CPU" },
  { name: "Jie En Loh", department: "CPU", hours: 38.44, rate: 9.00, sc: 1.00, perf: 0, spec: 0, total: 384.40, notes: "CPU" },
  { name: "Jocelyne Chala", department: "CPU", hours: 81.89, rate: 12.21, sc: 1.56, perf: 0, spec: 0, total: 1126.79, notes: "CPU + Carnaby BOH" },
  { name: "Kitty Oil Lan", department: "CPU", hours: 146.72, rate: 12.21, sc: 0, perf: 0, spec: 80, total: 1871.25, notes: "CPU" },
  { name: "Ling Chak", department: "CPU", hours: 150.42, rate: 12.21, sc: 0, perf: 0, spec: 80, total: 1916.63, notes: "CPU" },
  { name: "Nairobys De los Santos", department: "CPU", hours: 78.98, rate: 12.21, sc: 1.00, perf: 0, spec: 30, total: 1073.64, notes: "CPU" },
  { name: "Rheana Rahim", department: "CPU", hours: 61.33, rate: 12.21, sc: 0, perf: 0, spec: 0, total: 748.84, notes: "CPU + Carnaby BOH" },
  { name: "Samnath Thembareni", department: "CPU", hours: 18.36, rate: 12.50, sc: 0.50, perf: 0, spec: 0, total: 238.68, notes: "CPU" },
  { name: "Sreeja Vadlapudi", department: "CPU", hours: 159.79, rate: 12.21, sc: 0.50, perf: 80, spec: 0, total: 2112.49, notes: "CPU + Carnaby BOH" },
  { name: "Varsha Kumari", department: "CPU", hours: 93.66, rate: 12.21, sc: 0.50, perf: 0, spec: 0, total: 1191.24, notes: "CPU" },
  { name: "Wing Wing", department: "CPU", hours: 149.26, rate: 12.21, sc: 2.00, perf: 80, spec: 0, total: 2195.63, notes: "CPU" },
];

// Name mapping: CSV name -> DB name
const nameMap: Record<string, string> = {
  "Arun Kumar": "Arun Thota",
  "Rithwik Godishala": "Rithwik Godishala",
  "Sai": "Saicharan Manepalli",
  "Benjamin": "Benjamin Gray",
  "kiara": "Kiara Plaku",
  "maria": "Iara Maria Moniz Ferreira",
  "Ruben": "Rubem Pereira",
  "Ada": "Ada Feliz",
  "Antonela": "Tiffany Antonela Bucheli Rubio",
  "Aris Feliz": "Arisnorky Feliz",
  "Heidy": "Heidy Ramos",
  "Luisa Valenzuela": "Luisa Valenzuela",
  "Nishanth Thota": "Nishanth Thota",
  "Sultan": "Sultan Al Mabrur",
  "Afonso": "Afonso Gomes",
  "Daniela": "Daniela Patricia Da Costa Almeida",
  "Karl": "Karl Ted Ledesma",
  "Lissette": "Lissette Paredes",
  "Vicky": "Viktoriia Bastrakova",
  "Wakako": "Wakako Ashida",
  "Fatima": "Fatima Ashraf",
  "Jie-En": "Jie En Loh",
  "Joselin Chala": "Jocelyne Chala",
  "kitty": "Kitty Oil Lan",
  "Ling chak": "Ling Chak",
  "Nairobis De los Sant": "Nairobys De los Santos",
  "Rehana": "Rheana Rahim",
  "SAM": "Samnath Thembareni",
  "Sreeja": "Sreeja Vadlapudi",
  "Varsha": "Varsha Kumari",
  "Wing Lee": "Wing Wing",
  "Adriana Baca": "Adriana Baca",
  "Hafiz Abdur Rahim": "Hafiz Rahim",
  "Angel": "Yat Chun Wong",
  "Kazumi": "Kazumi Ortega",
  "Marco": "Marco Ribeiro",
  "Steven": "Steven Cumba",
  "Salma Laroussi": "Salma Laroussi Beniiche",
};

type SortField = "name" | "csvHours" | "dbHours" | "diff" | "diffPct";

const PayrollComparison = () => {
  const [sortField, setSortField] = useState<SortField>("diffPct");
  const [sortAsc, setSortAsc] = useState(false);

  const comparisonRows = useMemo(() => {
    const rows: {
      csvName: string;
      dbName: string;
      department: string;
      csvHours: number;
      dbHours: number;
      diff: number;
      diffPct: number;
      locations: string;
      rate: number;
      overpayment: number;
    }[] = [];

    for (const [csvName, csv] of Object.entries(csvData)) {
      const dbName = nameMap[csvName];
      const db = dbName ? dbData.find((d) => d.name === dbName) : undefined;
      if (db) {
        const diff = db.hours - csv.hours;
        const diffPct = csv.hours > 0 ? (diff / csv.hours) * 100 : 0;
        rows.push({
          csvName,
          dbName: db.name,
          department: db.department,
          csvHours: csv.hours,
          dbHours: db.hours,
          diff,
          diffPct,
          locations: csv.locations,
          rate: db.rate + db.sc,
          overpayment: diff * (db.rate + db.sc),
        });
      }
    }

    rows.sort((a, b) => {
      let valA: number | string, valB: number | string;
      switch (sortField) {
        case "name": valA = a.dbName; valB = b.dbName; break;
        case "csvHours": valA = a.csvHours; valB = b.csvHours; break;
        case "dbHours": valA = a.dbHours; valB = b.dbHours; break;
        case "diff": valA = Math.abs(a.diff); valB = Math.abs(b.diff); break;
        case "diffPct": valA = Math.abs(a.diffPct); valB = Math.abs(b.diffPct); break;
      }
      if (typeof valA === "string") return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      return sortAsc ? valA - (valB as number) : (valB as number) - valA;
    });

    return rows;
  }, [sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const totalCsvHours = comparisonRows.reduce((s, r) => s + r.csvHours, 0);
  const totalDbHours = comparisonRows.reduce((s, r) => s + r.dbHours, 0);
  const totalOverpayment = comparisonRows.reduce((s, r) => s + r.overpayment, 0);
  const matchCount = comparisonRows.filter((r) => Math.abs(r.diff) < 1).length;
  const mismatchCount = comparisonRows.filter((r) => Math.abs(r.diff) >= 1).length;

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground" onClick={() => toggleSort(field)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">February 2026 Payroll — Hour Comparison</h1>
        <p className="text-muted-foreground">CSV Timesheet (26 Jan – 22 Feb) vs Database Payroll Entries</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CSV Total Hours</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalCsvHours.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">DB Total Hours</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalDbHours.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Matches / Mismatches</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              <span className="text-green-600">{matchCount}</span> / <span className="text-red-600">{mismatchCount}</span>
            </p>
          </CardContent>
        </Card>
        <Card className={totalOverpayment > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Est. Overpayment</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">£{totalOverpayment.toFixed(2)}</p></CardContent>
        </Card>
      </div>

      {/* Note about period dates */}
      <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Period Date Mismatch</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                The DB period starts <strong>Jan 19</strong> but the CSV starts <strong>Jan 26</strong>. 
                This extra week (Jan 19–25) likely accounts for most hour differences. 
                You need to recover the overpaid hours from employees.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead><SortBtn field="name" label="Employee" /></TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead className="text-right"><SortBtn field="csvHours" label="CSV Hours" /></TableHead>
                  <TableHead className="text-right"><SortBtn field="dbHours" label="DB Hours" /></TableHead>
                  <TableHead className="text-right"><SortBtn field="diff" label="Diff (h)" /></TableHead>
                  <TableHead className="text-right"><SortBtn field="diffPct" label="Diff %" /></TableHead>
                  <TableHead className="text-right">Rate+SC</TableHead>
                  <TableHead className="text-right">Over/Under £</TableHead>
                  <TableHead>CSV Location Breakdown</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => {
                  const isMatch = Math.abs(row.diff) < 1;
                  const isLarge = Math.abs(row.diff) >= 10;
                  return (
                    <TableRow key={row.dbName} className={isLarge ? "bg-red-50 dark:bg-red-950/20" : ""}>
                      <TableCell>
                        <div className="font-medium">{row.dbName}</div>
                        {row.csvName !== row.dbName && (
                          <div className="text-xs text-muted-foreground">CSV: {row.csvName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{row.department}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{row.csvHours.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{row.dbHours.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={row.diff > 1 ? "text-red-600 font-bold" : row.diff < -1 ? "text-blue-600 font-bold" : "text-green-600"}>
                          {row.diff > 0 ? "+" : ""}{row.diff.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {isMatch ? (
                          <CheckCircle className="h-4 w-4 text-green-600 inline" />
                        ) : (
                          <span className={isLarge ? "text-red-600 font-bold" : "text-amber-600"}>
                            {row.diffPct > 0 ? "+" : ""}{row.diffPct.toFixed(1)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">£{row.rate.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={row.overpayment > 5 ? "text-red-600 font-bold" : row.overpayment < -5 ? "text-blue-600 font-bold" : ""}>
                          {row.overpayment > 0 ? "+" : ""}£{row.overpayment.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[250px]">{row.locations}</TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="border-t-2 font-bold bg-muted/30">
                  <TableCell>TOTAL ({comparisonRows.length} employees)</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-mono">{totalCsvHours.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{totalDbHours.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">+{(totalDbHours - totalCsvHours).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-600">+{(((totalDbHours - totalCsvHours) / totalCsvHours) * 100).toFixed(1)}%</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-mono text-red-600">+£{totalOverpayment.toFixed(2)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollComparison;
