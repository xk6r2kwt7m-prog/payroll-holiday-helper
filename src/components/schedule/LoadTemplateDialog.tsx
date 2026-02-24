import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FolderOpen, Trash2, Loader2 } from "lucide-react";
import { useScheduleTemplates, useDeleteScheduleTemplate } from "@/hooks/useScheduleTemplates";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LoadTemplateDialogProps {
  branch: string;
  department: string;
  onLoad: (templateId: string) => Promise<void>;
  isPending: boolean;
}

export function LoadTemplateDialog({
  branch,
  department,
  onLoad,
  isPending,
}: LoadTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: templates, isLoading } = useScheduleTemplates(branch, department);
  const deleteTemplate = useDeleteScheduleTemplate();

  const handleLoad = async (templateId: string) => {
    await onLoad(templateId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FolderOpen className="h-3.5 w-3.5" />
          Load Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Load Template</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {department} templates for {branch}
          </p>
        </DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !templates?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No templates saved yet for {department} at {branch}.
            </p>
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Created {format(new Date(t.created_at), "d MMM yyyy")}
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
      </DialogContent>
    </Dialog>
  );
}
