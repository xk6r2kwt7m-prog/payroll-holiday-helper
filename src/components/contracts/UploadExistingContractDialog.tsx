import { useMemo, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/hooks/useEmployees";
import { useTenant } from "@/hooks/useTenant";
import { cn } from "@/lib/utils";

interface UploadExistingContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Store a contract that was signed outside the system (paper or emailed PDF).
 * The uploaded file is kept exactly as provided and recorded as already signed,
 * so it is locked from editing like any other signed contract. No signing
 * request is created and nobody is emailed.
 */
export function UploadExistingContractDialog({ open, onOpenChange }: UploadExistingContractDialogProps) {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { data: employees } = useEmployees();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [employeeId, setEmployeeId] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [signedOn, setSignedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);

  // Old contracts can belong to people who have since left, so every staff
  // record is selectable here — not only current team members.
  const sortedEmployees = useMemo(
    () =>
      (employees || [])
        .slice()
        .sort((a, b) => `${a.forename} ${a.surname}`.localeCompare(`${b.forename} ${b.surname}`)),
    [employees],
  );

  const reset = () => {
    setEmployeeId("");
    setDocumentName("");
    setSignedOn("");
    setNotes("");
    setFile(null);
    setSaving(false);
  };

  const acceptFile = (selected: File) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(selected.type)) {
      toast({
        title: "File type not supported",
        description: "Upload a PDF, a photo of the signed pages, or a Word document.",
        variant: "destructive",
      });
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 50MB.", variant: "destructive" });
      return;
    }
    setFile(selected);
    if (!documentName) setDocumentName(selected.name.replace(/\.[^/.]+$/, ""));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) acceptFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    if (!employeeId) {
      toast({ title: "Choose the staff member", description: "Pick who this contract belongs to.", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Add the file", description: "Choose the contract file to store.", variant: "destructive" });
      return;
    }
    if (!documentName.trim()) {
      toast({ title: "Name it", description: "Give the contract a name.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop();
      const path = `${employeeId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const isPdf = file.type === "application/pdf";
      const { data: inserted, error } = await supabase
        .from("employee_documents")
        .insert({
          tenant_id: tenantId,
          employee_id: employeeId,
          document_type: "contract",
          document_name: documentName.trim(),
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          notes: notes.trim() || null,
          uploaded_by: auth?.user?.id ?? null,
          // Already signed off system: locked from editing, no signing request,
          // no emails. The uploaded file is the record of the signed contract.
          contract_state: "signed",
          version_number: 1,
          requires_details_first: false,
          effective_date: signedOn || null,
          signed_scan_file_path: path,
          signed_scan_uploaded_at: new Date().toISOString(),
          final_signed_pdf_url: isPdf ? path : null,
          extraction_source: "manual_upload",
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("document_audit_log").insert({
        document_id: (inserted as { id: string }).id,
        employee_id: employeeId,
        tenant_id: tenantId,
        action: "contract_uploaded_existing",
        performed_by: auth?.user?.id ?? null,
        metadata: {
          file_name: file.name,
          signed_on: signedOn || null,
          source: "uploaded_signed_outside_system",
        },
      } as never);

      queryClient.invalidateQueries({ queryKey: ["all_contracts"] });
      queryClient.invalidateQueries({ queryKey: ["employee_documents", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["contracts_awaiting_review"] });
      toast({
        title: "Contract stored",
        description: "It is filed against their record as already signed. Nobody was emailed.",
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Could not store contract", description: (err as Error).message, variant: "destructive" });
      setSaving(false);
    }
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload an existing contract</DialogTitle>
          <DialogDescription>
            For contracts already signed on paper or by email. The file is stored exactly as you
            provide it and marked as signed — no signing request is created and nobody is emailed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Staff member</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose who this contract belongs to" />
              </SelectTrigger>
              <SelectContent>
                {sortedEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.forename} {emp.surname}
                    {emp.status !== "active" ? ` · ${emp.status}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl p-6 transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-border",
              file && "border-success bg-success/5",
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Drag the file here, or</p>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Choose file
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF, photos of signed pages, or Word documents up to 50MB
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Contract name</Label>
            <Input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g. Employment contract 2023"
            />
          </div>

          <div className="space-y-2">
            <Label>Date signed (optional)</Label>
            <Input type="date" value={signedOn} onChange={(e) => setSignedOn(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              The date on the paper contract, if you know it.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth recording about this contract..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving || !file || !employeeId}>
              {saving ? "Storing..." : "Store contract"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
