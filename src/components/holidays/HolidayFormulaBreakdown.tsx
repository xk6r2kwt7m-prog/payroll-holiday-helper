import { useState } from "react";
import { X, Calculator, Lock, ArrowRight, Database, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatHours, formatCurrency, UK_HOLIDAY_LAW } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";

interface PeriodDetail {
  periodId: string;
  periodName: string;
  hoursWorked: number;
  importedHours: number | null;
  accrualRate: number;
  accrued: number;
  taken: number;
  paid: number;
  isCorrected: boolean;
  isExcluded: boolean;
}

interface AdjustmentDetail {
  type: string;
  hours: number;
  reason: string;
  date: string;
}

export interface FormulaBreakdownData {
  employeeName: string;
  department: string;
  year: number;
  // Accrual chain
  periodDetails: PeriodDetail[];
  adjustments: AdjustmentDetail[];
  // Summary
  totalAccrued: number;
  totalTaken: number;
  totalPaid: number;
  carryOver: number;
  balance: number;
  carryOverSource: string; // e.g. "2024 ending balance"
}

interface HolidayFormulaBreakdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: FormulaBreakdownData | null;
}

export function HolidayFormulaBreakdown({ open, onOpenChange, data }: HolidayFormulaBreakdownProps) {
  if (!data) return null;

  const accrualPeriods = data.periodDetails.filter(p => !p.isExcluded);
  const excludedPeriods = data.periodDetails.filter(p => p.isExcluded);
  const totalFromPeriods = accrualPeriods.reduce((s, p) => s + p.accrued, 0);
  const totalFromAdjustments = data.adjustments
    .filter(a => a.type === "accrued")
    .reduce((s, a) => s + a.hours, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculation Breakdown
          </SheetTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{data.employeeName}</span>
            <Badge variant="secondary" className="text-xs">{data.department}</Badge>
            <Badge variant="outline" className="text-xs">{data.year} Leave Year</Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Lock Notice */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
            <Lock className="h-4 w-4 text-warning shrink-0" />
            <span>
              All values are <strong>read-only</strong>. No changes will be made without your explicit Admin approval.
              Data sourced from locked payroll entries.
            </span>
          </div>

          {/* STEP 1: Accrual from Payroll Periods */}
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              Holiday Accrual from Payroll
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr,auto,auto,auto] gap-0 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-2 border-b border-border">
                <span>Period</span>
                <span className="text-right w-20">Hours</span>
                <span className="text-right w-16">× Rate</span>
                <span className="text-right w-20">= Accrued</span>
              </div>
              {accrualPeriods.map((p, i) => (
                <div
                  key={p.periodId + i}
                  className={cn(
                    "grid grid-cols-[1fr,auto,auto,auto] gap-0 text-xs px-3 py-2",
                    i !== accrualPeriods.length - 1 && "border-b border-border/50"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground">{p.periodName}</span>
                    {p.isCorrected && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-warning/50 text-warning">Corrected</Badge>
                    )}
                  </div>
                  <span className="text-right w-20 text-muted-foreground font-mono">
                    {formatHours(p.importedHours ?? p.hoursWorked)}
                    {p.importedHours !== null && (
                      <span className="text-[9px] block text-muted-foreground/60">imported</span>
                    )}
                  </span>
                  <span className="text-right w-16 text-muted-foreground font-mono">
                    {(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}%
                  </span>
                  <span className="text-right w-20 font-mono font-medium text-success">
                    {formatHours(p.accrued)}
                  </span>
                </div>
              ))}
              {/* Total row */}
              <div className="grid grid-cols-[1fr,auto,auto,auto] gap-0 text-xs px-3 py-2 bg-muted/30 border-t border-border font-medium">
                <span className="text-foreground">Sum from payroll</span>
                <span className="text-right w-20"></span>
                <span className="text-right w-16"></span>
                <span className="text-right w-20 font-mono text-success">{formatHours(totalFromPeriods)}</span>
              </div>
            </div>

            {/* Excluded periods */}
            {excludedPeriods.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground/70">
                <p className="font-medium mb-1">Excluded (replaced by corrected version):</p>
                {excludedPeriods.map(p => (
                  <span key={p.periodId} className="inline-block mr-2 line-through">{p.periodName}</span>
                ))}
              </div>
            )}
          </section>

          {/* STEP 2: Adjustments */}
          {data.adjustments.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                Manual Adjustments
              </h3>
              <div className="space-y-2">
                {data.adjustments.map((adj, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                    <div>
                      <span className="font-medium text-foreground capitalize">{adj.type}</span>
                      <span className="text-muted-foreground ml-2">{adj.reason}</span>
                      <span className="text-muted-foreground/60 ml-2">({adj.date})</span>
                    </div>
                    <span className={cn("font-mono font-medium", adj.hours >= 0 ? "text-success" : "text-destructive")}>
                      {adj.hours >= 0 ? "+" : ""}{formatHours(adj.hours)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* STEP 3: Carry Over */}
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {data.adjustments.length > 0 ? "3" : "2"}
              </span>
              Carry Over
            </h3>
            <div className="rounded-lg border border-border px-3 py-2 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">From {data.carryOverSource}</span>
              </div>
              <span className="font-mono font-medium text-blue-600">{formatHours(data.carryOver)}</span>
            </div>
          </section>

          <Separator />

          {/* FINAL FORMULA */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Final Balance Formula
            </h3>
            <div className="rounded-lg bg-muted/50 border border-border p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Accrued from payroll</span>
                <span className="text-success font-medium">{formatHours(totalFromPeriods)}</span>
              </div>
              {totalFromAdjustments !== 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">+ Adjustments (accrued)</span>
                  <span className="text-success font-medium">+{formatHours(totalFromAdjustments)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">+ Carry over</span>
                <span className="text-blue-600 font-medium">+{formatHours(data.carryOver)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">− Hours taken</span>
                <span className="text-primary font-medium">−{formatHours(data.totalTaken)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-foreground">= Balance</span>
                <span className={cn(data.balance >= 0 ? "text-success" : "text-destructive")}>
                  {formatHours(data.balance)} hrs
                </span>
              </div>
            </div>

            {/* Total Paid */}
            <div className="mt-3 rounded-lg border border-border px-3 py-2 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Total holiday pay disbursed</span>
              <span className="font-semibold text-foreground">{formatCurrency(data.totalPaid)}</span>
            </div>
          </section>

          {/* Data provenance */}
          <div className="text-[10px] text-muted-foreground/60 space-y-0.5">
            <p>• Accrual rate: {(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}% per UK Working Time Regulations 1998</p>
            <p>• Source priority: imported_hours (if available) → timesheet_hours</p>
            <p>• Corrected periods replace originals — no double-counting</p>
            <p>• Carry-over chains propagate year-to-year from closing balances</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
