import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";
import { useLocationSettings, useUpdateLocationSettings } from "@/hooks/useLocationSettings";
import { SITE_FIELD_HELP, SITE_FIELD_LABELS, type SiteFieldKey } from "@/data/induction/ud-induction-2026";

const FIELDS = Object.keys(SITE_FIELD_LABELS) as SiteFieldKey[];

/**
 * Fire, first-aid and temperature-check details for one branch.
 * Entered once here and shown automatically in every induction for that site.
 */
export function SiteEmergencyDetailsCard({ branch }: { branch: string }) {
  const { data: settings = [] } = useLocationSettings();
  const update = useUpdateLocationSettings();
  const row: any = settings.find((s: any) => s.branch === branch);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!row) return;
    const next: Record<string, string> = {};
    FIELDS.forEach((f) => { next[f] = row[f] ?? ""; });
    setValues(next);
  }, [row?.id, branch]);

  if (!row) {
    return (
      <p className="text-sm text-muted-foreground">
        Add this location in Settings first, then its fire and first-aid details can be recorded here.
      </p>
    );
  }

  const dirty = FIELDS.some((f) => (values[f] ?? "") !== (row[f] ?? ""));

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Flame className="h-4 w-4 text-primary" />
        <div>
          <p className="text-sm font-semibold">Fire, first aid and checks — {branch}</p>
          <p className="text-xs text-muted-foreground">
            Entered once. Every induction for this site shows these details automatically.
          </p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {FIELDS.map((f) => (
          <div key={f} className="space-y-1">
            <Label className="text-xs">{SITE_FIELD_LABELS[f]}</Label>
            <Input
              value={values[f] ?? ""}
              placeholder={SITE_FIELD_HELP[f]}
              onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
            />
          </div>
        ))}
        <Button
          className="w-full"
          disabled={!dirty || update.isPending}
          onClick={() => {
            const payload: Record<string, string | null> = {};
            FIELDS.forEach((f) => { payload[f] = values[f]?.trim() || null; });
            update.mutate({ id: row.id, ...(payload as any) });
          }}
        >
          {update.isPending ? "Saving..." : "Save site details"}
        </Button>
      </div>
    </div>
  );
}
