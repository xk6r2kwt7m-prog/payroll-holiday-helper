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
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText, Plus, Search, Upload, Archive, RefreshCw, ExternalLink,
  ChevronRight, ChevronDown, PenLine, Undo2, X,
} from "lucide-react";
import { COMPLIANCE_CATEGORIES, STAFF_ROLES } from "@/lib/compliance-taxonomy";
import { expiryLabel, expiryTone, resolveExpiryBand } from "@/lib/compliance-expiry";
import {
  useComplianceDocuments, useSaveComplianceDocument, useArchiveComplianceDocument,
  useRestoreComplianceDocument, useReplaceComplianceDocument,
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
  const [showArchived, setShowArchived] = useState(false);
  const { data: documents = [], isLoading } = useComplianceDocuments(true);
  const saveDoc = useSaveComplianceDocument();
  const archiveDoc = useArchiveComplianceDocument();
  const restoreDoc = useRestoreComplianceDocument();
  const replaceDoc = useReplaceComplianceDocument();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [replacingFor, setReplacingFor] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const archivedCount = useMemo(
    () => documents.filter((d: any) => d.status === "archived").length,
    [documents]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d: any) => {
      if (!showArchived && d.status === "archived") return false;
      if (showArchived && d.status !== "archived") return false;
      if (categoryFilter !== "all" && d.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.category || "").toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q) ||
        (d.branches || []).join(" ").toLowerCase().includes(q) ||
        (d.roles || []).join(" ").toLowerCase().includes(q)
      );
    });
  }, [documents, search, categoryFilter, showArchived]);

  /** Category chips only offer categories that actually have documents. */
  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    documents.forEach((d: any) => {
      if (showArchived ? d.status !== "archived" : d.status === "archived") return;
      counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
    });
    return COMPLIANCE_CATEGORIES.filter(c => counts.has(c)).map(c => ({
      label: c, count: counts.get(c)!,
    }));
  }, [documents, showArchived]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    visible.forEach((d: any) => {
      const list = map.get(d.category) ?? [];
      list.push(d);
      map.set(d.category, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);

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
    setFile(null); setReplacingFor(null); setSelected(null); setOpen(true);
  };

  const openReplace = (doc: any) => {
    setForm({ ...emptyForm, name: doc.name, category: doc.category });
    setFile(null); setReplacingFor(doc); setSelected(null); setOpen(true);
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
      {/* Search + add, sticky so it stays reachable while scrolling on a phone */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/95 backdrop-blur space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents"
              className="pl-8 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-2.5 text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button size="icon" onClick={openNew} aria-label="Add document">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>
            All {visible.length > 0 ? `· ${visible.length}` : ""}
          </Chip>
          {chips.map(c => (
            <Chip
              key={c.label}
              active={categoryFilter === c.label}
              onClick={() => setCategoryFilter(categoryFilter === c.label ? "all" : c.label)}
            >
              {c.label} · {c.count}
            </Chip>
          ))}
          {archivedCount > 0 && (
            <Chip
              active={showArchived}
              onClick={() => { setShowArchived(v => !v); setCategoryFilter("all"); }}
            >
              <Archive className="h-3 w-3 mr-1 inline" />
              Archived · {archivedCount}
            </Chip>
          )}
        </div>
      </div>

      {showArchived && (
        <p className="text-xs text-muted-foreground">
          These documents are put away but never deleted. Tap one to bring it back.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading documents…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">
            {search || categoryFilter !== "all" ? "Nothing matches that" : "No documents yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search || categoryFilter !== "all"
              ? "Try a different word, or clear the filters."
              : "Add your induction, food safety, fire safety and licensing documents once — they are then sent automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([category, docs]) => {
            const isCollapsed = collapsed[category];
            return (
              <div key={category} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCollapsed(c => ({ ...c, [category]: !c[category] }))}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {category} · {docs.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-border border-t border-border">
                    {docs.map((doc: any) => {
                      const tone = doc.status === "archived"
                        ? "grey"
                        : expiryTone(resolveExpiryBand(doc.expires_at));
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setSelected(doc)}
                          className="w-full text-left px-4 py-3 flex items-start gap-3 active:bg-muted/60 transition-colors"
                        >
                          <FileText className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">{doc.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {doc.applies_to_all_branches ? "All branches" : (doc.branches || []).join(", ") || "No branch"}
                              {" · "}
                              {doc.applies_to_all_roles ? "All staff" : (doc.roles || []).join(", ") || "No role"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">v{doc.version}</Badge>
                              {doc.expires_at && (
                                <Badge className={cn("text-[10px]", toneClass[tone])}>
                                  {expiryLabel(doc.expires_at)}
                                </Badge>
                              )}
                              {doc.include_in_induction && (
                                <Badge variant="outline" className="text-[10px]">In induction</Badge>
                              )}
                              {doc.requires_signature && (
                                <Badge variant="outline" className="text-[10px]">
                                  <PenLine className="h-2.5 w-2.5 mr-1" /> Signature
                                </Badge>
                              )}
                              {!doc.file_path && (
                                <Badge className="text-[10px] bg-warning/10 text-warning">No file</Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions for one document — a bottom sheet, thumb-friendly on a phone */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="text-base leading-snug pr-6">{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-1 space-y-4">
                <p className="text-xs text-muted-foreground">
                  {selected.category} · Version {selected.version}
                  {selected.status === "archived" && " · Archived"}
                </p>
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <Fact label="Branches" value={selected.applies_to_all_branches ? "All branches" : (selected.branches || []).join(", ") || "—"} />
                  <Fact label="Who gets it" value={selected.applies_to_all_roles ? "All staff" : (selected.roles || []).join(", ") || "—"} />
                  <Fact label="Expiry" value={selected.expires_at ? expiryLabel(selected.expires_at) : "No expiry"} />
                  <Fact label="Signature" value={selected.requires_signature ? "Required" : "Not needed"} />
                </dl>

                <div className="flex flex-wrap gap-1.5">
                  {selected.include_in_induction && <Badge variant="outline" className="text-[10px]">In induction</Badge>}
                  {selected.must_display && <Badge variant="outline" className="text-[10px]">Displayed at site</Badge>}
                  {selected.inspection_required && <Badge variant="outline" className="text-[10px]">Inspection</Badge>}
                  {selected.alcohol_related && <Badge variant="outline" className="text-[10px]">Alcohol</Badge>}
                </div>

                <div className="space-y-2 pt-1">
                  <Button className="w-full" onClick={() => openFile(selected.file_path)}>
                    <ExternalLink className="h-4 w-4 mr-1.5" /> Open document
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => openEdit(selected)}>Edit details</Button>
                    <Button variant="outline" onClick={() => openReplace(selected)}>
                      <RefreshCw className="h-4 w-4 mr-1.5" /> New version
                    </Button>
                  </div>
                  {selected.status === "archived" ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={async () => {
                        await restoreDoc.mutateAsync(selected.id);
                        setSelected(null);
                        setShowArchived(false);
                        toast.success("Back in the library");
                      }}
                    >
                      <Undo2 className="h-4 w-4 mr-1.5" /> Bring back to library
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="w-full text-muted-foreground"
                      onClick={async () => {
                        await archiveDoc.mutateAsync(selected.id);
                        setSelected(null);
                        toast.success("Put away — you can bring it back from Archived");
                      }}
                    >
                      <Archive className="h-4 w-4 mr-1.5" /> Put away
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border"
      )}
    >
      {children}
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="text-foreground mt-0.5">{value}</dd>
    </div>
  );
}
