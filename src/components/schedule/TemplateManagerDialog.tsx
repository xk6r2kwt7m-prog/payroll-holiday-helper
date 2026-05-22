import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Copy, Archive, ArchiveRestore, Trash2, Loader2 } from "lucide-react";
import {
  useScheduleTemplates,
  useArchiveScheduleTemplate,
  useDuplicateScheduleTemplate,
  useSetDefaultScheduleTemplate,
  useDeleteScheduleTemplate,
} from "@/hooks/useScheduleTemplates";

interface TemplateManagerDialogProps {
  branch: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateManagerDialog({ branch, open, onOpenChange }: TemplateManagerDialogProps) {
  const [showArchived, setShowArchived] = useState(false);
  const { data: templates, isLoading } = useScheduleTemplates(branch, undefined, { includeArchived: showArchived });
  const archive = useArchiveScheduleTemplate();
  const duplicate = useDuplicateScheduleTemplate();
  const setDefault = useSetDefaultScheduleTemplate();
  const del = useDeleteScheduleTemplate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" data-testid="template-manager-dialog">
        <DialogHeader>
          <DialogTitle>Manage templates — {branch}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{templates?.length ?? 0} template{templates?.length === 1 ? "" : "s"}</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {isLoading && <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>}
          {!isLoading && (templates?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No templates yet.</p>
          )}
          {templates?.map((t) => (
            <div key={t.id} className="rounded-md border border-border p-3 text-sm" data-testid={`template-row-${t.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-1.5">
                    {t.name}
                    {t.is_default && (
                      <Badge variant="secondary" className="text-[10px] gap-1"><Star className="h-3 w-3" /> default</Badge>
                    )}
                    {t.is_archived && (
                      <Badge variant="outline" className="text-[10px]">archived</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.department} · {t.scope === "site" ? "Full site" : "Department"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {!t.is_archived && !t.is_default && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setDefault.mutate({ id: t.id, branch: t.branch, department: t.department })}
                      title="Set as default"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => duplicate.mutate({ id: t.id })}
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => archive.mutate({ id: t.id, archived: !t.is_archived })}
                    title={t.is_archived ? "Restore" : "Archive"}
                  >
                    {t.is_archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  </Button>
                  {t.is_archived && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive"
                      onClick={() => {
                        if (confirm(`Delete template "${t.name}"? This cannot be undone.`)) del.mutate(t.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
