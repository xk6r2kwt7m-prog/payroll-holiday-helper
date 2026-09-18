import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Send, ChevronLeft, AlertTriangle } from "lucide-react";
import type { Employee } from "@/hooks/useEmployees";
import { useSendInfoRequest } from "@/hooks/useInfoRequests";
import { INFO_ITEMS, INFO_PRESETS, infoItemLabel, type InfoItemKey } from "@/lib/info-request-items";
import { useBulkInfoCoverage } from "@/hooks/useInfoCoverage";
import { missingItems, REASKABLE_ITEMS } from "@/lib/info-request-coverage";

/**
 * Asks several existing staff for the same information in one go.
 * A confirm step lists every person and address before anything is sent, and
 * people with no email on record are shown as skipped rather than silently lost.
 *
 * Each person is only asked for the ticked items their own record is missing —
 * nobody is asked to retype something the system already holds. Anyone whose
 * record already covers everything ticked is left out and shown as such.
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
  const [onlyMissing, setOnlyMissing] = useState(true);
  const send = useSendInfoRequest();

  const withEmail = useMemo(() => employees.filter((e) => !!e.email), [employees]);
  const withoutEmail = useMemo(() => employees.filter((e) => !e.email), [employees]);

  const { data: coverage, isLoading: coverageLoading } = useBulkInfoCoverage(
    withEmail.map((e) => e.id),
    open,
  );

  /** What each person would actually be asked for. */
  const perPerson = useMemo(() => {
    return withEmail.map((e) => {
      const cover = coverage?.[e.id];
      const items =
        onlyMissing && cover
          ? Array.from(
              new Set([
                ...missingItems(selected, cover),
                ...selected.filter((k) => REASKABLE_ITEMS.includes(k)),
              ]),
            )
          : [...selected];
      return { employee: e, items };
    });
  }, [withEmail, coverage, onlyMissing, selected]);

  const toAsk = perPerson.filter((p) => p.items.length > 0);
  const fullyCovered = perPerson.filter((p) => p.items.length === 0);

  const toggle = (key: InfoItemKey) =>
    setSelected((s) => {
      setPreset(null);
      return s.includes(key) ? s.filter((k) => k !== key) : [...s, key];
    });

  const submit = async () => {
    // Group people who need the same items so each group gets its own request.
    const groups = new Map<string, { ids: string[]; items: InfoItemKey[] }>();
    for (const p of toAsk) {
      const key = [...p.items].sort().join("|");
      const g = groups.get(key) ?? { ids: [], items: p.items };
      g.ids.push(p.employee.id);
      groups.set(key, g);
    }
    let failed = false;
    for (const g of groups.values()) {
      try {
        await send.mutateAsync({
          employeeIds: g.ids,
          sections: g.items,
          requestKind: "existing_staff_update",
          preset,
        });
      } catch {
        failed = true;
      }
    }
    if (!failed) {
      setOpen(false);
      setConfirming(false);
      setSelected([]);
      onSent?.();
    }
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
              <Label>What was ticked</Label>
              <p className="text-sm text-card-foreground">
                {selected.map((k) => infoItemLabel(k)).join(", ")}
              </p>
              {onlyMissing && (
                <p className="text-xs text-muted-foreground">
                  Each person is only asked for the ones missing from their own record.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Going to {toAsk.length} {toAsk.length === 1 ? "person" : "people"}</Label>
              <ul id="bulk-confirm-list" className="text-xs text-muted-foreground space-y-0.5">
                {toAsk.map(({ employee: e, items }) => (
                  <li key={e.id}>
                    {e.forename} {e.surname} — {e.email}
                    {onlyMissing && (
                      <span className="text-muted-foreground"> · {items.map((k) => infoItemLabel(k)).join(", ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {fullyCovered.length > 0 && (
              <p id="bulk-covered-note" className="text-xs text-muted-foreground">
                Not asked, because we already hold everything ticked for them:{" "}
                {fullyCovered.map(({ employee: e }) => `${e.forename} ${e.surname}`).join(", ")}
              </p>
            )}
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
              <Button className="flex-1" onClick={submit} disabled={send.isPending || toAsk.length === 0}>
                <Send className="h-4 w-4 mr-2" />
                {send.isPending ? "Sending..." : `Send to ${toAsk.length}`}
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

            <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-2.5">
              <Checkbox
                id="bulk-only-missing"
                checked={onlyMissing}
                onCheckedChange={(v) => setOnlyMissing(v === true)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-card-foreground">
                  Only ask each person for what we don't already hold
                </span>
                <span className="block text-xs text-muted-foreground">
                  {coverageLoading
                    ? "Checking what is already on record..."
                    : "Right to work items are still asked for, because they can expire."}
                </span>
              </span>
            </label>

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
