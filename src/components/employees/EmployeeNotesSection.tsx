import { useState } from "react";
import { StickyNote, Plus, Check, Trash2, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useAdminNotes,
  useCreateAdminNote,
  useResolveAdminNote,
  useDeleteAdminNote,
} from "@/hooks/useAdminNotes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface EmployeeNotesSectionProps {
  employeeId: string;
  isAdmin: boolean;
}

export function EmployeeNotesSection({ employeeId, isAdmin }: EmployeeNotesSectionProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const { data: notes = [], isLoading } = useAdminNotes(employeeId);
  const createNote = useCreateAdminNote();
  const resolveNote = useResolveAdminNote();
  const deleteNote = useDeleteAdminNote();

  const openNotes = notes.filter((n) => n.status === "open");
  const resolvedNotes = notes.filter((n) => n.status === "resolved");

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    try {
      await createNote.mutateAsync({
        employee_id: employeeId,
        note: newNote.trim(),
      });
      setNewNote("");
      setShowAdd(false);
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveNote.mutateAsync({ id, employeeId });
      toast.success("Note resolved");
    } catch {
      toast.error("Failed to resolve note");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNote.mutateAsync({ id, employeeId });
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (!isAdmin) return null;

  return (
    <div className="space-y-3">
      {/* Open notes */}
      {openNotes.length === 0 && !showAdd && (
        <p className="text-xs text-muted-foreground italic">No open notes</p>
      )}

      {openNotes.map((note) => (
        <div
          key={note.id}
          className="rounded-md border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 space-y-2"
        >
          <p className="text-sm text-card-foreground whitespace-pre-wrap">{note.note}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDate(note.created_at)}
              {note.payroll_periods?.period_name && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
                  {note.payroll_periods.period_name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-success hover:text-success"
                onClick={() => handleResolve(note.id)}
              >
                <Check className="h-3 w-3 mr-1" />
                Resolve
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete note?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this note. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDelete(note.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ))}

      {/* Add note form */}
      {showAdd ? (
        <div className="space-y-2">
          <Textarea
            placeholder="Write your note here…"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newNote.trim() || createNote.isPending}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Save Note
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAdd(false);
                setNewNote("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Note
        </Button>
      )}

      {/* Resolved notes toggle */}
      {resolvedNotes.length > 0 && (
        <div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setShowResolved(!showResolved)}
          >
            <CheckCircle2 className="h-3 w-3" />
            {showResolved ? "Hide" : "Show"} {resolvedNotes.length} resolved{" "}
            {resolvedNotes.length === 1 ? "note" : "notes"}
          </button>

          {showResolved && (
            <div className="mt-2 space-y-2">
              {resolvedNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-md border border-border bg-muted/30 p-3 opacity-70"
                >
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-through">
                    {note.note}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      Added {formatDate(note.created_at)}
                      {note.resolved_at && ` · Resolved ${formatDate(note.resolved_at)}`}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete note?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this resolved note.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(note.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
