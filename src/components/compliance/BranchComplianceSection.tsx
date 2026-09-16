import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Upload, ExternalLink, Building2, Link2 } from "lucide-react";
import { COMPLIANCE_CATEGORIES } from "@/lib/compliance-taxonomy";
import { expiryLabel, expiryTone, resolveExpiryBand } from "@/lib/compliance-expiry";
import {
  useBranchComplianceItems, useSaveBranchComplianceItem, useComplianceDocuments,
  uploadComplianceFile, complianceFileUrl,
} from "@/hooks/useCompliance";
import { useTenant } from "@/hooks/useTenant";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  red: "bg-destructive/10 text-destructive",
  amber: "bg-warning/10 text-warning",
  green: "bg-success/10 text-success",
  grey: "bg-muted text-muted-foreground",
};

export function BranchComplianceSection({ branch }: { branch: string }) {
  const { tenantId } = useTenant();
  const { data: items = [], isLoading } = useBranchComplianceItems(branch);
  const { data: libraryDocs = [] } = useComplianceDocuments();
  const saveItem = useSaveBranchComplianceItem();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(COMPLIANCE_CATEGORIES[0]);
  const [expiry, setExpiry] = useState("");
  const [notes, setNotes] = useState("");
  const [inspection, setInspection] = useState(true);
  const [displayed, setDisplayed] = useState(false);
  const [physical, setPhysical] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [linkDocId, setLinkDocId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    items.forEach((i: any) => {
      const key = i.category || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return [...map.entries()];
  }, [items]);

  const resetForm = () => {
    setName(""); setCategory(COMPLIANCE_CATEGORIES[0]); setExpiry(""); setNotes("");
    setInspection(true); setDisplayed(false); setPhysical(false); setFile(null); setLinkDocId("");
  };

  const handleSave = async () => {
    const linked: any = libraryDocs.find((d: any) => d.id === linkDocId);
    const finalName = linked ? linked.name : name.trim();
    if (!finalName) { toast.error("Give the document a name or link one from the library"); return; }
    setSaving(true);
    try {
      let filePath: string | undefined = linked?.file_path ?? undefined;
      if (file && tenantId) filePath = await uploadComplianceFile(file, tenantId, `branch/${branch}`);
      await saveItem.mutateAsync({
        branch,
        document_id: linked?.id ?? null,
        name: finalName,
        category: linked?.category ?? category,
        file_path: filePath ?? null,
        is_displayed: displayed,
        physical_copy_held: physical,
        inspection_required: inspection,
        expiry_date: expiry || linked?.expires_at || null,
        notes: notes || null,
        status: "active",
      });
      toast.success("Added to the branch compliance file");
      setOpen(false);
      resetForm();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openFile = async (path: string | null) => {
    if (!path) { toast.error("No file stored for this item"); return; }
    const url = await complianceFileUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Could not open the file");
  };

  const toggle = async (item: any, field: "is_displayed" | "physical_copy_held", value: boolean) => {
    await saveItem.mutateAsync({ id: item.id, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">{branch} compliance file</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add document
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm font-medium">Nothing stored for {branch} yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add the premises licence, Section 57 notice, DPS details, personal licences, policies and certificates.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([cat, list]) => (
            <div key={cat} className="rounded-xl border border-border bg-card">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{cat}</p>
              </div>
              <div className="divide-y divide-border">
                {list.map((item: any) => {
                  const tone = item.status === "archived" ? "grey" : expiryTone(resolveExpiryBand(item.expiry_date));
                  return (
                    <div key={item.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            {item.document_id && <Link2 className="h-3.5 w-3.5 text-muted-foreground" />}
                            {item.expiry_date && (
                              <Badge className={cn("text-[10px]", toneClass[tone])}>
                                {expiryLabel(item.expiry_date)}
                              </Badge>
                            )}
                          </div>
                          {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openFile(item.file_path)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={!!item.is_displayed}
                            onCheckedChange={(v) => toggle(item, "is_displayed", v)}
                          />
                          Displayed at the premises
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={!!item.physical_copy_held}
                            onCheckedChange={(v) => toggle(item, "physical_copy_held", v)}
                          />
                          Physical copy held
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add to {branch} compliance file</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Link from the document library (optional)</Label>
              <Select value={linkDocId} onValueChange={setLinkDocId}>
                <SelectTrigger><SelectValue placeholder="Choose an existing document" /></SelectTrigger>
                <SelectContent>
                  {(libraryDocs as any[]).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {!linkDocId && (
              <>
                <div className="space-y-1.5">
                  <Label>Document name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPLIANCE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>File</Label>
                  <label className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 cursor-pointer text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    {file ? file.name : "Upload the document"}
                    <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Expiry date (if applicable)</Label>
              <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <Switch checked={inspection} onCheckedChange={setInspection} /> Needed for inspection
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={displayed} onCheckedChange={setDisplayed} /> Displayed
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={physical} onCheckedChange={setPhysical} /> Physical copy
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
