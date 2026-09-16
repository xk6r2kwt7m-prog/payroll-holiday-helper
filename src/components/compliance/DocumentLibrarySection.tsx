import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plus, Search, Upload, Archive, RefreshCw, ExternalLink } from "lucide-react";
import { COMPLIANCE_CATEGORIES, STAFF_ROLES } from "@/lib/compliance-taxonomy";
import { expiryLabel, expiryTone } from "@/lib/compliance-expiry";
import {
  useComplianceDocuments, useSaveComplianceDocument, useArchiveComplianceDocument,
  useReplaceComplianceDocument, uploadComplianceFile, complianceFileUrl,
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

interface FormState {
  id?: string;
  name: string;
  category: string;
  description: string;
  applies_to_all_branches: boolean;
  branches: string[];
  applies_to_all_roles: boolean;
  roles: string[];
  requires_signature: boolean;
  include_in_induction: boolean;
  must_display: boolean;
  inspection_required: boolean;
  alcohol_related: boolean;
  expires_at: string;
}

const emptyForm: FormState = {
  name: "", category: COMPLIANCE_CATEGORIES[0], description: "",
  applies_to_all_branches: true, branches: [],
  applies_to_all_roles: true, roles: [],
  requires_signature: true, include_in_induction: true,
  must_display: false, inspection_required: false, alcohol_related: false,
  expires_at: "",
};

export function DocumentLibrarySection() {
  const { tenantId } = useTenant();
  const { data: branches = [] } = useTenantBranches();
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: documents = [], isLoading } = useComplianceDocuments(includeArchived);
  const saveDoc = useSaveComplianceDocument();
  const archiveDoc = useArchiveComplianceDocument();
  const replaceDoc = useReplaceComplianceDocument();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [replacingFor, setReplacingFor] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d: any) => {
      if (categoryFilter !== "all" && d.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.category || "").toLowerCase().includes(q) ||
        (d.branches || []).join(" ").toLowerCase().includes(q) ||
        (d.roles || []).join(" ").toLowerCase().includes(q)
      );
    });
  }, [documents, search, categoryFilter]);

  const openNew = () => { setForm(emptyForm); setFile(null); setReplacingFor(null); setOpen(true); };

  const openEdit = (doc: any) => {
    setForm({
      id: doc.id, name: doc.name, category: doc.category, description: doc.description || "",
      applies_to_all_branches: doc.applies_to_all_branches, branches: doc.branches || [],
      applies_to_all_roles: doc.applies_to_all_roles, roles: doc.roles || [],
      requires_signature: doc.requires_signature, include_in_induction: doc.include_in_induction,
      must_display: doc.must_display, inspection_required: doc.inspection_required,
      alcohol_related: doc.alcohol_related, expires_at: doc.expires_at || "",
    });
    setFile(null); setReplacingFor(null); setOpen(true);
  };

  const openReplace = (doc: any) => {
    setForm({ ...emptyForm, name: doc.name, category: doc.category });
    setFile(null); setReplacingFor(doc); setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Give the document a name"); return; }
    if (replacingFor && !file) { toast.error("Choose the new version of the file"); return; }
    setSaving(true);
    try {
      let filePath: string | undefined;
      if (file && tenantId) filePath = await uploadComplianceFile(file, tenantId, "library");

      if (replacingFor) {
        await replaceDoc.mutateAsync({
          previous: replacingFor,
          changes: { file_path: filePath, expires_at: form.expires_at || null },
        });
        toast.success("New version saved — the previous version is archived and still available");
      } else {
        await saveDoc.mutateAsync({
          ...form,
          expires_at: form.expires_at || null,
          branches: form.applies_to_all_branches ? [] : form.branches,
          roles: form.applies_to_all_roles ? [] : form.roles,
          ...(filePath ? { file_path: filePath } : {}),
        });
        toast.success(form.id ? "Document updated" : "Document added");
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openFile = async (path: string | null) => {
    if (!path) { toast.error("No file uploaded for this document"); return; }
    const url = await complianceFileUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Could not open the file");
  };

  const toggleInList = (list: string[], value: string) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents, branch or role"
            className="pl-8"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {COMPLIANCE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} />
          Show archived
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" /> Add document</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading documents...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add your induction, food safety, fire safety and licensing documents once — they are then sent automatically.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border bg-card">
          {filtered.map((doc: any) => {
            const tone = expiryTone(doc.expires_at, doc.status);
            return (
              <div key={doc.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <Badge variant="outline" className="text-[10px]">v{doc.version}</Badge>
                      {doc.status === "archived" && (
                        <Badge className="text-[10px] bg-muted text-muted-foreground">Archived</Badge>
                      )}
                      {doc.expires_at && (
                        <Badge className={cn("text-[10px]", toneClass[tone])}>{expiryLabel(doc.expires_at)}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.category} · {doc.applies_to_all_branches ? "All branches" : (doc.branches || []).join(", ") || "No branch"} ·{" "}
                      {doc.applies_to_all_roles ? "All staff" : (doc.roles || []).join(", ") || "No role"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {doc.include_in_induction && <Badge variant="outline" className="text-[10px]">In induction</Badge>}
                      {doc.requires_signature && <Badge variant="outline" className="text-[10px]">Signature</Badge>}
                      {doc.must_display && <Badge variant="outline" className="text-[10px]">Displayed at site</Badge>}
                      {doc.inspection_required && <Badge variant="outline" className="text-[10px]">Inspection</Badge>}
                      {doc.alcohol_related && <Badge variant="outline" className="text-[10px]">Alcohol</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openFile(doc.file_path)}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(doc)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => openReplace(doc)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> New version
                  </Button>
                  {doc.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await archiveDoc.mutateAsync(doc.id);
                        toast.success("Archived — history is kept");
                      }}
                    >
                      <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {replacingFor ? `New version of ${replacingFor.name}` : form.id ? "Edit document" : "Add document"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!replacingFor && (
              <>
                <div className="space-y-1.5">
                  <Label>Document name</Label>
                  <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPLIANCE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Short explanation for staff</Label>
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Applies to all branches</Label>
                    <Switch
                      checked={form.applies_to_all_branches}
                      onCheckedChange={(v) => setForm(f => ({ ...f, applies_to_all_branches: v }))}
                    />
                  </div>
                  {!form.applies_to_all_branches && (
                    <div className="grid grid-cols-2 gap-2">
                      {branches.map((b: string) => (
                        <label key={b} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={form.branches.includes(b)}
                            onCheckedChange={() => setForm(f => ({ ...f, branches: toggleInList(f.branches, b) }))}
                          />
                          {b}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Applies to all staff</Label>
                    <Switch
                      checked={form.applies_to_all_roles}
                      onCheckedChange={(v) => setForm(f => ({ ...f, applies_to_all_roles: v }))}
                    />
                  </div>
                  {!form.applies_to_all_roles && (
                    <div className="grid grid-cols-2 gap-2">
                      {STAFF_ROLES.map(r => (
                        <label key={r} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={form.roles.includes(r)}
                            onCheckedChange={() => setForm(f => ({ ...f, roles: toggleInList(f.roles, r) }))}
                          />
                          {r}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {([
                    ["requires_signature", "Staff must sign"],
                    ["include_in_induction", "Include in induction"],
                    ["must_display", "Displayed at site"],
                    ["inspection_required", "Needed for inspection"],
                    ["alcohol_related", "Alcohol related"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={form[key] as boolean}
                        onCheckedChange={(v) => setForm(f => ({ ...f, [key]: v === true }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Expiry date (if applicable)</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{replacingFor ? "New file" : "File (optional)"}</Label>
              <label className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 cursor-pointer text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Choose a PDF, image or document"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
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
