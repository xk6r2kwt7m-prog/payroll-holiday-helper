import { useState } from "react";
import { UserPlus, Send, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
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
import {
  findPossibleDuplicates,
  duplicateWarningMessage,
  blockingMessage,
  type ExistingRecord,
} from "@/lib/duplicate-check";

type DepartmentType = string;

interface InviteEmployeeDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function InviteEmployeeDialog({ trigger, onSuccess }: InviteEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [forename, setForename] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<DepartmentType>("FOH");
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const { sendInviteEmail } = useInviteEmail();

  /** Refusal: the email already belongs to a current staff record. */
  const [blocked, setBlocked] = useState<string | null>(null);
  /** Warning only: a leaver / archived record looks like the same person. */
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const runChecks = async (): Promise<boolean> => {
    if (!tenantId) return false;
    setChecking(true);
    try {
      const { data } = await supabase
        .from("employees")
        .select("id, forename, surname, preferred_name, email, ni_number, status, user_id, archived_at")
        .eq("tenant_id", tenantId);

      const matches = findPossibleDuplicates(
        { forename: forename.trim(), surname: surname.trim(), email: email.trim() },
        (data ?? []) as ExistingRecord[],
      );

      const block = blockingMessage(matches);
      if (block) {
        setBlocked(block);
        setDuplicateWarning(null);
        return false;
      }
      setBlocked(null);
      setDuplicateWarning(duplicateWarningMessage(matches));
      return true;
    } finally {
      setChecking(false);
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forename.trim() || !surname.trim() || !email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!tenantId) return;
    const ok = await runChecks();
    if (ok) setStep("confirm");
  };

  const handleSend = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Last safety check immediately before anything is created.
      const ok = await runChecks();
      if (!ok) {
        setStep("form");
        return;
      }

      const fullName = `${forename.trim()} ${surname.trim()}`;

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

      await supabase
        .from("employee_onboarding_data" as any)
        .insert({ employee_id: employee.id, tenant_id: tenantId } as any);

      // The invitation is tied to this exact staff record, so the joining link can
      // never show somebody else's name.
      const { data: invitation } = await supabase
        .from("tenant_invitations")
        .insert({
          tenant_id: tenantId,
          email: email.trim().toLowerCase(),
          role: "employee" as any,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
          employee_id: employee.id,
        } as any)
        .select("token")
        .single();

      const result = await sendInviteEmail({
        recipientEmail: email.trim().toLowerCase(),
        employeeName: fullName,
        tenantId,
        inviteToken: (invitation as any)?.token ?? null,
      });

      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["tenant-invitations"] });

      if (result.success) {
        toast.success(`Invite sent to ${fullName} at ${email.trim().toLowerCase()}`);
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
    setBlocked(null);
    setDuplicateWarning(null);
    setStep("form");
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
            {step === "form" ? "Invite New Employee" : "Check before sending"}
          </DialogTitle>
        </DialogHeader>

        {step === "confirm" ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              This is exactly what the invitation will say. Check the name matches the email address.
            </p>

            <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border/60">
              <div className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="text-xs text-muted-foreground">Name</span>
                <span id="confirm-name" className="text-sm font-medium text-foreground text-right">
                  {forename.trim()} {surname.trim()}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="text-xs text-muted-foreground">Email</span>
                <span id="confirm-email" className="text-sm font-medium text-foreground text-right break-all">
                  {email.trim().toLowerCase()}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="text-xs text-muted-foreground">Department</span>
                <span id="confirm-department" className="text-sm font-medium text-foreground text-right">{department}</span>
              </div>
            </div>

            {duplicateWarning && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <p className="text-xs text-warning flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
                  {duplicateWarning}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep("form")}>
                <ArrowLeft className="h-4 w-4" /> Change
              </Button>
              <Button type="button" className="flex-1 gap-2" disabled={loading} onClick={handleSend}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="h-4 w-4" /> Send invite</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReview} className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter the employee's name and email. They will complete their personal details, upload documents, and set their availability through self-service onboarding.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="invite-forename">First Name <span className="text-destructive">*</span></Label>
                <Input
                  id="invite-forename"
                  value={forename}
                  onChange={e => setForename(e.target.value)}
                  placeholder="First name"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-surname">Last Name <span className="text-destructive">*</span></Label>
                <Input
                  id="invite-surname"
                  value={surname}
                  onChange={e => setSurname(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address <span className="text-destructive">*</span></Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setBlocked(null); }}
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

            {blocked && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-xs text-destructive flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
                  {blocked}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={checking}>
                {checking ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</>
                ) : (
                  <>Review invite</>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
