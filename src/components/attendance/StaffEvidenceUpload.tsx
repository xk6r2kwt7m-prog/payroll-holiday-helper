import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMyEvidenceRequests, useMyEvidenceFiles, useUploadEvidence } from "@/hooks/useEvidence";
import { Upload, FileText, Camera, Clock, CheckCircle2, AlertCircle, XCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo } from "react";

const FILE_TYPES = [
  { value: "sick_note", label: "Sick Note" },
  { value: "fit_note", label: "Fit Note" },
  { value: "doctor_letter", label: "Doctor Letter" },
  { value: "right_to_work", label: "Right to Work" },
  { value: "identity", label: "Identity / ID" },
  { value: "return_to_work", label: "Return to Work Evidence" },
  { value: "compliance", label: "Compliance Document" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  requested: { icon: Clock, color: "text-warning border-warning/30 bg-warning/10", label: "Requested" },
  uploaded: { icon: Upload, color: "text-primary border-primary/30 bg-primary/10", label: "Uploaded" },
  pending_review: { icon: Clock, color: "text-warning border-warning/30 bg-warning/10", label: "Pending Review" },
  approved: { icon: CheckCircle2, color: "text-success border-success/30 bg-success/10", label: "Approved" },
  rejected: { icon: XCircle, color: "text-destructive border-destructive/30 bg-destructive/10", label: "Rejected" },
  more_info_requested: { icon: Info, color: "text-warning border-warning/30 bg-warning/10", label: "More Info Needed" },
};

export function StaffEvidenceUpload({ employeeId }: { employeeId: string }) {
  const { data: requests = [] } = useMyEvidenceRequests();
  const { data: files = [] } = useMyEvidenceFiles();
  const upload = useUploadEvidence();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [fileType, setFileType] = useState("other");
  const [notes, setNotes] = useState("");
  const [relatedDate, setRelatedDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingForRequest, setUploadingForRequest] = useState<string | null>(null);

  const pendingRequests = useMemo(() => requests.filter((r: any) => r.status === "requested"), [requests]);

  const handleUpload = async () => {
    if (!selectedFile) { toast.error("Please select a file"); return; }
    try {
      await upload.mutateAsync({
        employeeId,
        file: selectedFile,
        fileType,
        notes: notes || undefined,
        relatedDate: relatedDate || undefined,
        requestId: uploadingForRequest || undefined,
      });
      toast.success("Evidence uploaded successfully");
      setShowUpload(false);
      setSelectedFile(null);
      setNotes("");
      setRelatedDate("");
      setUploadingForRequest(null);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
  };

  const startUploadForRequest = (requestId: string) => {
    setUploadingForRequest(requestId);
    setShowUpload(true);
  };

  return (
    <div className="space-y-4">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Evidence Requested ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((req: any) => (
              <div key={req.id} className="p-3 rounded-lg border border-warning/20 bg-warning/5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{req.title}</p>
                    {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{FILE_TYPES.find(t => t.value === req.request_type)?.label || req.request_type}</span>
                      {req.due_date && <span>· Due {format(new Date(req.due_date), "d MMM yyyy")}</span>}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => startUploadForRequest(req.id)}>
                    <Upload className="h-3 w-3 mr-1" /> Upload
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload Form */}
      {showUpload ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upload Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-center gap-3">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Tap to take photo or select file</p>
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
                capture="environment"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger><SelectValue placeholder="Document Type" /></SelectTrigger>
              <SelectContent>
                {FILE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={relatedDate}
              onChange={(e) => setRelatedDate(e.target.value)}
              placeholder="Related date (optional)"
            />

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note (optional)"
              rows={2}
            />

            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={upload.isPending || !selectedFile} className="flex-1">
                {upload.isPending ? "Uploading..." : "Upload"}
              </Button>
              <Button variant="outline" onClick={() => { setShowUpload(false); setUploadingForRequest(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" /> Upload Evidence / Document
        </Button>
      )}

      {/* Uploaded Files */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> My Uploads ({files.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.map((file: any) => {
              const sc = STATUS_CONFIG[file.review_status] || STATUS_CONFIG.pending_review;
              const Icon = sc.icon;
              return (
                <div key={file.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {FILE_TYPES.find(t => t.value === file.file_type)?.label || file.file_type}
                        {file.related_date && ` · ${format(new Date(file.related_date), "d MMM yyyy")}`}
                      </p>
                      {file.review_notes && (
                        <p className="text-xs text-warning mt-0.5">{file.review_notes}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-xs flex-shrink-0 ml-2", sc.color)}>
                    <Icon className="h-3 w-3 mr-1" /> {sc.label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
