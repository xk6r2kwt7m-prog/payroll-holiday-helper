import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Upload, ExternalLink, CalendarClock } from "lucide-react";
import { expiryLabel, expiryTone } from "@/lib/compliance-expiry";
import {
  useComplianceCertificates, useSaveComplianceCertificate,
  uploadComplianceFile, complianceFileUrl,
} from "@/hooks/useCompliance";
import { useTenantBranches } from "@/hooks/useBranches";
import { useTenant } from "@/hooks/useTenant";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  red: "bg-destructive/10 text-destructive",
  amber: "bg-warning/10 text-warning",
  green: "bg-success/10 text-success",
  grey: "bg-muted text-muted-foreground",
};

const RENEWAL_STATUSES = ["current", "renewal_started", "renewed", "lapsed"] as const;

export function CertificatesSection({ branchFilter }: { branchFilter?: string }) {
  const { tenantId } = useTenant();
  const { data: branches = [] } = useTenantBranches();
  const { data: certs = [], isLoading } = useComplianceCertificates(branchFilter);
  const save = useSaveComplianceCertificate();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    branch: branchFilter || "",
    certificate_type: "",
    certificate_number: "",
    holder_name: "",
    issue_date: "",
    expiry_date: "",
    renewal_status: "current",
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.branch || !form.certificate_type.trim()) {
      toast.error("Choose the branch and what this certificate is");
      return;
    }
    setSaving(true);
    try {
      let filePath: string | null = null;
      let receiptPath: string | null = null;
      if (file && tenantId) filePath = await uploadComplianceFile(file, tenantId, "certificates");
      if (receipt && tenantId) receiptPath = await uploadComplianceFile(receipt, tenantId, "certificates");
      await save.mutateAsync({
        ...form,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        file_path: filePath,
        receipt_path: receiptPath,
      });
      toast.success("Certificate saved — reminders start 90 days before expiry");
      setOpen(false);
      setFile(null); setReceipt(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openFile = async (path: string | null) => {
    if (!path) { toast.error("No file stored"); return; }
    const url = await complianceFileUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Could not open the file");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Certificates and expiry</h2>
          <p className="text-xs text-muted-foreground">Reminders at 90, 60 and 30 days, and on the expiry date.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
      ) : certs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <CalendarClock className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No certificates recorded</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add licences, permits and certificates with their expiry dates to get reminders.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {certs.map((c: any) => {
            const tone = expiryTone(c.expiry_date);
            return (
              <div key={c.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{c.certificate_type}</p>
                    {c.expiry_date && (
                      <Badge className={cn("text-[10px]", toneClass[tone])}>{expiryLabel(c.expiry_date)}</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">{c.renewal_status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.branch}
                    {c.certificate_number ? ` · ${c.certificate_number}` : ""}
                    {c.holder_name ? ` · ${c.holder_name}` : ""}
                  </p>
                  {c.notes && <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openFile(c.file_path)}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  {c.receipt_path && (
                    <Button size="sm" variant="ghost" onClick={() => openFile(c.receipt_path)}>Receipt</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add certificate or licence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => setForm(f => ({ ...f, branch: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>What is it?</Label>
              <Input
                placeholder="e.g. Premises licence, personal licence, gas safety"
                value={form.certificate_type}
                onChange={(e) => setForm(f => ({ ...f, certificate_type: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Number</Label>
                <Input value={form.certificate_number} onChange={(e) => setForm(f => ({ ...f, certificate_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Named holder</Label>
                <Input value={form.holder_name} onChange={(e) => setForm(f => ({ ...f, holder_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Issue date</Label>
                <Input type="date" value={form.issue_date} onChange={(e) => setForm(f => ({ ...f, issue_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry date</Label>
                <Input type="date" value={form.expiry_date} onChange={(e) => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Renewal status</Label>
              <Select value={form.renewal_status} onValueChange={(v) => setForm(f => ({ ...f, renewal_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RENEWAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 cursor-pointer text-xs text-muted-foreground">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Certificate file"}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 cursor-pointer text-xs text-muted-foreground">
                <Upload className="h-4 w-4" />
                {receipt ? receipt.name : "Payment receipt"}
                <input type="file" className="hidden" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
