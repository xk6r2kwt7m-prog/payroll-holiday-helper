import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Pencil, Copy, Trash2, Clock, MapPin, FileText, ArrowRightLeft, AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MobileShiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: any;
  employeeName: string;
  branch: string;
  department: string;
  isAdmin: boolean;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onMove?: () => void;
  onUpdate?: (id: string, updates: any) => Promise<void>;
  warnings?: string[];
}

export function MobileShiftSheet({
  open,
  onOpenChange,
  shift,
  employeeName,
  branch,
  department,
  isAdmin,
  onEdit,
  onCopy,
  onDelete,
  onMove,
  onUpdate,
  warnings = [],
}: MobileShiftSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPublished, setEditPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const totalInfo = useMemo(() => {
    if (!shift) return { hours: 0, hoursStr: "0h 0m" };
    const st = isEditing ? editStart : shift.start_time;
    const et = isEditing ? editEnd : shift.end_time;
    const [sh, sm] = (st || "00:00").split(":").map(Number);
    const [eh, em] = (et || "00:00").split(":").map(Number);
    let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const hours = totalMinutes / 60;
    return {
      hours,
      hoursStr: `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`,
    };
  }, [shift, isEditing, editStart, editEnd]);

  if (!shift) return null;

  const shiftDate = new Date(shift.shift_date + "T00:00:00");
  const isPublished = isEditing ? editPublished : shift.is_published;

  const startEditing = () => {
    setEditStart(shift.start_time?.slice(0, 5) || "");
    setEditEnd(shift.end_time?.slice(0, 5) || "");
    setEditNotes(shift.notes || "");
    setEditPublished(shift.is_published || false);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEdits = async () => {
    if (!onUpdate) {
      // Fallback to full edit dialog
      onEdit();
      return;
    }
    setIsSaving(true);
    try {
      await onUpdate(shift.id, {
        start_time: editStart,
        end_time: editEnd,
        notes: editNotes || null,
        is_published: editPublished,
        published_at: editPublished && !shift.is_published ? new Date().toISOString() : shift.published_at,
      });
      setIsEditing(false);
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (shift.is_published) {
      if (!confirm("This shift is published and visible to staff. Delete it?")) return;
    }
    onDelete();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) { setIsEditing(false); } onOpenChange(o); }}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
              shift.employee_id ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
            )}>
              {employeeName?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-left">{employeeName || "Open Shift"}</DrawerTitle>
              <DrawerDescription className="text-left">
                {format(shiftDate, "EEE d MMM")} · {totalInfo.hoursStr}
              </DrawerDescription>
            </div>
            <Badge
              variant={isPublished ? "default" : "secondary"}
              className={cn(
                "text-[10px] shrink-0",
                isPublished
                  ? "bg-success text-success-foreground"
                  : "bg-primary/15 text-primary border border-primary/25"
              )}
            >
              {isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
        </DrawerHeader>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="px-4 pb-2">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shift details / edit mode */}
        <div className="px-4 py-3 space-y-3">
          {isEditing ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Start</label>
                  <Input
                    type="time"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="h-11 text-base text-center font-mono"
                  />
                </div>
                <div className="pt-4 text-muted-foreground text-sm">→</div>
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">End</label>
                  <Input
                    type="time"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="h-11 text-base text-center font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Shift notes..."
                  className="h-16 text-sm resize-none"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">Published</span>
                <Switch checked={editPublished} onCheckedChange={setEditPublished} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">
                  {shift.start_time?.slice(0, 5)} — {shift.end_time?.slice(0, 5)}
                </span>
                <span className="text-muted-foreground ml-auto">{totalInfo.hoursStr}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{branch} · {department}</span>
              </div>
              {shift.notes && (
                <div className="flex items-start gap-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{shift.notes}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        {isAdmin && (
          <DrawerFooter className="pt-2">
            {isEditing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={cancelEditing}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-12 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={saveEdits}
                  disabled={isSaving}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-14 flex-col gap-1.5"
                  onClick={startEditing}
                >
                  <Pencil className="h-5 w-5" />
                  <span className="text-xs">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-14 flex-col gap-1.5"
                  onClick={() => onMove?.()}
                >
                  <ArrowRightLeft className="h-5 w-5" />
                  <span className="text-xs">Move</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-14 flex-col gap-1.5"
                  onClick={() => onCopy()}
                >
                  <Copy className="h-5 w-5" />
                  <span className="text-xs">Copy</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-14 flex-col gap-1.5 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="text-xs">Delete</span>
                </Button>
              </div>
            )}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
