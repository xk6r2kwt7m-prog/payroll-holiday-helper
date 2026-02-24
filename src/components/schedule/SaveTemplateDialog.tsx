import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SaveTemplateDialogProps {
  branch: string;
  department: string;
  shiftCount: number;
  onSave: (name: string) => Promise<void>;
  isPending: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SaveTemplateDialog({
  branch,
  department,
  shiftCount,
  onSave,
  isPending,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SaveTemplateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState("");

  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(name.trim());
    setName("");
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Save the current {department} rota for {branch} ({shiftCount} shifts) as a reusable template.
          </p>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs">Template Name</Label>
            <Input
              className="h-9"
              placeholder="e.g. Busy Saturday, Bank Holiday..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <Button onClick={handleSave} disabled={isPending || !name.trim()} className="w-full" size="sm">
            {isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
