import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

interface SaveTemplateDialogProps {
  branch: string;
  department: string;
  shiftCount: number;
  onSave: (name: string) => Promise<void>;
  isPending: boolean;
}

export function SaveTemplateDialog({
  branch,
  department,
  shiftCount,
  onSave,
  isPending,
}: SaveTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(name.trim());
    setName("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={shiftCount === 0}>
          <Save className="h-3.5 w-3.5" />
          Save Template
        </Button>
      </DialogTrigger>
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
