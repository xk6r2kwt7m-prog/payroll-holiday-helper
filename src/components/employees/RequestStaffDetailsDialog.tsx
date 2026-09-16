import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Send, MailCheck, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useInfoRequests, useSendInfoRequest, type InfoSection } from "@/hooks/useInfoRequests";

const SECTIONS: { key: InfoSection; label: string; hint: string }[] = [
  { key: "personal", label: "Personal details", hint: "Full name, date of birth, phone, home address, National Insurance number" },
  { key: "emergency", label: "Emergency contact", hint: "Name, relationship, phone" },
  { key: "bank", label: "Bank details for pay", hint: "Account holder, sort code, account number" },
  { key: "rtw", label: "Right to work", hint: "Nationality, share code and a photo of their document" },
];

interface Props {
  employeeId: string;
  employeeName: string;
  employeeEmail?: string | null;
  trigger: React.ReactNode;
}

export function RequestStaffDetailsDialog({ employeeId, employeeName, employeeEmail, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(employeeEmail ?? "");
  const [expiryDays, setExpiryDays] = useState("14");
  const [selected, setSelected] = useState<InfoSection[]>(["personal", "emergency", "bank", "rtw"]);
  const { data: history = [] } = useInfoRequests(employeeId);
  const send = useSendInfoRequest();

  const toggle = (key: InfoSection) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const submit = () => {
    send.mutate(
      {
        employeeIds: [employeeId],
        sections: selected,
        recipientOverride: email.trim() || null,
        expiryDays: Number(expiryDays) || 14,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  const latest = history[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ask {employeeName.split(" ")[0]} to complete their details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1">
            <Label>Send to</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
            <p className="text-xs text-muted-foreground">
              They get a secure link — no account needed. Nothing here changes their pay or hours.
            </p>
          </div>

          <div className="space-y-2">
            <Label>What to ask for</Label>
            {SECTIONS.map((s) => (
              <label key={s.key} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Checkbox checked={selected.includes(s.key)} onCheckedChange={() => toggle(s.key)} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-card-foreground">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.hint}</span>
                </span>
              </label>
            ))}
            {selected.includes("rtw") && (
              <p className="text-xs text-muted-foreground">
                Right to work documents wait for your review before they count as checked.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Link expires after (days)</Label>
            <Input type="number" min={1} max={60} value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} />
          </div>

          {latest && (
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-card-foreground">
                <MailCheck className="h-3.5 w-3.5" /> Last request
              </p>
              <p>Sent {formatDistanceToNow(parseISO(latest.sent_at), { addSuffix: true })} to {latest.recipient_email}</p>
              <p className="flex items-center gap-1.5">
                {latest.submitted_at ? (
                  <><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Completed</>
                ) : latest.opened_at ? (
                  <><Clock className="h-3.5 w-3.5" /> Opened, not finished</>
                ) : (
                  <><Clock className="h-3.5 w-3.5" /> Not opened yet</>
                )}
                {latest.rtw_uploaded_count > 0 && (
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {latest.rtw_uploaded_count} document{latest.rtw_uploaded_count > 1 ? "s" : ""}
                  </Badge>
                )}
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={submit}
            disabled={send.isPending || selected.length === 0 || !email.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {send.isPending ? "Sending..." : latest ? "Send again" : "Send request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
