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

  const { data: periods = [] } = usePayrollPeriods();
  const { data: employees = [] } = useEmployees();
  const createPeriod = useCreatePayrollPeriod();
  const copyPeriod = useCopyPayrollPeriod();

  const handleCreate = async () => {
    if (!periodName || !startDate || !endDate) {
      toast.error("Please fill in period name, start date, and end date");
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
          status: "draft",
          imported_by: user?.id,
        });

        // Add entries for all active + starter employees (UK best practice)
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

          await supabase.from("payroll_entries").insert(entries);
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

  const resetForm = () => {
    setPeriodName("");
    setStartDate("");
    setEndDate("");
    setPayDate("");
    setSelectedSourcePeriod("");
    setMode("copy");
  };

  const isLoading = createPeriod.isPending || copyPeriod.isPending;

  // Auto-suggest next month dates when copying
  const handleSourceChange = (periodId: string) => {
    setSelectedSourcePeriod(periodId);
    const source = periods.find(p => p.id === periodId);
    if (source) {
      const sourceEnd = new Date(source.end_date);
      const nextStart = new Date(sourceEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextEnd = new Date(nextStart);
      nextEnd.setMonth(nextEnd.getMonth() + 1);
      nextEnd.setDate(nextEnd.getDate() - 1);

      setStartDate(nextStart.toISOString().split('T')[0]);
      setEndDate(nextEnd.toISOString().split('T')[0]);
      
      // Suggest period name
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      setPeriodName(`${monthNames[nextStart.getMonth()]} ${nextStart.getFullYear()}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          New Payroll Period
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
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pay Date</Label>
            <Input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Optional - when employees will be paid</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isLoading || !periodName || !startDate || !endDate || (mode === "copy" && !selectedSourcePeriod)}
          >
            {isLoading ? "Creating..." : "Create Period"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
