import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { buildTestEmployeeInsert, TEST_EMPLOYEE_NAME } from "@/lib/contract-test-mode";

/**
 * A clearly-marked rehearsal staff record so the whole contract journey can be
 * tried end to end with the admin's own inbox. Excluded from payroll, holiday
 * and reporting figures; deletable in one click.
 */
export function TestStaffCard() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: testStaff, refetch } = useQuery({
    queryKey: ["test_staff", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, forename, surname, email")
        .eq("tenant_id", tenantId!)
        .eq("is_test_record", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const create = async () => {
    if (!tenantId || !user?.email) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("employees")
        .insert(buildTestEmployeeInsert({ tenantId, email: user.email }) as any);
      if (error) throw error;
      await supabase.from("audit_log").insert({
        action: "create" as const,
        table_name: "test_staff_record",
        record_id: tenantId,
        tenant_id: tenantId,
        new_data: { event: "test_staff_created", email: user.email, name: TEST_EMPLOYEE_NAME },
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Test staff member created",
        description: `${TEST_EMPLOYEE_NAME} uses your email. It never appears in payroll or holiday figures.`,
      });
    } catch (err: any) {
      toast({ title: "Could not create it", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("employees").delete().eq("id", id).eq("is_test_record", true);
      if (error) throw error;
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["all_contracts"] });
      toast({ title: "Test staff member removed" });
    } catch (err: any) {
      toast({ title: "Could not remove it", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Practise the whole process safely</p>
            <p className="text-xs text-muted-foreground">
              Create a test staff member using your email, or switch on “Send to me instead” in any send box.
            </p>
            {!!testStaff?.length && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {testStaff.map((s) => (
                  <Badge key={s.id} variant="outline" className="gap-1 text-[10px]">
                    Test · {s.forename} {s.surname} · {s.email}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {testStaff?.length ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => remove(testStaff[0].id)}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Remove test staff
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy || !user?.email} onClick={create}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Create test staff member
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
