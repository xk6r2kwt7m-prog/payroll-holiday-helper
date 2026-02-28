import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePayrollAudit, type AuditFinding, type AuditSeverity } from "@/hooks/usePayrollAudit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, ShieldAlert, ShieldX, RefreshCw, CheckCircle, AlertTriangle,
  XCircle, Calculator, Calendar, DollarSign, Users, Loader2, ChevronDown, ChevronUp, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

const severityConfig: Record<AuditSeverity, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  pass: { icon: <CheckCircle className="h-4 w-4" />, color: "text-success", bg: "bg-success/10", label: "Pass" },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-warning", bg: "bg-warning/10", label: "Warning" },
  error: { icon: <XCircle className="h-4 w-4" />, color: "text-destructive", bg: "bg-destructive/10", label: "Error" },
};

const categoryConfig = {
  calculation: { label: "Payroll Calculations", icon: <Calculator className="h-5 w-5" />, description: "Verifies (hours × rate) + (hours × service_charge) + bonuses = total_pay" },
  holiday: { label: "Holiday Reconciliation", icon: <Calendar className="h-5 w-5" />, description: "Verifies accruals (12.07%), balances, and taken hours match" },
  totals: { label: "Period Totals", icon: <DollarSign className="h-5 w-5" />, description: "Verifies entries + holidays = grand_total on each period" },
  duplicates: { label: "Duplicate Detection", icon: <Users className="h-5 w-5" />, description: "Detects employees in overlapping periods or duplicated entries" },
};

function HealthScoreRing({ score }: { score: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "hsl(var(--success))" : score >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function FindingRow({ finding }: { finding: AuditFinding }) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[finding.severity];

  return (
    <div className={`rounded-lg border border-border p-3 ${config.bg} cursor-pointer`} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center gap-3">
        <span className={config.color}>{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-card-foreground">{finding.title}</p>
          {!expanded && (
            <p className="text-xs text-muted-foreground truncate">{finding.detail}</p>
          )}
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          {categoryConfig[finding.category].label}
        </Badge>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
          <p className="text-sm text-card-foreground">{finding.detail}</p>
          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
            {finding.expected !== undefined && <span>Expected: <strong>{finding.expected.toFixed(2)}</strong></span>}
            {finding.actual !== undefined && <span>Actual: <strong>{finding.actual.toFixed(2)}</strong></span>}
            {finding.difference !== undefined && <span>Diff: <strong className={config.color}>{finding.difference.toFixed(2)}</strong></span>}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({ category, stats }: {
  category: keyof typeof categoryConfig;
  stats: { passed: number; warnings: number; errors: number };
}) {
  const config = categoryConfig[category];
  const total = stats.passed + stats.warnings + stats.errors;
  const isClean = stats.errors === 0 && stats.warnings === 0;

  return (
    <Card className={isClean ? "border-success/30" : stats.errors > 0 ? "border-destructive/30" : "border-warning/30"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={isClean ? "text-success" : stats.errors > 0 ? "text-destructive" : "text-warning"}>
              {config.icon}
            </span>
            <CardTitle className="text-sm font-semibold">{config.label}</CardTitle>
          </div>
          {isClean ? (
            <Badge className="bg-success/10 text-success border-0">All Clear</Badge>
          ) : (
            <Badge variant="destructive" className="border-0">{stats.errors + stats.warnings} issues</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">{config.description}</p>
        <div className="flex gap-4 text-xs">
          <span className="text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {stats.passed} passed</span>
          <span className="text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {stats.warnings} warnings</span>
          <span className="text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> {stats.errors} errors</span>
        </div>
        {total > 0 && (
          <div className="mt-2 h-2 rounded-full bg-muted flex overflow-hidden">
            <div className="bg-success h-full" style={{ width: `${(stats.passed / total) * 100}%` }} />
            <div className="bg-warning h-full" style={{ width: `${(stats.warnings / total) * 100}%` }} />
            <div className="bg-destructive h-full" style={{ width: `${(stats.errors / total) * 100}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const PayrollAudit = () => {
  const { data: audit, isLoading, refetch, isFetching } = usePayrollAudit();
  const [activeTab, setActiveTab] = useState("all");

  const filteredFindings = audit?.findings.filter(f => {
    if (activeTab === "all") return true;
    if (activeTab === "errors") return f.severity === "error";
    if (activeTab === "warnings") return f.severity === "warning";
    return f.category === activeTab;
  }) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll & Holiday Audit</h1>
            <p className="text-muted-foreground">
              Comprehensive mathematical verification of all payroll and holiday data
            </p>
          </div>
          <Button onClick={() => refetch()} disabled={isFetching} variant="outline">
            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Run Audit
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Running audit checks...</span>
          </div>
        ) : audit ? (
          <>
            {/* Summary Row */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-[auto_1fr]">
              <Card className="flex items-center justify-center p-6">
                <div className="text-center">
                  <HealthScoreRing score={audit.summary.healthScore} />
                  <p className="text-sm font-medium text-card-foreground mt-2">Health Score</p>
                  <p className="text-xs text-muted-foreground">
                    {audit.summary.totalChecks} checks performed
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Last run: {new Date(audit.timestamp).toLocaleTimeString("en-GB")}
                  </p>
                </div>
              </Card>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <CategoryCard category="calculation" stats={audit.categories.calculation} />
                <CategoryCard category="holiday" stats={audit.categories.holiday} />
                <CategoryCard category="totals" stats={audit.categories.totals} />
                <CategoryCard category="duplicates" stats={audit.categories.duplicates} />
              </div>
            </div>

            {/* Overall status banner */}
            {audit.summary.errors === 0 && audit.summary.warnings === 0 ? (
              <div className="rounded-xl bg-success/10 border border-success/20 p-5 flex items-center gap-4">
                <ShieldCheck className="h-8 w-8 text-success" />
                <div>
                  <p className="font-semibold text-success">All Checks Passed</p>
                  <p className="text-sm text-muted-foreground">
                    {audit.summary.totalChecks} checks verified with zero discrepancies. Payroll and holiday data is mathematically consistent.
                  </p>
                </div>
              </div>
            ) : audit.summary.errors > 0 ? (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-5 flex items-center gap-4">
                <ShieldX className="h-8 w-8 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">{audit.summary.errors} Error{audit.summary.errors > 1 ? "s" : ""} Found</p>
                  <p className="text-sm text-muted-foreground">
                    Critical discrepancies detected that require immediate attention. {audit.summary.warnings > 0 && `Plus ${audit.summary.warnings} warning(s).`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-warning/10 border border-warning/20 p-5 flex items-center gap-4">
                <ShieldAlert className="h-8 w-8 text-warning" />
                <div>
                  <p className="font-semibold text-warning">{audit.summary.warnings} Warning{audit.summary.warnings > 1 ? "s" : ""}</p>
                  <p className="text-sm text-muted-foreground">
                    Minor discrepancies found. Review before approving payroll.
                  </p>
                </div>
              </div>
            )}

            {/* Findings Detail */}
            {audit.findings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Audit Findings</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4 flex-wrap h-auto gap-1">
                      <TabsTrigger value="all">
                        All ({audit.findings.length})
                      </TabsTrigger>
                      <TabsTrigger value="errors" className="text-destructive">
                        Errors ({audit.summary.errors})
                      </TabsTrigger>
                      <TabsTrigger value="warnings" className="text-warning">
                        Warnings ({audit.summary.warnings})
                      </TabsTrigger>
                      <TabsTrigger value="calculation">Calculations</TabsTrigger>
                      <TabsTrigger value="holiday">Holiday</TabsTrigger>
                      <TabsTrigger value="totals">Totals</TabsTrigger>
                      <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
                    </TabsList>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {filteredFindings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                          <p>No issues found in this category</p>
                        </div>
                      ) : (
                        filteredFindings.map(finding => (
                          <FindingRow key={finding.id} finding={finding} />
                        ))
                      )}
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default PayrollAudit;
