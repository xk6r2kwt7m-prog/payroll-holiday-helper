import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Send, ChevronLeft, AlertTriangle } from "lucide-react";
import type { Employee } from "@/hooks/useEmployees";
import { useSendInfoRequest } from "@/hooks/useInfoRequests";
import { INFO_ITEMS, INFO_PRESETS, type InfoItemKey } from "@/lib/info-request-items";

/**
 * Asks several existing staff for the same information in one go.
 * A confirm step lists every person and address before anything is sent, and
 * people with no email on record are shown as skipped rather than silently lost.
 */
export function BulkRequestInfoDialog({
  employees,
  trigger,
  onSent,
}: {
  employees: Employee[];
  trigger: React.ReactNode;
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preset, setPreset] = useState<string | null>(null);
  const [selected, setSelected] = useState<InfoItemKey[]>([]);
  const send = useSendInfoRequest();

  const withEmail = useMemo(() => employees.filter((e) => !!e.email), [employees]);
  const withoutEmail = useMemo(() => employees.filter((e) => !e.email), [employees]);

  const toggle = (key: InfoItemKey) =>
    setSelected((s) => {
      setPreset(null);
      return s.includes(key) ? s.filter((k) => k !== key) : [...s, key];
    });

  const submit = () => {
    send.mutate(
      {
        employeeIds: withEmail.map((e) => e.id),
        sections: selected,
        requestKind: "existing_staff_update",
        preset,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setConfirming(false);
          setSelected([]);
          onSent?.();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirming(false); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {confirming ? "Check before sending" : `Ask ${employees.length} staff for information`}
          </DialogTitle>
        </DialogHeader>

        {confirming ? (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1">
              <Label>What they will be asked for</Label>
              <p className="text-sm text-card-foreground">
                {selected.map((k) => INFO_ITEMS.find((i) => i.key === k)?.label ?? k).join(", ")}
              </p>
            </div>
            <div className="space-y-1">
              <Label>Going to {withEmail.length} people</Label>
              <ul id="bulk-confirm-list" className="text-xs text-muted-foreground space-y-0.5">
                {withEmail.map((e) => (
                  <li key={e.id}>{e.forename} {e.surname} — {e.email}</li>
                ))}
              </ul>
            </div>
            {withoutEmail.length > 0 && (
              <p className="text-xs text-warning flex items-start gap-1">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {withoutEmail.length} selected {withoutEmail.length === 1 ? "person has" : "people have"} no email
                address, so they will not be sent anything: {withoutEmail.map((e) => `${e.forename} ${e.surname}`).join(", ")}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1" onClick={submit} disabled={send.isPending || withEmail.length === 0}>
                <Send className="h-4 w-4 mr-2" />
                {send.isPending ? "Sending..." : `Send to ${withEmail.length}`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {INFO_PRESETS.filter((p) => p.key !== "everything").map((p) => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={preset === p.key ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => { setPreset(p.key); setSelected([...p.items]); }}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {INFO_ITEMS.map((item) => (
              <label key={item.key} className="flex items-start gap-3 rounded-lg border border-border p-2.5">
                <Checkbox
                  id={`bulk-item-${item.key}`}
                  checked={selected.includes(item.key)}
                  onCheckedChange={() => toggle(item.key)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-card-foreground">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.hint}</span>
                </span>
              </label>
            ))}

            <Button className="w-full" disabled={selected.length === 0} onClick={() => setConfirming(true)}>
              Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
