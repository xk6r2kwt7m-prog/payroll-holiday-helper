import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateEvidenceRequest } from "@/hooks/useEvidence";
import { useEmployees } from "@/hooks/useEmployees";
import { FileQuestion } from "lucide-react";
import { toast } from "sonner";

const REQUEST_TYPES = [
  { value: "sick_note", label: "Sick Note" },
  { value: "fit_note", label: "Fit Note" },
  { value: "doctor_letter", label: "Doctor Letter" },
  { value: "right_to_work", label: "Right to Work" },
  { value: "identity", label: "Identity / ID" },
  { value: "return_to_work", label: "Return to Work" },
  { value: "compliance", label: "Compliance" },
  { value: "general", label: "General" },
];

export function EvidenceRequestDialog({ trigger, preselectedEmployeeId }: { trigger?: React.ReactNode; preselectedEmployeeId?: string }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId || "");
  const [requestType, setRequestType] = useState("general");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [relatedDate, setRelatedDate] = useState("");

  const createRequest = useCreateEvidenceRequest();
  const { data: employees } = useEmployees();

  const handleSubmit = async () => {
    if (!employeeId || !title) {
      toast.error("Employee and title are required");
      return;
    }
    try {
      await createRequest.mutateAsync({
        employee_id: employeeId,
        request_type: requestType,
        title,
        description: description || undefined,
        due_date: dueDate || undefined,
        related_date: relatedDate || undefined,
      });
      toast.success("Evidence request sent");
      setOpen(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      setRelatedDate("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileQuestion className="h-4 w-4 mr-2" /> Request Evidence
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Evidence from Staff</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!preselectedEmployeeId && (
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
              <SelectContent>
                {employees?.filter((e: any) => e.status === "active").map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.forename} {e.surname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={requestType} onValueChange={setRequestType}>
            <SelectTrigger><SelectValue placeholder="Document Type" /></SelectTrigger>
            <SelectContent>
              {REQUEST_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Request title *"
          />

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instructions for the employee (optional)"
            rows={2}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Related Date</label>
              <Input type="date" value={relatedDate} onChange={(e) => setRelatedDate(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={createRequest.isPending} className="w-full">
            {createRequest.isPending ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
