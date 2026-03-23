import { useState, useMemo } from "react";
import { Mail, Plus, X, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pdf } from "@react-pdf/renderer";
import { PayrollPDF } from "./PayrollPDF";
import { useTenant } from "@/hooks/useTenant";
import { defaultReportConfig, type PayrollReportConfig } from "./PayrollReportConfig";

interface SendPayrollEmailDialogProps {
  period: {
    id: string;
    period_name: string;
    start_date: string;
    end_date: string;
    status: string;
    notes?: string | null;
    tenant_id: string;
    timesheet_total?: number;
    grand_total?: number;
  };
  entries: any[];
  holidayPayments: any[];
  allEmployees: any[];
  priorPeriodEmployeeIds?: Set<string>;
  priorEntryRates?: Map<string, { hourly_rate: number; service_charge: number }>;
  disabled?: boolean;
}

export function SendPayrollEmailDialog({
  period,
  entries,
  holidayPayments,
  allEmployees,
  priorPeriodEmployeeIds = new Set(),
  priorEntryRates = new Map(),
  disabled,
}: SendPayrollEmailDialogProps) {
  const { tenantId } = useTenant();
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [includeBankDetails, setIncludeBankDetails] = useState(false);
  const [sending, setSending] = useState(false);

  const defaultSubject = `Payroll – ${period.period_name}`;
  const defaultMessage = `Please find the payroll report for ${period.period_name} attached.\n\nThis is a confidential document. Please review and file accordingly.`;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setSubject(defaultSubject);
      setMessage(defaultMessage);
      setRecipients([]);
      setEmailInput("");
      setIncludeBankDetails(false);
    }
    setOpen(isOpen);
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (recipients.includes(email)) {
      toast.error("Email already added");
      return;
    }
    setRecipients([...recipients, email]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail();
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    setSending(true);
    try {
      toast.info("Generating payroll PDF…");

      const holidayPaymentEmployeeIds = new Set(holidayPayments.map((hp: any) => hp.employee_id).filter(Boolean));
      const starterEmployees = allEmployees.filter((emp) => {
        const inEntries = entries.some((e: any) => e.employee_id === emp.id);
        const hasHolidayPayment = holidayPaymentEmployeeIds.has(emp.id);
        if (!inEntries && !hasHolidayPayment) return false;
        const isLeaver = emp.status === "leaver" || hasHolidayPayment;
        const isGenuineStarter = emp.status === "starter" && !priorPeriodEmployeeIds.has(emp.id);
        return isGenuineStarter || isLeaver;
      });

      // Build report config using defaults — bank details excluded from starters if toggle is off
      const reportConfig: PayrollReportConfig = {
        ...defaultReportConfig,
        sortBy: "alphabetical",
        showLogo: true,
        showNotes: false, // Never include internal notes
      };

      // If bank details are excluded, filter them from starters
      const filteredStarters = includeBankDetails
        ? starterEmployees
        : starterEmployees.map((s: any) => ({
            ...s,
            bank_account_no: null,
            sort_code: null,
          }));

      const logoUrl = `${window.location.origin}/logo.jpeg`;
      const blob = await pdf(
        <PayrollPDF
          period={period as any}
          entries={entries}
          holidayPayments={holidayPayments}
          starters={filteredStarters}
          priorPeriodEmployeeIds={priorPeriodEmployeeIds}
          priorEntryRates={priorEntryRates}
          isCorrection={!!period.notes?.includes("[CORRECTED]")}
          correctionNote={
            period.notes?.includes("[CORRECTED]") ? period.notes : undefined
          }
          logoUrl={logoUrl}
          reportConfig={reportConfig}
        />
      ).toBlob();

      // Convert blob to base64
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = btoa(binary);

      const fileName = `payroll-${period.period_name.replace(/\s+/g, "-")}.pdf`;

      toast.info("Sending email…");

      const { data, error } = await supabase.functions.invoke(
        "send-payroll-email",
        {
          body: {
            recipients,
            subject: subject || defaultSubject,
            message: message || defaultMessage,
            periodName: period.period_name,
            tenantId,
            pdfBase64,
            fileName,
          },
        }
      );

      if (error) throw error;

      if (data?.success) {
        toast.success(
          `Payroll sent to ${recipients.length} recipient${recipients.length > 1 ? "s" : ""}`
        );
        setOpen(false);
      } else {
        const failedEmails = data?.results
          ?.filter((r: any) => !r.success)
          .map((r: any) => r.email)
          .join(", ");
        toast.error(`Failed to send to: ${failedEmails || "unknown"}`);
      }
    } catch (err: any) {
      console.error("Send payroll email failed:", err);
      toast.error(err?.message || "Failed to send payroll email");
    } finally {
      setSending(false);
    }
  };

  const canSend = recipients.length > 0 && !sending;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 px-2.5 sm:px-3 text-xs"
        >
          <Mail className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Send Payroll by Email
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Generate and send the payroll PDF for{" "}
            <strong>{period.period_name}</strong> via email with a secure
            download link (expires in 7 days).
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipients */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recipients</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmail}
                disabled={!emailInput.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recipients.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="text-xs gap-1 pr-1"
                  >
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {recipients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Press Enter or comma to add each email
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={defaultSubject}
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={defaultMessage}
              rows={3}
            />
          </div>

          {/* Bank details toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">
                Include bank details
              </Label>
              <p className="text-xs text-muted-foreground">
                Sort code and account number in PDF
              </p>
            </div>
            <Switch
              checked={includeBankDetails}
              onCheckedChange={setIncludeBankDetails}
            />
          </div>

          {includeBankDetails && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Bank details will be included in the PDF. Only enable this
                if recipients are authorised to view sensitive financial
                information.
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-lg bg-muted/40 p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">
              What will be sent:
            </p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              <li>
                Payroll PDF for {period.period_name} (sorted A–Z by first name)
              </li>
              <li>Secure download link valid for 7 days</li>
              <li>
                {includeBankDetails
                  ? "Bank details included"
                  : "Bank details excluded"}
              </li>
              <li>Internal notes and adjustments excluded</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending ? (
              "Sending…"
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Send to {recipients.length || "…"}{" "}
                {recipients.length === 1 ? "recipient" : "recipients"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
