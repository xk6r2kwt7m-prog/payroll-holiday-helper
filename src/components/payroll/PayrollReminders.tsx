import { AlertTriangle, CheckCircle2, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SensitiveSection } from "@/components/ui/sensitive-field";
import { useTenant } from "@/hooks/useTenant";

interface PayrollRemindersProps {
  periodId: string;
}

export function PayrollReminders({ periodId }: PayrollRemindersProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: reminders = [] } = useQuery({
    queryKey: ["payroll_reminders", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("admin_notes")
        .select("*, employees(forename, surname)")
        .eq("tenant_id", tenantId)
        .eq("status", "open")
        .like("note", "%NEXT PAYROLL ACTION%")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const handleDismiss = async (id: string) => {
    const { error } = await supabase
      .from("admin_notes")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to dismiss reminder");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["payroll_reminders"] });
    queryClient.invalidateQueries({ queryKey: ["admin_notes"] });
    toast.success("Reminder resolved");
  };

  if (reminders.length === 0) return null;

  return (
    <SensitiveSection
      sectionKey={`payroll-reminders-${periodId}`}
      category="compensation"
      title="Payroll Reminders"
    >
      <div className="rounded-xl border border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h3 className="font-semibold text-card-foreground">
            Payroll Reminders
          </h3>
          <Badge variant="secondary" className="bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {reminders.length}
          </Badge>
        </div>
        <div className="grid gap-2">
          {reminders.map((r: any) => {
            const emp = r.employees;
            const name = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
            const noteText = r.note.replace("⚠️ NEXT PAYROLL ACTION: ", "");
            return (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-background p-3"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{noteText}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 px-2 text-xs text-success hover:text-success"
                  onClick={() => handleDismiss(r.id)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Done
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </SensitiveSection>
  );
}
