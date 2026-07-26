import { useState } from "react";
import { StickyNote, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  usePayrollPeriodNotes,
  useCreatePayrollPeriodNote,
  useDeletePayrollPeriodNote,
  useUpdatePayrollPeriodNoteVisibility,
} from "@/hooks/usePayrollPeriodNotes";

interface PayrollPeriodNotesProps {
  periodId: string;
  periodName: string;
  employees: { id: string; name: string }[];
  isAdmin: boolean;
}

export function PayrollPeriodNotesSection({
  periodId,
  periodName,
  employees,
  isAdmin,
}: PayrollPeriodNotesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [noteText, setNoteText] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [showOnPdf, setShowOnPdf] = useState(false);

  const { data: notes = [] } = usePayrollPeriodNotes(periodId);
  const createNote = useCreatePayrollPeriodNote();
  const deleteNote = useDeletePayrollPeriodNote();
  const updateVisibility = useUpdatePayrollPeriodNoteVisibility();

  const handleCreate = async () => {
    if (!selectedEmployee || !noteText.trim()) return;
    try {
      await createNote.mutateAsync({
        payroll_period_id: periodId,
        employee_id: selectedEmployee,
        note: noteText.trim(),
        category,
        show_on_pdf: showOnPdf,
      });
      toast.success(showOnPdf ? "Note added — will appear on PDF" : "Internal note added");
      setDialogOpen(false);
      setNoteText("");
      setSelectedEmployee("");
      setCategory("other");
      setShowOnPdf(false);
    } catch {
      toast.error("Failed to add note");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNote.mutateAsync(id);
      toast.success("Note removed");
    } catch {
      toast.error("Failed to remove note");
    }
  };

  if (notes.length === 0 && !isAdmin) return null;

  const getEmployeeName = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    return emp?.name || "Unknown";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-border bg-card p-4 space-y-2 animate-fade-in">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between gap-2 w-full text-left group">
            <div className="flex items-center gap-2 min-w-0">
              <StickyNote className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="font-semibold text-card-foreground text-sm">
                Period Notes
              </h3>
              {notes.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {notes.length}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">Internal only — not in exports</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 pt-1">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add note
            </Button>
          )}

          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No notes for {periodName}. Notes added here are private to managers by default, and are only included in the PDF/export when "Include Period Notes" is enabled in the Report Builder.
            </p>
          ) : (
            <div className="grid gap-2">
              {notes.map((note) => (
                <div key={note.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {getEmployeeName(note.employee_id)}
                      {note.category && (
                        <span className="ml-2 text-[10px] font-normal text-muted-foreground uppercase tracking-wide">
                          {note.category}
                        </span>
                      )}
                      {note.show_on_pdf && (
                        <Badge variant="outline" className="ml-2 text-[10px]">PDF</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{note.note}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(note.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Checkbox
                          checked={note.show_on_pdf}
                          onCheckedChange={(v) =>
                            updateVisibility.mutate({ id: note.id, show_on_pdf: v === true })
                          }
                        />
                        Show on PDF
                      </label>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(note.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Period Note</DialogTitle>
            <p className="text-xs text-muted-foreground">
              This note belongs to <strong>{periodName}</strong> only and stays private by default. It is only included in the PDF/export when <strong>Include Period Notes</strong> is enabled in the Report Builder.
            </p>
          </DialogHeader>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Internal note (e.g. hours reduced by agreement, bonus arrangement)"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedEmployee || !noteText.trim() || createNote.isPending}
            >
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
