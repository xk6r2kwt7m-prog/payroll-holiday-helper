import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, ArrowLeft, FolderOpen, Calendar, History } from "lucide-react";
import { useScheduleTemplates, useDeleteScheduleTemplate } from "@/hooks/useScheduleTemplates";
import { format } from "date-fns";

type Scope = "site" | "FOH" | "BOH" | "CPU" | "last_used" | "another_week";

const LAST_USED_KEY = (branch: string) => `schedule:lastUsedTemplate:${branch}`;

interface LoadTemplateDialogProps {
  branch: string;
  department: string;
  onLoad: (templateId: string) => Promise<void>;
  isPending: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCopyFromAnotherWeek?: () => void;
  onManageTemplates?: () => void;
}

const SCOPE_OPTIONS: { id: Scope; label: string; description: string }[] = [
  { id: "site", label: "Load full site template", description: "All departments at this site" },
  { id: "FOH", label: "Load FOH template", description: "Front of house shifts only" },
  { id: "BOH", label: "Load BOH template", description: "Back of house shifts only" },
  { id: "CPU", label: "Load CPU template", description: "Central production shifts only" },
  { id: "last_used", label: "Load last used template", description: "Re-apply your most recent template" },
  { id: "another_week", label: "Load from another week", description: "Copy a previous week's rota" },
];

export function LoadTemplateDialog({
  branch,
  department,
  onLoad,
  isPending,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCopyFromAnotherWeek,
  onManageTemplates,
}: LoadTemplateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [scope, setScope] = useState<Scope | null>(null);

  // Reset when dialog closes
  useEffect(() => {
    if (!isOpen) setScope(null);
  }, [isOpen]);

  const filterDept = useMemo<string | undefined>(() => {
    if (scope === "FOH" || scope === "BOH" || scope === "CPU") return scope;
    return undefined; // site = all departments
  }, [scope]);

  const { data: templates, isLoading } = useScheduleTemplates(branch, filterDept);
  const deleteTemplate = useDeleteScheduleTemplate();

  // Auto-load "last used"
  useEffect(() => {
    if (scope !== "last_used") return;
    const id = typeof window !== "undefined" ? window.localStorage.getItem(LAST_USED_KEY(branch)) : null;
    if (!id) return;
    (async () => {
      await onLoad(id);
      setOpen(false);
    })();
  }, [scope, branch, onLoad, setOpen]);

  // Trigger "another week"
  useEffect(() => {
    if (scope !== "another_week") return;
    setOpen(false);
    onCopyFromAnotherWeek?.();
  }, [scope, onCopyFromAnotherWeek, setOpen]);

  const handleLoad = async (templateId: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_USED_KEY(branch), templateId);
    }
    await onLoad(templateId);
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[460px]" data-testid="load-template-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {scope && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -ml-2"
                onClick={() => setScope(null)}
                data-testid="load-template-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {scope ? `Templates · ${scope === "site" ? "Full site" : scope === "last_used" ? "Last used" : scope === "another_week" ? "Another week" : scope}` : "Load template"}
          </DialogTitle>
          {!scope && (
            <p className="text-xs text-muted-foreground mt-1">
              Choose how you want to load shifts for {branch}.
            </p>
          )}
        </DialogHeader>

        {!scope && (
          <div className="grid grid-cols-1 gap-1.5 py-2" data-testid="load-template-scope-list">
            {SCOPE_OPTIONS.map((opt) => {
              const Icon = opt.id === "another_week" ? Calendar : opt.id === "last_used" ? History : FolderOpen;
              return (
                <button
                  key={opt.id}
                  onClick={() => setScope(opt.id)}
                  data-testid={`load-template-option-${opt.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {scope && scope !== "last_used" && scope !== "another_week" && (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pt-1" data-testid="load-template-list">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !templates?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No templates saved yet for this scope.
              </p>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  data-testid={`template-row-${t.id}`}
                  data-template-department={t.department}
                >
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.department} · Created {format(new Date(t.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleLoad(t.id)}
                      disabled={isPending}
                      className="h-7 text-xs"
                    >
                      {isPending ? "Loading..." : "Apply"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteTemplate.mutate(t.id)}
                      disabled={deleteTemplate.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {scope === "last_used" && (
          <p className="text-sm text-muted-foreground py-6 text-center" data-testid="load-template-last-used">
            {typeof window !== "undefined" && window.localStorage.getItem(LAST_USED_KEY(branch))
              ? "Applying last used template…"
              : "No previously used template for this site yet."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
