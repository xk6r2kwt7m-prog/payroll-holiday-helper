import { useState } from "react";
import { UserPlus, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useQueryClient } from "@tanstack/react-query";
import { useDepartments } from "@/hooks/useDepartments";
import { useInviteEmail } from "@/hooks/useInviteEmail";

type DepartmentType = string;

interface InviteEmployeeDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function InviteEmployeeDialog({ trigger, onSuccess }: InviteEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forename, setForename] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<DepartmentType>("FOH");
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const { sendInviteEmail } = useInviteEmail();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forename.trim() || !surname.trim() || !email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!tenantId) return;

    setLoading(true);
    try {
      // Create minimal employee record with onboarding status
      const { data: employee, error } = await supabase
        .from("employees")
        .insert({
          forename: forename.trim(),
          surname: surname.trim(),
          email: email.trim().toLowerCase(),
          department,
          status: "onboarding" as any,
          hourly_rate: 0,
          tenant_id: tenantId,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Create onboarding data record
      await supabase
        .from("employee_onboarding_data" as any)
        .insert({
          employee_id: employee.id,
          tenant_id: tenantId,
        } as any);

      // Create invitation DB record
      await supabase
        .from("tenant_invitations")
        .insert({
          tenant_id: tenantId,
          email: email.trim().toLowerCase(),
          role: "staff" as any,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
        });

      // Send the actual invite email
      const result = await sendInviteEmail({
        recipientEmail: email.trim().toLowerCase(),
        employeeName: `${forename.trim()} ${surname.trim()}`,
        tenantId,
      });

      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["tenant-invitations"] });

      if (result.success) {
        toast.success(`Invitation sent successfully to ${email.trim().toLowerCase()}`);
      } else {
        toast.warning(`Invitation created, but the invite email failed to send.`, {
          description: result.error || "The employee record was created. You can resend the invite later.",
          duration: 8000,
        });
      }

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to invite employee");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForename("");
    setSurname("");
    setEmail("");
    setDepartment("FOH");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" /> Invite Employee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            Invite New Employee
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Enter the employee's name and email. They will complete their personal details, upload documents, and set their availability through self-service onboarding.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input
                value={forename}
                onChange={e => setForename(e.target.value)}
                placeholder="First name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name <span className="text-destructive">*</span></Label>
              <Input
                value={surname}
                onChange={e => setSurname(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email Address <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="employee@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={department} onValueChange={v => setDepartment(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.key} value={d.key}>{d.emoji} {d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4" /> Send Invite</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
