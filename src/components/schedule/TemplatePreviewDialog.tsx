import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, UserX, Building2 } from "lucide-react";
import type { TemplatePreview, ApplyMode } from "@/lib/schedule-template-preview";

interface TemplatePreviewDialogProps {
  preview: TemplatePreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: ApplyMode) => Promise<void>;
  isPending?: boolean;
}

export function TemplatePreviewDialog({
  preview, open, onOpenChange, onConfirm, isPending,
}: TemplatePreviewDialogProps) {
  const hasExistingDraft = (preview?.existingDraftCount ?? 0) > 0;
  const hasExistingPublished = (preview?.existingPublishedCount ?? 0) > 0;

  const warningGroups = useMemo(() => {
    const map = new Map<string, number>();
    preview?.shifts.forEach((s) =>
      s.warnings.forEach((w) => map.set(w, (map.get(w) ?? 0) + 1))
    );
    return Array.from(map.entries());
  }, [preview]);

  if (!preview) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]" data-testid="template-preview-dialog">
        <DialogHeader>
          <DialogTitle>Preview: {preview.templateName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={<Users className="h-3.5 w-3.5" />} label="Assigned" value={preview.assignedShifts} />
            <Stat icon={<UserX className="h-3.5 w-3.5" />} label="Unassigned" value={preview.unassignedShifts} tone={preview.unassignedShifts > 0 ? "warn" : "ok"} />
            <Stat icon={<Building2 className="h-3.5 w-3.5" />} label="Total" value={preview.totalShifts} />
          </div>

          <div className="text-xs text-muted-foreground">
            Departments: {preview.affectedDepartments.length > 0 ? preview.affectedDepartments.join(", ") : "—"}
          </div>

          {warningGroups.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-50 p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> {preview.warnings} warning{preview.warnings !== 1 ? "s" : ""}
              </div>
              <div className="flex flex-wrap gap-1">
                {warningGroups.map(([code, n]) => (
                  <Badge key={code} variant="outline" className="text-[10px] border-amber-400 text-amber-800">
                    {code.replace(/_/g, " ")} × {n}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(hasExistingDraft || hasExistingPublished) && (
            <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs space-y-1">
              <div className="font-medium">Existing shifts in this week</div>
              {hasExistingDraft && <div>• {preview.existingDraftCount} draft shift{preview.existingDraftCount !== 1 ? "s" : ""}</div>}
              {hasExistingPublished && (
                <div className="text-destructive">• {preview.existingPublishedCount} published shift{preview.existingPublishedCount !== 1 ? "s" : ""} (always protected)</div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <Button
            onClick={() => onConfirm("add_only")}
            disabled={isPending}
            data-testid="template-preview-add-only"
          >
            Add template shifts only
          </Button>
          {hasExistingDraft && (
            <Button
              variant="outline"
              onClick={() => onConfirm("replace_draft")}
              disabled={isPending}
              data-testid="template-preview-replace-draft"
            >
              Replace existing draft shifts
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon, label, value, tone = "ok" }: { icon: React.ReactNode; label: string; value: number; tone?: "ok" | "warn" }) {
  return (
    <div className={`rounded-md border px-2 py-1.5 ${tone === "warn" ? "border-amber-400/40 bg-amber-50" : "border-border bg-card"}`}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="text-lg font-semibold leading-tight">{value}</div>
    </div>
  );
}
