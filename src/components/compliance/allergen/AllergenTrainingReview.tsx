import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, BookOpen, CheckCircle2, FileStack, Layers, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useAllergenSources, useSaveAllergenSource, useAllergenDishes, useSaveAllergenDish,
  useAllergenConflicts, useResolveAllergenConflict, useAllergenProposals,
  useDecideAllergenProposal, useAllergenCourseVersions, usePublishAllergenCourseVersion,
  useBuildAllergenProposals, useApplyJulyMenus, type AllergenProposal,
} from "@/hooks/useAllergenLibrary";
import { useBranchLocations } from "@/hooks/useSchedule";
import { ALLERGEN_SOURCE_RANKS, sourceRankLabel, sourcePriority } from "@/lib/allergen-sources";

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function AllergenTrainingReview() {
  const { data: sources = [] } = useAllergenSources();
  const { data: dishes = [] } = useAllergenDishes();
  const { data: conflicts = [] } = useAllergenConflicts();
  const { data: proposals = [] } = useAllergenProposals();
  const { data: versions = [] } = useAllergenCourseVersions();
  const { data: branches = [] } = useBranchLocations();

  const build = useBuildAllergenProposals();
  const openConflicts = conflicts.filter((c) => c.status === "open");
  const pending = proposals.filter((p) => p.status === "proposed" || p.status === "sent_back");
  const approved = proposals.filter((p) => p.status === "approved");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Allergen training — controlled source library
          </CardTitle>
          <CardDescription>
            Uploaded documents are never deleted, renamed or overwritten. Nothing reaches staff
            until you approve it and publish a new course version. Earlier versions, completion
            records and certificates are kept exactly as they are.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            disabled={build.isPending}
            onClick={() =>
              build.mutate(undefined, {
                onSuccess: (r) =>
                  toast.success(
                    `Review prepared: ${r.sourcesAdded} document(s) added to the library, ${r.dishesAdded} flavour(s) drafted, ${r.proposalsAdded} change(s) proposed, ${r.conflictsAdded} conflict(s) raised.`,
                  ),
                onError: (e: any) => toast.error(e.message ?? "Could not prepare the review"),
              })
            }
          >
            {build.isPending ? "Reading documents…" : "Review uploaded documents"}
          </Button>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{sources.length} source documents</Badge>
            <Badge variant="outline">{dishes.length} flavours on record</Badge>
            <Badge variant={openConflicts.length ? "destructive" : "outline"}>
              {openConflicts.length} conflicts to review
            </Badge>
            <Badge variant={pending.length ? "default" : "outline"}>{pending.length} awaiting your decision</Badge>
            <Badge variant="outline">
              {versions.length ? `Published version ${versions[0].version}` : "No version published yet"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="proposals">
        <TabsList className="flex-wrap">
          <TabsTrigger value="proposals">Proposed changes</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="sources">Source documents</TabsTrigger>
          <TabsTrigger value="dishes">Flavour reference</TabsTrigger>
          <TabsTrigger value="versions">Published versions</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="mt-4">
          <ProposalReview pending={pending} approved={approved} openConflicts={openConflicts.length} />
        </TabsContent>
        <TabsContent value="conflicts" className="mt-4">
          <ConflictReview />
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          <SourceLibrary />
        </TabsContent>
        <TabsContent value="dishes" className="mt-4">
          <DishReference branches={branches.map((b) => ({ id: b.id, name: b.display_name }))} />
        </TabsContent>
        <TabsContent value="versions" className="mt-4">
          <VersionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────────────────────── Proposed changes ───────────────────────── */

function ProposalReview({
  pending, approved, openConflicts,
}: { pending: AllergenProposal[]; approved: AllergenProposal[]; openConflicts: number }) {
  const decide = useDecideAllergenProposal();
  const publish = usePublishAllergenCourseVersion();
  const { data: sources = [] } = useAllergenSources();
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  const sourceTitle = (id: string) => sources.find((s) => s.id === id)?.title ?? "Source document";
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const act = (status: "approved" | "rejected" | "sent_back", ids: string[]) => {
    if (!ids.length) return toast.error("Select at least one item.");
    decide.mutate(
      { ids, status, note: note || undefined },
      {
        onSuccess: () => {
          toast.success(
            status === "approved" ? `${ids.length} change(s) approved` :
            status === "rejected" ? `${ids.length} change(s) rejected` :
            `${ids.length} change(s) sent back`,
          );
          setSelected([]);
          setNote("");
        },
        onError: (e: any) => toast.error(e.message ?? "Could not record your decision"),
      },
    );
  };

  const grouped = useMemo(() => {
    const g: Record<string, AllergenProposal[]> = {};
    for (const p of pending) (g[p.target_kind] ??= []).push(p);
    return g;
  }, [pending]);

  const KIND_LABEL: Record<string, string> = {
    lesson: "Course lessons",
    question: "Assessment questions",
    practical_signoff: "Manager practical sign-off",
    emergency_procedure: "Emergency procedure",
    dish_reference: "Flavour reference",
  };

  return (
    <div className="space-y-4">
      {openConflicts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {openConflicts} conflict{openConflicts === 1 ? "" : "s"} between documents still need your
            review. Approving changes while a conflict is open may publish wording that another
            document contradicts.
          </AlertDescription>
        </Alert>
      )}

      {pending.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nothing is waiting for a decision. Use “Review uploaded documents” to check for new material.
        </CardContent></Card>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[240px]">
              <Label className="text-xs">Note for the record (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you approved, rejected or sent this back" />
            </div>
            <Button size="sm" onClick={() => act("approved", selected)} disabled={decide.isPending}>Approve selected</Button>
            <Button size="sm" variant="outline" onClick={() => act("sent_back", selected)} disabled={decide.isPending}>Send back</Button>
            <Button size="sm" variant="outline" onClick={() => act("rejected", selected)} disabled={decide.isPending}>Reject</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(pending.map((p) => p.id))}>Select all</Button>
          </div>

          {Object.entries(grouped).map(([kind, items]) => (
            <Card key={kind}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Layers className="h-4 w-4" />
                  {KIND_LABEL[kind] ?? kind} ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((p) => (
                  <div key={p.id} className="flex gap-3 rounded-md border p-3">
                    <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggle(p.id)} className="mt-1" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{p.target_label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {p.change_type === "addition" ? "Addition" : "Correction"}
                        </Badge>
                        {p.status === "sent_back" && <Badge variant="secondary" className="text-[10px]">Sent back</Badge>}
                      </div>
                      {p.current_text && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Currently: </span>{p.current_text}
                        </p>
                      )}
                      <p className="whitespace-pre-line text-sm">{p.proposed_text}</p>
                      <p className="text-xs text-muted-foreground">
                        Source: {p.source_ids.map(sourceTitle).join("; ") || "—"}
                        {p.rationale ? ` — ${p.rationale}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Publish a new course version ({approved.length} approved change{approved.length === 1 ? "" : "s"})
          </CardTitle>
          <CardDescription>
            Publishing writes a new version. The previous version, every completion record and every
            issued certificate stay exactly as they are. Staff are not contacted by publishing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Next review date</Label>
            <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="w-[170px]" />
          </div>
          <Button
            size="sm"
            disabled={!approved.length || publish.isPending}
            onClick={() =>
              publish.mutate(
                { reviewDate: reviewDate || null },
                {
                  onSuccess: (r: any) => toast.success(`Course version ${r.version} published`),
                  onError: (e: any) => toast.error(e.message ?? "Could not publish"),
                },
              )
            }
          >
            {publish.isPending ? "Publishing…" : "Publish version"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────────────────────── Conflicts ───────────────────────── */

function ConflictReview() {
  const { data: conflicts = [] } = useAllergenConflicts();
  const resolve = useResolveAllergenConflict();
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (!conflicts.length) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
      No conflicts recorded between your documents.
    </CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {conflicts.map((c) => (
        <Card key={c.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {c.subject}
              <Badge variant="outline" className="text-[10px]">{c.subject_kind === "dish" ? "Dish" : "Procedure"}</Badge>
              {c.needs_admin_decision && <Badge variant="destructive" className="text-[10px]">Needs your decision</Badge>}
              {c.status !== "open" && <Badge variant="secondary" className="text-[10px]">{c.status === "resolved" ? "Resolved" : "Dismissed"}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {(c.statements ?? []).map((s, i) => (
                <div key={i} className="rounded-md border p-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{s.source_title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      Priority {sourcePriority(s.source_rank)} — {sourceRankLabel(s.source_rank)}
                    </Badge>
                    <span>Version {s.source_version || "not recorded"}</span>
                    <span>Dated {fmtDate(s.source_date)}</span>
                  </div>
                  <p className="mt-1">{s.statement}</p>
                </div>
              ))}
            </div>
            {c.recommended_wording && (
              <div className="rounded-md bg-muted p-2 text-sm">
                <span className="font-medium">Recommended current wording: </span>{c.recommended_wording}
              </div>
            )}
            {(c.affected_lessons?.length || c.affected_questions?.length) ? (
              <p className="text-xs text-muted-foreground">
                Affected lessons: {c.affected_lessons?.join(", ") || "none"} · Affected questions:{" "}
                {c.affected_questions?.join(", ") || "none"}
              </p>
            ) : null}
            {c.status === "open" ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[220px]">
                  <Label className="text-xs">Your decision note</Label>
                  <Input
                    value={notes[c.id] ?? ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [c.id]: e.target.value }))}
                    placeholder="What you decided and why"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const note = notes[c.id]?.trim();
                    if (!note) return toast.error("Please record why.");
                    resolve.mutate({ id: c.id, status: "resolved", note },
                      { onSuccess: () => toast.success("Conflict recorded as resolved") });
                  }}
                >Mark resolved</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const note = notes[c.id]?.trim();
                    if (!note) return toast.error("Please record why.");
                    resolve.mutate({ id: c.id, status: "dismissed", note },
                      { onSuccess: () => toast.success("Conflict dismissed") });
                  }}
                >Dismiss</Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {fmtDate(c.resolved_at)} — {c.resolution_note}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ───────────────────────── Source documents ───────────────────────── */

function SourceLibrary() {
  const { data: sources = [] } = useAllergenSources();
  const save = useSaveAllergenSource();

  const ordered = [...sources].sort(
    (a, b) => sourcePriority(a.source_rank) - sourcePriority(b.source_rank) || a.title.localeCompare(b.title),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileStack className="h-4 w-4" />
          Source documents and their priority
        </CardTitle>
        <CardDescription>
          Highest authority first. An older document can only raise a conflict — it can never
          override a current packaging label, matrix, recipe or approved procedure. Original files
          are untouched.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {ordered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No documents classified yet. Use “Review uploaded documents” above.
          </p>
        )}
        {ordered.map((s) => (
          <div key={s.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_260px_120px_130px_auto] md:items-end">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.note}</p>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select
                value={s.source_rank}
                onValueChange={(v) => save.mutate({ id: s.id, title: s.title, source_rank: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALLERGEN_SOURCE_RANKS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.priority}. {r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Version</Label>
              <Input
                defaultValue={s.source_version ?? ""}
                onBlur={(e) =>
                  e.target.value !== (s.source_version ?? "") &&
                  save.mutate({ id: s.id, title: s.title, source_version: e.target.value || null })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Document date</Label>
              <Input
                type="date"
                defaultValue={s.source_date ?? ""}
                onBlur={(e) =>
                  e.target.value !== (s.source_date ?? "") &&
                  save.mutate({ id: s.id, title: s.title, source_date: e.target.value || null })
                }
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch
                checked={s.is_current}
                onCheckedChange={(v) => save.mutate({ id: s.id, title: s.title, is_current: v })}
              />
              <span className="text-xs">{s.is_current ? "Current" : "History"}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Flavour reference ───────────────────────── */

function DishReference({ branches }: { branches: { id: string; name: string }[] }) {
  const { data: dishes = [] } = useAllergenDishes();
  const save = useSaveAllergenDish();
  const applyMenus = useApplyJulyMenus();
  const [filter, setFilter] = useState("");
  const [menuResult, setMenuResult] = useState<{
    updated: number; notOnMenu: string[]; unmatchedSites: string[];
  } | null>(null);

  const applyMenus_run = async () => {
    try {
      setMenuResult(await applyMenus.mutateAsync(branches));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const shown = dishes.filter((d) => d.dish_name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4" />
          Flavour and dish allergen reference
        </CardTitle>
        <CardDescription>
          Every documented flavour is kept, including unavailable, seasonal, branch-only and
          extra-charge items. Scored questions are only ever generated for a flavour that is
          confirmed against an approved source and live on that branch’s till and customer menu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search flavours" className="max-w-xs" />
          <Button size="sm" variant="outline" disabled={applyMenus.isPending} onClick={applyMenus_run}>
            Apply the July 2026 customer menus
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The July 2026 menus set which of the three sites — Carnaby, Brixton and Fitzrovia — sell each
          flavour. They are used for availability only, never as the allergen authority: allergen wording
          still comes from the approved matrix, supplier specifications and recipes, and nothing is
          published to staff by this.
        </p>
        {menuResult && (
          <div className="rounded-md border bg-muted/40 p-2.5 text-xs space-y-1">
            <p>{menuResult.updated} flavour(s) had their live sites set from the July 2026 menus.</p>
            {menuResult.notOnMenu.length > 0 && (
              <p className="text-muted-foreground">
                Not on either menu, kept as reference only: {menuResult.notOnMenu.join(", ")}
              </p>
            )}
            {menuResult.unmatchedSites.length > 0 && (
              <p className="text-warning">
                No site record found for: {menuResult.unmatchedSites.join(", ")} — add or rename the site
                and run this again.
              </p>
            )}
          </div>
        )}
        {shown.map((d) => (
          <div key={d.id} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{d.dish_name}</span>
              <Badge variant="outline" className="text-[10px] capitalize">{d.dish_kind}</Badge>
              {d.is_confirmed ? (
                <Badge variant="secondary" className="text-[10px]">Confirmed against an approved source</Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px]">Unconfirmed — awaiting approved matrix</Badge>
              )}
              {d.availability_note && <span className="text-xs text-muted-foreground">{d.availability_note}</span>}
            </div>
            <p className="text-xs">
              <span className="font-medium">Regulated allergens: </span>
              {d.regulated_allergens.length ? d.regulated_allergens.join("; ") : "not recorded"}
            </p>
            {d.other_allergens.length > 0 && (
              <p className="text-xs">
                <span className="font-medium">Outside the regulated 14: </span>{d.other_allergens.join("; ")}
              </p>
            )}
            {d.cross_contact_note && <p className="text-xs text-amber-700">{d.cross_contact_note}</p>}
            <p className="text-xs text-muted-foreground">Source: {d.source_note}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-xs font-medium">Live on till and menu at:</span>
              {branches.map((b) => {
                const on = (d.active_branch_ids ?? []).includes(b.id);
                return (
                  <label key={b.id} className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={on}
                      onCheckedChange={(v) =>
                        save.mutate({
                          id: d.id,
                          dish_name: d.dish_name,
                          active_branch_ids: v
                            ? [...(d.active_branch_ids ?? []), b.id]
                            : (d.active_branch_ids ?? []).filter((x) => x !== b.id),
                        })
                      }
                    />
                    {b.name}
                  </label>
                );
              })}
              <label className="ml-auto flex items-center gap-1.5 text-xs">
                <Switch
                  checked={d.is_confirmed}
                  onCheckedChange={(v) => save.mutate({ id: d.id, dish_name: d.dish_name, is_confirmed: v })}
                />
                Confirmed
              </label>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Published versions ───────────────────────── */

function VersionHistory() {
  const { data: versions = [] } = useAllergenCourseVersions();
  if (!versions.length) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
      No course version has been published from this review yet. The current staff course is unchanged.
    </CardContent></Card>;
  }
  return (
    <div className="space-y-3">
      {versions.map((v, i) => (
        <Card key={v.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              Version {v.version}
              {i === 0 && <Badge className="text-[10px]">Current</Badge>}
              <span className="text-xs font-normal text-muted-foreground">
                Published {fmtDate(v.published_at)} · Next review {fmtDate(v.review_date)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {(v.content?.lessons?.length ?? 0)} lesson statements ·{" "}
            {(v.content?.questions?.length ?? 0)} questions ·{" "}
            {(v.content?.practical_signoff?.length ?? 0)} practical sign-off points ·{" "}
            {(v.content?.dish_reference?.length ?? 0)} flavours. This version is a permanent record
            and cannot be changed or deleted.
            {v.note ? <p className="mt-1">{v.note}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default AllergenTrainingReview;
