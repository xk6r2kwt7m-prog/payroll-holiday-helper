import { useState, useMemo } from "react";
import { FileDown, Printer, ChevronDown, ChevronUp, Settings2, LayoutTemplate, Users, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { PayrollReportConfig, defaultReportConfig, REPORT_PRESETS } from "./PayrollReportConfig";
import { pdf } from "@react-pdf/renderer";
import { PayrollPDF } from "./PayrollPDF";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePayrollEntryLocations } from "@/hooks/usePayrollLocations";

interface PayrollReportBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: any;
  entries: any[];
  holidayPayments: any[];
  allEmployees: any[];
  companyName?: string;
}

const COLUMN_LABELS: Record<keyof PayrollReportConfig["columns"], string> = {
  employeeName: "Employee Name",
  department: "Department",
  location: "Location",
  hourlyRate: "Hourly Rate",
  hoursWorked: "Hours Worked",
  holidayHours: "Holiday Hours",
  bonuses: "Bonuses",
  serviceCharge: "Service Charge",
  timesheetHours: "Timesheet Hours",
  adjustments: "Adjustments",
  totalPay: "Total Pay",
  notes: "Notes",
};

const FINANCIAL_LABELS: Record<keyof PayrollReportConfig["financial"], string> = {
  includeBonuses: "Include Bonuses",
  includeServiceCharge: "Include Service Charge",
  includeAdjustments: "Include Adjustments",
  showGrossTotals: "Show Gross Totals",
  showSummaryTotals: "Show Summary Totals",
  hideFinancialAmounts: "Hide Financial Amounts (HR View)",
};

export function PayrollReportBuilder({
  open,
  onOpenChange,
  period,
  entries,
  holidayPayments,
  allEmployees,
  companyName = "Your Company",
}: PayrollReportBuilderProps) {
  const [config, setConfig] = useState<PayrollReportConfig>({ ...defaultReportConfig });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    preset: true,
    columns: false,
    financial: false,
    scope: false,
    layout: false,
  });
  const [generating, setGenerating] = useState(false);

  // Fetch location data for this period
  const { data: locationData = [] } = usePayrollEntryLocations(period?.id);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = REPORT_PRESETS[presetKey];
    if (preset) {
      setConfig({ ...defaultReportConfig, ...preset.config, columns: { ...defaultReportConfig.columns, ...preset.config.columns }, financial: { ...defaultReportConfig.financial, ...preset.config.financial } });
    }
  };

  const toggleColumn = (key: keyof PayrollReportConfig["columns"]) => {
    setConfig((prev) => ({ ...prev, columns: { ...prev.columns, [key]: !prev.columns[key] } }));
  };

  const toggleFinancial = (key: keyof PayrollReportConfig["financial"]) => {
    setConfig((prev) => ({ ...prev, financial: { ...prev.financial, [key]: !prev.financial[key] } }));
  };

  // Get unique departments from entries
  const departments = useMemo(() => {
    const depts = new Set(entries.map((e: any) => e.employees?.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [entries]);

  // Get unique locations from location data
  const availableLocations = useMemo(() => {
    const locs = new Set(locationData.map(l => l.location_name));
    return Array.from(locs).sort() as string[];
  }, [locationData]);

  // Filter entries based on config
  const filteredEntries = useMemo(() => {
    let result = [...entries];
    if (config.employeeScope === "department" && config.selectedDepartments.length > 0) {
      result = result.filter((e: any) => config.selectedDepartments.includes(e.employees?.department));
    }
    if (config.employeeScope === "location" && config.selectedLocations.length > 0) {
      const employeeIdsAtLocations = new Set(
        locationData
          .filter(l => config.selectedLocations.includes(l.location_name))
          .map(l => l.employee_id)
      );
      result = result.filter((e: any) => employeeIdsAtLocations.has(e.employee_id));
    }
    if (config.employeeScope === "custom" && config.selectedEmployeeIds.length > 0) {
      result = result.filter((e: any) => config.selectedEmployeeIds.includes(e.employee_id));
    }
    return result;
  }, [entries, config.employeeScope, config.selectedDepartments, config.selectedEmployeeIds]);

  const activeColumnCount = Object.values(config.columns).filter(Boolean).length;

  const hasLocationData = locationData.length > 0;

  const handleGeneratePDF = async () => {
    if (!period || filteredEntries.length === 0) return;
    setGenerating(true);
    try {
      toast.info("Generating PDF...");
      const starterEmployees = allEmployees.filter(
        (emp: any) => (emp.status === "starter" || emp.status === "leaver") && filteredEntries.some((e: any) => e.employee_id === emp.id)
      );
      const logoUrl = config.showLogo ? `${window.location.origin}/logo.jpeg` : undefined;
      const blob = await pdf(
        <PayrollPDF
          period={period}
          entries={filteredEntries}
          holidayPayments={holidayPayments}
          starters={starterEmployees}
          isCorrection={!!period.notes?.includes("[CORRECTED]")}
          correctionNote={period.notes?.includes("[CORRECTED]") ? period.notes : undefined}
          logoUrl={logoUrl}
          reportConfig={config}
          companyName={companyName}
          locationData={locationData}
        />
      ).toBlob();

      const fileName = `payroll-${period.period_name.replace(/\s+/g, "-")}.pdf`;
      const file = new File([blob], fileName, { type: "application/pdf" });
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
      } else if (isMobile) {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert([{
        user_id: user?.id || null,
        action: "import" as const,
        table_name: "payroll_periods",
        record_id: period.id,
        new_data: { operation: "pdf_export", period_name: period.period_name, report_config: JSON.parse(JSON.stringify(config)) },
      }]);

      toast.success("PDF downloaded");
      onOpenChange(false);
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!period || filteredEntries.length === 0) return;
    setGenerating(true);
    try {
      const starterEmployees = allEmployees.filter(
        (emp: any) => (emp.status === "starter" || emp.status === "leaver") && filteredEntries.some((e: any) => e.employee_id === emp.id)
      );
      const logoUrl = config.showLogo ? `${window.location.origin}/logo.jpeg` : undefined;
      const blob = await pdf(
        <PayrollPDF
          period={period}
          entries={filteredEntries}
          holidayPayments={holidayPayments}
          starters={starterEmployees}
          isCorrection={!!period.notes?.includes("[CORRECTED]")}
          correctionNote={period.notes?.includes("[CORRECTED]") ? period.notes : undefined}
          logoUrl={logoUrl}
          reportConfig={config}
          companyName={companyName}
          locationData={locationData}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) {
        w.addEventListener("load", () => w.print());
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("Print failed:", error);
      toast.error("Failed to generate PDF for printing");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Settings2 className="h-5 w-5 text-primary" />
            Payroll Report Builder
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {period?.period_name} • {filteredEntries.length} employee{filteredEntries.length !== 1 ? "s" : ""}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
          <div className="p-4 sm:p-6 space-y-3">
            {/* Report Presets */}
            <CollapsibleSection
              title="Report Preset"
              icon={<LayoutTemplate className="h-4 w-4" />}
              open={openSections.preset}
              onToggle={() => toggleSection("preset")}
            >
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(REPORT_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={cn(
                      "text-left rounded-lg border p-3 transition-colors min-h-[52px]",
                      config.layoutStyle === key
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <p className="text-xs sm:text-sm font-medium text-foreground">{preset.label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            {/* Sort & Group */}
            <CollapsibleSection
              title="Sort & Group"
              icon={<Settings2 className="h-4 w-4" />}
              open={openSections.columns}
              onToggle={() => toggleSection("columns")}
              badge={`${activeColumnCount} cols`}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sort By</Label>
                    <Select value={config.sortBy} onValueChange={(v) => setConfig((p) => ({ ...p, sortBy: v as any }))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alphabetical">Alphabetical</SelectItem>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="hourly_rate">Hourly Rate</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="role">Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Group By</Label>
                    <Select value={config.groupBy} onValueChange={(v) => setConfig((p) => ({ ...p, groupBy: v as any }))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="role">Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Column toggles */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Columns to Include</Label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {(Object.keys(COLUMN_LABELS) as Array<keyof PayrollReportConfig["columns"]>).map((key) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                        <Switch
                          checked={config.columns[key]}
                          onCheckedChange={() => toggleColumn(key)}
                          className="scale-75"
                        />
                        <span className="text-xs text-foreground">{COLUMN_LABELS[key]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Financial Display */}
            <CollapsibleSection
              title="Financial Display"
              icon={<Eye className="h-4 w-4" />}
              open={openSections.financial}
              onToggle={() => toggleSection("financial")}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {(Object.keys(FINANCIAL_LABELS) as Array<keyof PayrollReportConfig["financial"]>).map((key) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                    <Switch
                      checked={config.financial[key]}
                      onCheckedChange={() => toggleFinancial(key)}
                      className="scale-75"
                    />
                    <span className="text-xs text-foreground">{FINANCIAL_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            {/* Employee Scope */}
            <CollapsibleSection
              title="Employee Scope"
              icon={<Users className="h-4 w-4" />}
              open={openSections.scope}
              onToggle={() => toggleSection("scope")}
              badge={config.employeeScope === "all" ? "All" : `Filtered`}
            >
              <div className="space-y-3">
                <Select
                  value={config.employeeScope}
                  onValueChange={(v) => setConfig((p) => ({ ...p, employeeScope: v as any, selectedDepartments: [], selectedLocations: [], selectedEmployeeIds: [] }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="department">Filter by Department</SelectItem>
                    {availableLocations.length > 0 && (
                      <SelectItem value="location">Filter by Location</SelectItem>
                    )}
                    <SelectItem value="custom">Select Specific Employees</SelectItem>
                  </SelectContent>
                </Select>

                {config.employeeScope === "department" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Departments</Label>
                    <div className="flex flex-wrap gap-2">
                      {departments.map((dept) => (
                        <label key={dept} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={config.selectedDepartments.includes(dept)}
                            onCheckedChange={(checked) => {
                              setConfig((p) => ({
                                ...p,
                                selectedDepartments: checked
                                  ? [...p.selectedDepartments, dept]
                                  : p.selectedDepartments.filter((d) => d !== dept),
                              }));
                            }}
                          />
                          <span className="text-xs">{dept}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {config.employeeScope === "location" && availableLocations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Locations</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableLocations.map((loc) => (
                        <label key={loc} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={config.selectedLocations.includes(loc)}
                            onCheckedChange={(checked) => {
                              setConfig((p) => ({
                                ...p,
                                selectedLocations: checked
                                  ? [...p.selectedLocations, loc]
                                  : p.selectedLocations.filter((l) => l !== loc),
                              }));
                            }}
                          />
                          <span className="text-xs">{loc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {config.employeeScope === "custom" && (
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Select Employees ({config.selectedEmployeeIds.length} selected)
                    </Label>
                    <ScrollArea className="max-h-40 border rounded-md p-2">
                      <div className="space-y-1">
                        {entries.map((entry: any) => {
                          const emp = entry.employees;
                          if (!emp) return null;
                          const name = `${emp.forename} ${emp.surname}`;
                          return (
                            <label key={entry.employee_id} className="flex items-center gap-2 cursor-pointer py-1 min-h-[32px]">
                              <Checkbox
                                checked={config.selectedEmployeeIds.includes(entry.employee_id)}
                                onCheckedChange={(checked) => {
                                  setConfig((p) => ({
                                    ...p,
                                    selectedEmployeeIds: checked
                                      ? [...p.selectedEmployeeIds, entry.employee_id]
                                      : p.selectedEmployeeIds.filter((id) => id !== entry.employee_id),
                                  }));
                                }}
                              />
                              <span className="text-xs">{name}</span>
                              <Badge variant="outline" className="text-[10px] ml-auto">{emp.department}</Badge>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Layout Options */}
            <CollapsibleSection
              title="Layout Options"
              icon={<LayoutTemplate className="h-4 w-4" />}
              open={openSections.layout}
              onToggle={() => toggleSection("layout")}
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Orientation</Label>
                  <Select value={config.orientation} onValueChange={(v) => setConfig((p) => ({ ...p, orientation: v as any }))}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                    <Switch checked={config.showLogo} onCheckedChange={(v) => setConfig((p) => ({ ...p, showLogo: v }))} className="scale-75" />
                    <span className="text-xs">Show Company Logo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                    <Switch checked={config.showNotes} onCheckedChange={(v) => setConfig((p) => ({ ...p, showNotes: v }))} className="scale-75" />
                    <span className="text-xs">Show Payroll Notes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                    <Switch checked={config.showAuditFooter} onCheckedChange={(v) => setConfig((p) => ({ ...p, showAuditFooter: v }))} className="scale-75" />
                    <span className="text-xs">Show Audit Footer</span>
                  </label>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t border-border px-4 py-3 sm:px-6 flex flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="text-xs text-muted-foreground self-center">
            {filteredEntries.length} employee{filteredEntries.length !== 1 ? "s" : ""} • {config.layoutStyle} layout
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={generating || filteredEntries.length === 0} className="h-9 min-h-[44px]">
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </Button>
            <Button size="sm" onClick={handleGeneratePDF} disabled={generating || filteredEntries.length === 0} className="h-9 min-h-[44px]">
              <FileDown className="h-4 w-4 mr-1.5" />
              {generating ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CollapsibleSection({
  title,
  icon,
  children,
  open,
  onToggle,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full rounded-lg border border-border px-3 py-2.5 hover:bg-muted/50 transition-colors min-h-[44px]">
          <div className="flex items-center gap-2">
            <span className="text-primary">{icon}</span>
            <span className="text-sm font-medium text-foreground">{title}</span>
            {badge && <Badge variant="secondary" className="text-[10px] h-5">{badge}</Badge>}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 pb-1 px-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
