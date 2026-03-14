import { useState } from "react";
import { FilePlus, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDocumentRequest, REQUEST_DOCUMENT_TYPES } from "@/hooks/useDocumentRequests";
import { useEmployees } from "@/hooks/useEmployees";

interface Props {
  preselectedEmployeeId?: string;
  preselectedEmployeeName?: string;
  trigger?: React.ReactNode;
}

export function CreateDocumentRequestDialog({ preselectedEmployeeId, preselectedEmployeeName, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId || "");
  const [documentType, setDocumentType] = useState("passport");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [notes, setNotes] = useState("");

  const createRequest = useCreateDocumentRequest();
  const { data: employees = [] } = useEmployees();

  const selectedType = REQUEST_DOCUMENT_TYPES.find(t => t.value === documentType);
  const autoTitle = selectedType ? `${selectedType.label} Required` : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;

    await createRequest.mutateAsync({
      employee_id: employeeId,
      document_type: documentType,
      request_title: title.trim() || autoTitle,
      request_description: description.trim() || undefined,
      due_date: dueDate || undefined,
      priority,
      requires_verification: requiresVerification,
      notes: notes.trim() || undefined,
    });

    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    if (!preselectedEmployeeId) setEmployeeId("");
    setDocumentType("passport");
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("normal");
    setRequiresVerification(false);
    setNotes("");
  };

  // Auto-set verification for RTW types
  const handleTypeChange = (val: string) => {
    setDocumentType(val);
    if (["passport", "visa", "right_to_work", "share_code"].includes(val)) {
      setRequiresVerification(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <FilePlus className="h-4 w-4" />
            Request Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FilePlus className="h-5 w-5 text-primary" />
            </div>
            Request Document
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee */}
          {!preselectedEmployeeId ? (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(e => (e.status as string) !== "archived")
                    .map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.forename} {e.surname} — {e.department}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Requesting from: <span className="font-medium text-foreground">{preselectedEmployeeName}</span>
            </div>
          )}

          {/* Document Type */}
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_DOCUMENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.emoji} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Request Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={autoTitle}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Instructions for employee (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please upload a clear photo or scan of your document..."
              rows={2}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date (optional)
            </Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Verification Toggle */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Requires Admin Verification</Label>
              <p className="text-xs text-muted-foreground">Document must be reviewed before acceptance</p>
            </div>
            <Switch checked={requiresVerification} onCheckedChange={setRequiresVerification} />
          </div>

          {requiresVerification && ["passport", "visa", "right_to_work", "share_code"].includes(documentType) && (
            <div className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Right to Work documents require manual employer verification. AI extraction assists but does not replace the legal check.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Internal Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes, not visible to employee..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!employeeId || createRequest.isPending}>
              {createRequest.isPending ? "Creating..." : "Send Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
