import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import payroll2022 from "@/data/payroll_2022_extracted.json";
import payroll2023 from "@/data/payroll_2023_extracted.json";

interface ImportResult {
  periodsCreated: number;
  entriesCreated: number;
  holidaysCreated: number;
  employeesCreated: number;
  unmatchedEntries: string[];
  unmatchedHolidays: string[];
  errors: string[];
}

export function HistoricalImport() {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setResults(null);

    const allPeriods = [
      ...(payroll2022 as any).periods,
      ...(payroll2023 as any).periods,
    ];

    const combined: ImportResult = {
      periodsCreated: 0,
      entriesCreated: 0,
      holidaysCreated: 0,
      employeesCreated: 0,
      unmatchedEntries: [],
      unmatchedHolidays: [],
      errors: [],
    };

    try {
      // Send in batches of 2 periods to avoid timeout
      for (let i = 0; i < allPeriods.length; i += 2) {
        const batch = allPeriods.slice(i, i + 2);
        const names = batch.map((p: any) => p.period_name).join(", ");
        setProgress(`Importing ${names}... (${i + 1}-${Math.min(i + 2, allPeriods.length)} of ${allPeriods.length})`);

        const { data, error: fnError } = await supabase.functions.invoke(
          "import-historical-payroll",
          { body: { periods: batch } }
        );

        if (fnError) {
          combined.errors.push(`Batch error (${names}): ${fnError.message}`);
          continue;
        }

        if (data) {
          combined.periodsCreated += data.periodsCreated || 0;
          combined.entriesCreated += data.entriesCreated || 0;
          combined.holidaysCreated += data.holidaysCreated || 0;
          combined.employeesCreated += data.employeesCreated || 0;
          combined.unmatchedEntries.push(...(data.unmatchedEntries || []));
          combined.unmatchedHolidays.push(...(data.unmatchedHolidays || []));
          combined.errors.push(...(data.errors || []));
        }
      }

      setResults(combined);
      if (combined.errors.length === 0) {
        toast.success(`Import complete: ${combined.periodsCreated} periods, ${combined.entriesCreated} entries`);
      } else {
        toast.warning(`Import complete with ${combined.errors.length} warnings`);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error("Import failed");
    } finally {
      setImporting(false);
      setProgress("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Historical Data Import
        </CardTitle>
        <CardDescription>
          Import 2022 &amp; 2023 payroll data from extracted JSON files into the database.
          This populates holiday accruals for those years.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Badge variant="outline">2022: 10 periods</Badge>
          <Badge variant="outline">2023: 12 periods</Badge>
        </div>

        <Button onClick={handleImport} disabled={importing}>
          {importing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {progress || "Importing..."}
            </>
          ) : (
            "Import 2022 & 2023 Data"
          )}
        </Button>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {results.periodsCreated} periods, {results.entriesCreated} entries, {results.holidaysCreated} holiday payments
            </div>
            {results.employeesCreated > 0 && (
              <div className="text-muted-foreground">
                {results.employeesCreated} new employee records created (historical leavers)
              </div>
            )}
            {results.unmatchedEntries.length > 0 && (
              <details className="text-muted-foreground">
                <summary>{results.unmatchedEntries.length} unmatched payroll entries</summary>
                <ul className="ml-4 mt-1 list-disc">
                  {results.unmatchedEntries.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
            {results.unmatchedHolidays.length > 0 && (
              <details className="text-muted-foreground">
                <summary>{results.unmatchedHolidays.length} unmatched holiday payments</summary>
                <ul className="ml-4 mt-1 list-disc">
                  {results.unmatchedHolidays.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
            {results.errors.length > 0 && (
              <details className="text-destructive">
                <summary>{results.errors.length} errors</summary>
                <ul className="ml-4 mt-1 list-disc">
                  {results.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
