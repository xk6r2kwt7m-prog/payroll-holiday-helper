import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StickyNote, Save } from "lucide-react";

type NoteStatus = "blocker" | "issue_found" | "passed" | "retest_needed";

const STATUS_OPTIONS: { value: NoteStatus; label: string; color: string }[] = [
  { value: "blocker", label: "🚫 Blocker", color: "bg-destructive/10 text-destructive border-destructive/30" },
  { value: "issue_found", label: "⚠️ Issue Found", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { value: "passed", label: "✅ Passed", color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30" },
  { value: "retest_needed", label: "🔄 Retest", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" },
];

interface QANotesAreaProps {
  sandboxId: string;
  initialNotes: string;
  initialStatus?: NoteStatus;
}

export function QANotesArea({ sandboxId, initialNotes, initialStatus }: QANotesAreaProps) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [status, setStatus] = useState<NoteStatus | undefined>(initialStatus);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("sandbox_tenants")
      .update({
        testing_notes: notes,
        qa_status: status || null,
        last_qa_note_at: new Date().toISOString(),
      } as any)
      .eq("id", sandboxId);
    setSaving(false);
    if (error) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Notes saved");
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs flex items-center gap-1.5">
        <StickyNote className="h-3 w-3" /> QA Notes
      </Label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(status === opt.value ? undefined : opt.value)}
            className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
              status === opt.value ? opt.color + " font-medium" : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Record UX issues, bugs, or observations..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="text-xs"
      />
      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleSave} disabled={saving}>
        <Save className="h-3 w-3" /> Save Notes
      </Button>
    </div>
  );
}
