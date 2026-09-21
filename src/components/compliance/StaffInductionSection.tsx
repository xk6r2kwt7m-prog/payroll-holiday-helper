import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Users, CheckCircle2, Clock, Mail, Search, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/hooks/useEmployees";
import { useTenantBranches, useAllEmployeeBranches } from "@/hooks/useBranches";
import { useComplianceDocuments, useInductionPacks, useSendInduction } from "@/hooks/useCompliance";
import { isAvailableToStaff } from "@/lib/compliance-document-fields";
import { STAFF_ROLES, suggestStaffRole, roleMaySellAlcohol } from "@/lib/compliance-taxonomy";
import { selectInductionDocuments } from "@/lib/induction-pack-selection";
import { cn } from "@/lib/utils";
import { InductionReviewDialog } from "./InductionReviewDialog";

/** What is being sent: the standard pack for the role, or one chosen document. */
type SendMode = "standard" | "single";

export function StaffInductionSection() {
  const { data: employees = [] } = useEmployees();
  const { data: branches = [] } = useTenantBranches();
  const { data: allAssignments = [] } = useAllEmployeeBranches();
  const { data: allDocuments = [] } = useComplianceDocuments();
  /** Drafts and rejected documents are never sent to staff. */
  const documents = useMemo(
    () => (allDocuments as any[]).filter(isAvailableToStaff),
    [allDocuments]
  );
  const { data: packs = [] } = useInductionPacks();
  const sendInduction = useSendInduction();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<SendMode>("standard");
  const [singleDocId, setSingleDocId] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [staffRole, setStaffRole] = useState<string>("");
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [includeAlcohol, setIncludeAlcohol] = useState(false);
  const [testSend, setTestSend] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [sending, setSending] = useState(false);
  const [reviewPack, setReviewPack] = useState<{ id: string; name: string } | null>(null);

  const active = useMemo(
    () => employees.filter((e: any) => !e.archived_at && e.status !== "leaver"),
    [employees]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return active;
    return active.filter((e: any) =>
      `${e.forename} ${e.surname} ${e.department ?? ""}`.toLowerCase().includes(q)
    );
  }, [active, search]);

  /** The site on a person's record: primary assignment first, then any assignment. */
  const siteFor = (employeeId: string): string => {
    const rows = (allAssignments as any[]).filter(a => a.employee_id === employeeId);
    return rows.find(r => r.is_primary)?.branch ?? rows[0]?.branch ?? "";
  };

  /**
   * Everything the send needs is already on the staff record, so it is filled in
   * automatically as soon as somebody is chosen. It stays editable under "Details".
   */
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const first: any = active.find((e: any) => e.id === selectedIds[0]);
    const site = siteFor(selectedIds[0]);
    setBranch(prev => prev || site || branches[0] || "");
    setStaffRole(prev => {
      if (prev) return prev;
      const guess = suggestStaffRole(first?.department, first?.job_title);
      if (guess) setIncludeAlcohol(roleMaySellAlcohol(guess));
      return guess ?? "";
    });
    setEmails(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => {
        const emp: any = active.find((e: any) => e.id === id);
        if (next[id] === undefined) next[id] = emp?.email ?? "";
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, active, allAssignments, branches]);

  const autoSelected = useMemo(
    () => selectInductionDocuments({ documents: documents as any[], branch, role: staffRole, includeAlcohol }),
    [documents, branch, staffRole, includeAlcohol]
  );

  const finalDocIds = useMemo(() => {
    if (mode === "single") return singleDocId ? [singleDocId] : [];
    return autoSelected.map(d => d.id);
  }, [mode, singleDocId, autoSelected]);

  const missingEmail = selectedIds.filter(id => !emails[id]?.includes("@"));

  const reset = () => {
    setSearch(""); setSelectedIds([]); setMode("standard"); setSingleDocId("");
    setBranch(""); setStaffRole(""); setEmails({});
    setIncludeAlcohol(false); setTestSend(false); setShowDetails(false);
  };

  const pickEmployee = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) { toast.error("Choose at least one staff member"); return; }
    if (finalDocIds.length === 0) {
      toast.error(mode === "single" ? "Choose the document to send" : "No documents match this site and role");
      return;
    }
    if (!testSend && missingEmail.length > 0) {
      toast.error("Every selected person needs a valid email address");
      setShowDetails(true);
      return;
    }
    setSending(true);
    try {
      // Save any corrected email addresses to the staff record first (visible action).
      for (const id of selectedIds) {
        const emp: any = active.find((e: any) => e.id === id);
        if (emails[id] && emails[id] !== emp?.email) {
          const { error } = await supabase.from("employees").update({ email: emails[id] }).eq("id", id);
          if (error) throw error;
        }
      }
      const result: any = await sendInduction.mutateAsync({
        employeeIds: selectedIds,
        branch,
        staffRole,
        documentIds: finalDocIds,
        includesAlcohol: mode === "standard" && includeAlcohol,
        testSend,
      });
      const failed = (result?.results ?? []).filter((r: any) => !r.sent);
      if (result?.sent > 0) {
        toast.success(`Sent to ${result.sent} ${result.sent === 1 ? "person" : "people"}`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} could not be sent: ${failed[0]?.error ?? "unknown reason"}`);
      }
      if (result?.sent > 0) setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const incomplete = packs.filter((p: any) => !p.completed_at);
  const completed = packs.filter((p: any) => p.completed_at);

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Staff induction</h2>
          <p className="text-xs text-muted-foreground">
            Pick the person, send the standard pack or a single document to read and confirm.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { reset(); setOpen(true); }}>
          <Send className="h-4 w-4 mr-1.5" /> Send induction
        </Button>
      </div>

      {incomplete.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
          <p className="text-xs font-semibold text-warning uppercase tracking-wide">Not finished yet</p>
          {incomplete.map((p: any) => (
            <div key={p.id} className="flex min-w-0 flex-col items-stretch gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="break-words">
                {p.employees ? `${p.employees.forename} ${p.employees.surname}` : "Staff member"}
                {p.branch ? ` · ${p.branch}` : ""}
              </span>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <Badge className="text-[10px] bg-warning/10 text-warning">
                  <Clock className="h-3 w-3 mr-1" />
                  {p.opened_at ? "Opened, not completed" : "Sent, not opened"}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReviewPack({
                    id: p.id,
                    name: p.employees ? `${p.employees.forename} ${p.employees.surname}` : "Staff member",
                  })}
                >
                  Progress
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed inductions</p>
        </div>
        {completed.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No completed inductions yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {completed.map((p: any) => (
              <div key={p.id} className="px-4 py-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.employees ? `${p.employees.forename} ${p.employees.surname}` : "Staff member"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.branch} · {p.staff_role} · completed{" "}
                    {new Date(p.completed_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-start sm:shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReviewPack({
                      id: p.id,
                      name: p.employees ? `${p.employees.forename} ${p.employees.surname}` : "Staff member",
                    })}
                  >
                    Review &amp; verify
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send documents to read and confirm</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 1 — who */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Who is it for?
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1 max-h-[32vh] overflow-y-auto">
                {visible.map((e: any) => (
                  <label
                    key={e.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer",
                      selectedIds.includes(e.id) ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <Checkbox checked={selectedIds.includes(e.id)} onCheckedChange={() => pickEmployee(e.id)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.forename} {e.surname}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[e.department, siteFor(e.id) || "no site on record", e.email || "no email on record"]
                          .filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </label>
                ))}
                {visible.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">No one matches that name.</p>
                )}
              </div>
            </div>

            {selectedIds.length > 0 && (
              <>
                {/* 2 — what to send */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What should they read?
                  </Label>
                  <button
                    onClick={() => setMode("standard")}
                    className={cn(
                      "w-full text-left rounded-lg border p-3",
                      mode === "standard" ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <p className="text-sm font-medium">Standard pack</p>
                    <p className="text-xs text-muted-foreground">
                      {autoSelected.length === 0
                        ? "No documents match this site and role yet"
                        : `${autoSelected.length} document${autoSelected.length === 1 ? "" : "s"} for ${staffRole || "this role"} at ${branch || "this site"}`}
                    </p>
                  </button>
                  <button
                    onClick={() => setMode("single")}
                    className={cn(
                      "w-full text-left rounded-lg border p-3",
                      mode === "single" ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <p className="text-sm font-medium">Just one document</p>
                    <p className="text-xs text-muted-foreground">Send a single guide or policy to confirm.</p>
                  </button>
                  {mode === "single" && (
                    <Select value={singleDocId} onValueChange={setSingleDocId}>
                      <SelectTrigger><SelectValue placeholder="Choose the document" /></SelectTrigger>
                      <SelectContent>
                        {(documents as any[]).map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {mode === "standard" && autoSelected.length > 0 && (
                    <ul className="space-y-0.5 pl-1">
                      {autoSelected.map(d => (
                        <li key={d.id} className="text-xs text-muted-foreground truncate">• {d.name}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 3 — details, filled in from their record */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-xs text-muted-foreground">
                      <p className="text-sm font-medium text-foreground">
                        {selectedIds.length} {selectedIds.length === 1 ? "person" : "people"}
                      </p>
                      <p className="truncate">
                        {branch || "no site"} · {staffRole || "no role"}
                        {missingEmail.length > 0 ? ` · ${missingEmail.length} without an email` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setShowDetails(v => !v)}>
                      <Settings2 className="h-4 w-4 mr-1" /> {showDetails ? "Hide" : "Details"}
                    </Button>
                  </div>

                  {showDetails && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Site</Label>
                          <Select value={branch} onValueChange={setBranch}>
                            <SelectTrigger><SelectValue placeholder="Choose a site" /></SelectTrigger>
                            <SelectContent>
                              {branches.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Role</Label>
                          <Select
                            value={staffRole}
                            onValueChange={(r) => { setStaffRole(r); setIncludeAlcohol(roleMaySellAlcohol(r)); }}
                          >
                            <SelectTrigger><SelectValue placeholder="Choose a role" /></SelectTrigger>
                            <SelectContent>
                              {STAFF_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {mode === "standard" && (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Will sell alcohol</p>
                            <p className="text-xs text-muted-foreground">Adds age verification and authorisation.</p>
                          </div>
                          <Switch checked={includeAlcohol} onCheckedChange={setIncludeAlcohol} />
                        </div>
                      )}

                      {selectedIds.map(id => {
                        const emp: any = active.find((e: any) => e.id === id);
                        return (
                          <div key={id} className="space-y-1">
                            <Label className="text-xs">{emp?.forename} {emp?.surname}</Label>
                            <div className="relative">
                              <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                className="pl-8"
                                value={emails[id] ?? ""}
                                placeholder="name@example.com"
                                onChange={(e) => setEmails(m => ({ ...m, [id]: e.target.value }))}
                              />
                            </div>
                            {emails[id] && emp?.email && emails[id] !== emp.email && (
                              <p className="text-xs text-warning">This will be saved to their staff record.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Send to me instead (test run)</p>
                    <p className="text-xs text-muted-foreground">Nothing is recorded as sent to staff.</p>
                  </div>
                  <Switch checked={testSend} onCheckedChange={setTestSend} />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || selectedIds.length === 0}>
              {sending ? "Sending..." : testSend ? "Send test to me" : "Send now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InductionReviewDialog
        packId={reviewPack?.id ?? null}
        employeeName={reviewPack?.name ?? ""}
        onClose={() => setReviewPack(null)}
      />
    </div>
  );
}
