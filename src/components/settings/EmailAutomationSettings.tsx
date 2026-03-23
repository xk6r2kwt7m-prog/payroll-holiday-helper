import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, ShieldAlert, Mail, MailX, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { useTenantPreferences, useSaveTenantPreferences } from "@/hooks/useTenantPreferences";
import {
  EMAIL_AUTOMATION_DEFAULTS,
  type EmailAutomationSettings as Settings,
  type EmailMode,
  type EmailCategory,
} from "@/hooks/useEmailPolicy";

const CATEGORY_META: { key: EmailCategory; label: string; desc: string; sensitive: boolean }[] = [
  { key: "contracts", label: "Contract emails", desc: "Initial contract delivery to employees", sensitive: true },
  { key: "contract_signing", label: "Contract signing emails", desc: "Signing links, receipt confirmations, completion notices", sensitive: true },
  { key: "hr_documents", label: "HR document emails", desc: "Document requests, expiry alerts, upload confirmations", sensitive: false },
  { key: "payroll", label: "Payroll emails", desc: "Pay run reports, payslip delivery", sensitive: true },
  { key: "onboarding", label: "Onboarding emails", desc: "Welcome messages, setup instructions, invitation links", sensitive: false },
  { key: "policies", label: "Policy & compliance emails", desc: "Policy acknowledgements, compliance reminders", sensitive: false },
  { key: "scheduling", label: "Scheduling & rota emails", desc: "Shift assignments, rota published, swap requests", sensitive: false },
  { key: "general", label: "General notifications", desc: "Miscellaneous employee notifications", sensitive: false },
];

const MODE_LABELS: Record<EmailMode, { label: string; color: string; icon: any }> = {
  disabled: { label: "Disabled", color: "bg-destructive/10 text-destructive", icon: MailX },
  manual: { label: "Manual send only", color: "bg-warning/10 text-warning", icon: Mail },
  auto: { label: "Auto-send enabled", color: "bg-success/10 text-success", icon: MailCheck },
};

export function EmailAutomationSettings() {
  const { data: prefs, isLoading } = useTenantPreferences("email_automation" as any, EMAIL_AUTOMATION_DEFAULTS);
  const saveMut = useSaveTenantPreferences();
  const [local, setLocal] = useState<Settings>(EMAIL_AUTOMATION_DEFAULTS);

  useEffect(() => {
    if (prefs) setLocal(prefs as Settings);
  }, [prefs]);

  const cycleMode = (key: EmailCategory) => {
    setLocal((prev) => {
      const current = prev[key];
      const next: EmailMode = current === "disabled" ? "manual" : current === "manual" ? "auto" : "disabled";
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    try {
      await saveMut.mutateAsync({ category: "email_automation" as any, preferences: local });
      toast.success("Email automation settings saved");
    } catch {
      toast.error("Failed to save email settings");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Outbound email controls</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            By default, all employee-facing emails are disabled or require manual approval.
            Only enable auto-send for categories you have explicitly reviewed.
            Every email attempt is logged in the audit trail.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {CATEGORY_META.map((cat) => {
          const mode = local[cat.key];
          const meta = MODE_LABELS[mode];
          const Icon = meta.icon;

          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between gap-3 py-2.5 px-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground">{cat.label}</p>
                    {cat.sensitive && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-destructive/5 text-destructive border-destructive/20">
                        Sensitive
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{cat.desc}</p>
                </div>
                <button
                  onClick={() => cycleMode(cat.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${meta.color}`}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </button>
              </div>
              <Separator />
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-muted-foreground space-y-1 pt-1">
        <p><strong>Disabled</strong> — emails blocked; attempts logged as &quot;suppressed&quot;</p>
        <p><strong>Manual send only</strong> — system prepares the email but waits for admin to click Send</p>
        <p><strong>Auto-send enabled</strong> — emails sent automatically when triggered by workflow</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button size="sm" onClick={handleSave} disabled={saveMut.isPending}>
          {saveMut.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Email Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
