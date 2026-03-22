import { useState } from "react";
import { Plus, Copy, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useCreatePayrollPeriod, useCopyPayrollPeriod, usePayrollPeriods } from "@/hooks/usePayroll";
import { useEmployees } from "@/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";

interface CreatePayrollDialogProps {
  onSuccess?: () => void;
}

export function CreatePayrollDialog({ onSuccess }: CreatePayrollDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "copy">("copy");
  const [selectedSourcePeriod, setSelectedSourcePeriod] = useState<string>("");
  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payDate, setPayDate] = useState("");
  const [periodWeeks, setPeriodWeeks] = useState("4");
  const [salesTotal, setSalesTotal] = useState("");

  const { data: periods = [] } = usePayrollPeriods();
  const { data: employees = [] } = useEmployees();
  const createPeriod = useCreatePayrollPeriod();
  const copyPeriod = useCopyPayrollPeriod();

  const checkOverlap = (start: string, end: string): string | null => {
    if (!start || !end) return null;
    const newStart = new Date(start);
    const newEnd = new Date(end);
    for (const p of periods) {
      const pStart = new Date(p.start_date);
      const pEnd = new Date(p.end_date);
      if (newStart <= pEnd && newEnd >= pStart) {
        return `Dates overlap with "${p.period_name}" (${p.start_date} to ${p.end_date}). Overlapping periods are not allowed.`;
      }
    }
    return null;
  };

  const handleCreate = async () => {
    if (!periodName || !startDate || !endDate) {
      toast.error("Please fill in period name, start date, and end date");
      return;
    }

    const overlapError = checkOverlap(startDate, endDate);
    if (overlapError) {
      toast.error(overlapError);
      return;
    }

    try {
      if (mode === "copy" && selectedSourcePeriod) {
        await copyPeriod.mutateAsync({
          sourcePeriodId: selectedSourcePeriod,
          newPeriodName: periodName,
          startDate,
          endDate,
          payDate: payDate || undefined,
          periodWeeks: parseFloat(periodWeeks) || 4,
          salesTotal: parseFloat(salesTotal) || 0,
        });
        toast.success("Payroll period created from previous period. Timesheet hours reset to 0.");
      } else {
        // Create new period and add all active employees
        const { data: { user } } = await supabase.auth.getUser();
        
        const newPeriod = await createPeriod.mutateAsync({
          period_name: periodName,
          start_date: startDate,
          end_date: endDate,
          pay_date: payDate || null,
          period_weeks: parseFloat(periodWeeks) || 4,
          sales_total: parseFloat(salesTotal) || 0,
          status: "draft",
          imported_by: user?.id,
        });

        // Add entries for all active + starter employees (leavers excluded)
        const eligibleEmployees = employees.filter(e => e.status === "active" || e.status === "starter");
        if (eligibleEmployees.length > 0) {
          const entries = eligibleEmployees.map(emp => ({
            payroll_period_id: newPeriod.id,
            employee_id: emp.id,
            hourly_rate: emp.hourly_rate,
            service_charge: emp.service_charge || 0,
            timesheet_hours: 0,
            performance_bonus: 0,
            special_bonus: 0,
            total_pay: 0,
          }));

          await supabase.from("payroll_entries").insert(entries as any);
        }

        toast.success(`Payroll period created with ${eligibleEmployees.length} employees.`);
      }

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to create payroll period");
    }
  };

  const getLastThursday = (year: number, month: number): string => {
    const lastDay = new Date(year, month + 1, 0);
    const dayOfWeek = lastDay.getDay();
    const diff = (dayOfWeek + 7 - 4) % 7;
    const lastThursday = new Date(lastDay);
    lastThursday.setDate(lastDay.getDate() - diff);
    return lastThursday.toISOString().split('T')[0];
  };

  const deriveFromDates = (start: string, end: string) => {
    if (!start || !end) return;
    const s = new Date(start);
    const e = new Date(end);
    const days = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24) + 1;
    setPeriodWeeks((Math.round((days / 7) * 10) / 10).toString());
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    setPeriodName(`${monthNames[e.getMonth()]} ${e.getFullYear()}`);
    setPayDate(getLastThursday(e.getFullYear(), e.getMonth()));
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    deriveFromDates(val, endDate);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    deriveFromDates(startDate, val);
  };

  const resetForm = () => {
    setPeriodName("");
    setStartDate("");
    setEndDate("");
    setPayDate("");
    setPeriodWeeks("4");
    setSalesTotal("");
    setSelectedSourcePeriod("");
    setMode("copy");
  };

  const isLoading = createPeriod.isPending || copyPeriod.isPending;

  const handleSourceChange = (periodId: string) => {
    setSelectedSourcePeriod(periodId);
    const source = periods.find(p => p.id === periodId);
    if (source) {
      const sourceEnd = new Date(source.end_date);
      const nextStart = new Date(sourceEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      
      // Find next cut-off Sunday (end of ~4 week period)
      const nextEnd = new Date(nextStart);
      nextEnd.setMonth(nextEnd.getMonth() + 1);
      nextEnd.setDate(nextEnd.getDate() - 1);
      // Adjust to nearest Sunday
      const dow = nextEnd.getDay();
      if (dow !== 0) {
        nextEnd.setDate(nextEnd.getDate() - dow);
      }

      const sDate = nextStart.toISOString().split('T')[0];
      const eDate = nextEnd.toISOString().split('T')[0];
      setStartDate(sDate);
      setEndDate(eDate);
      deriveFromDates(sDate, eDate);
    }
  };


  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary h-9 text-xs sm:text-sm">
          <Plus className="h-4 w-4 sm:mr-1.5 shrink-0" />
          <span className="hidden xs:inline">New Period</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Create Payroll Period
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "new" | "copy")} className="mt-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="copy" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy Previous
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Start Fresh
            </TabsTrigger>
          </TabsList>

          <TabsContent value="copy" className="space-y-4 mt-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-sm text-muted-foreground">
                Copy employee rates and bonuses from a previous period. <strong>Timesheet hours will be reset to 0</strong> for you to enter.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Copy From</Label>
              <Select value={selectedSourcePeriod} onValueChange={handleSourceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a period to copy" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.period_name} ({period.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
              <p className="text-sm text-muted-foreground">
                Create a fresh payroll period. All active employees will be added automatically.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Period Name *</Label>
            <Input
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
              placeholder="e.g., February 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
              />
            </div>
          </div>

          {startDate && endDate && checkOverlap(startDate, endDate) && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
              <span className="text-destructive font-bold text-lg leading-none">⚠</span>
              <p className="text-sm text-destructive font-medium">
                {checkOverlap(startDate, endDate)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Pay Date</Label>
            <Input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Optional - when employees will be paid</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Period Weeks</Label>
              <Input
                type="number"
                step="0.5"
                min="1"
                max="6"
                value={periodWeeks}
                onChange={(e) => setPeriodWeeks(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Auto-calculated from dates</p>
            </div>
            <div className="space-y-2">
              <Label>Sales Revenue (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={salesTotal}
                onChange={(e) => setSalesTotal(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">For labour % analysis</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isLoading || !periodName || !startDate || !endDate || (mode === "copy" && !selectedSourcePeriod) || !!(startDate && endDate && checkOverlap(startDate, endDate))}
          >
            {isLoading ? "Creating..." : "Create Period"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
