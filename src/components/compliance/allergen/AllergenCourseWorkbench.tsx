/**
 * Management workbench for the draft Ugly Dumpling Allergen Safety course.
 *
 * Everything here is for management review only. Nothing on this screen
 * publishes a course version, creates an assignment, records a completion,
 * issues a certificate or sends anything to anybody.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BookOpen, ChevronDown, ClipboardList, FlaskConical, GitCompare, Info, Smartphone, Monitor, Users } from "lucide-react";
import { AllergenProgrammeBoard } from "@/components/compliance/allergen/AllergenProgrammeBoard";
import { AllergenPilotControl } from "@/components/compliance/allergen/AllergenPilotControl";
import { AllergenWalkthrough } from "@/components/compliance/allergen/AllergenWalkthrough";

import { toast } from "sonner";
import {
  ALLERGEN_SAFETY_LESSONS,
  ALLERGEN_COURSE_TITLE,
  ALLERGEN_COURSE_TOTAL_MINUTES,
  ALLERGEN_COURSE_ORIGINAL_MINUTES,
} from "@/data/allergen/allergen-safety-lessons";
import {
  OUTSTANDING_EVIDENCE_REQUESTS,
  OUTSTANDING_EVIDENCE_WARNING,
} from "@/data/allergen/allergen-acceptance-policy";
import { ALLERGEN_QUESTION_BANK, CRITICAL_QUESTION_COUNT } from "@/data/allergen/allergen-safety-questions";
import { PRACTICAL_SIGNOFF_TEMPLATE } from "@/data/allergen/allergen-practical-signoff";
import { courseSource, APPROVED_WORDING } from "@/data/allergen/allergen-course-sources";
import { EXCLUDED_FROM_SCORING, canPublishScoredQuestion, selectQuestionBank } from "@/lib/allergen-course";
import { useAllergenCourseDraft, useCreateAllergenCourseDraft } from "@/hooks/useAllergenCourse";
import { useAllergenDishes, useAllergenConflicts } from "@/hooks/useAllergenLibrary";
import { useBranchLocations } from "@/hooks/useSchedule";
import { AllergenLessonReader } from "@/components/training/allergen/AllergenLessonReader";
import { AllergenAssessmentRunner } from "@/components/training/allergen/AllergenAssessmentRunner";
import { AllergenManagementPreview } from "@/components/compliance/allergen/AllergenManagementPreview";
import { AllergenAcceptanceChecklist } from "@/components/compliance/allergen/AllergenAcceptanceChecklist";

export function AllergenCourseWorkbench() {
  const { data: draft } = useAllergenCourseDraft();
  const createDraft = useCreateAllergenCourseDraft();
  const { data: dishes = [] } = useAllergenDishes();
  const { data: conflicts = [] } = useAllergenConflicts();
  const { data: branches = [] } = useBranchLocations();

  const [testMode, setTestMode] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [learnerView, setLearnerView] = useState<"lessons" | "assessment">("lessons");
  const [reviewOpen, setReviewOpen] = useState(false);

  const versionLabel = draft
    ? `Studying proposed version ${draft.proposed_version} (draft)`
    : "No draft snapshot prepared yet";

  const eligibility = useMemo(
    () => ({
      dishes: dishes.map((d) => ({
        dish_name: d.dish_name,
        is_confirmed: d.is_confirmed,
        management_decision: d.management_decision,
        active_branch_ids: d.active_branch_ids,
      })),
      conflicts: conflicts.map((c) => ({ subject: c.subject, status: c.status })),
    }),
    [dishes, conflicts],
  );

  const bank = useMemo(
    () => selectQuestionBank({
      bank: ALLERGEN_QUESTION_BANK, ...eligibility, branchId, seed: "admin-preview",
    }),
    [eligibility, branchId],
  );

  const comparison = draft?.comparison as any | undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            {ALLERGEN_COURSE_TITLE}
            <Badge variant="secondary">Management review — not available to staff</Badge>
          </CardTitle>
          <CardDescription>
            The future single allergen course. The existing Allergen Awareness and Allergy Safety Guide
            material is untouched. Published allergen version 1 is untouched.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{ALLERGEN_SAFETY_LESSONS.length} lessons</Badge>
            <Badge variant="outline">
              About {ALLERGEN_COURSE_TOTAL_MINUTES} min of reading (was {ALLERGEN_COURSE_ORIGINAL_MINUTES} min)
            </Badge>
            <Badge variant="outline">{ALLERGEN_QUESTION_BANK.length} questions written</Badge>
            <Badge variant="outline">{CRITICAL_QUESTION_COUNT} critical-safety questions</Badge>
            <Badge variant="outline">{PRACTICAL_SIGNOFF_TEMPLATE.items.length} practical observations</Badge>
            <Badge variant="outline">{versionLabel}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={() => createDraft.mutate(undefined, {
              onSuccess: (d) => toast.success(`Draft snapshot prepared as proposed version ${d.proposed_version}. Nothing published.`),
              onError: (e: any) => toast.error(e.message ?? "Could not prepare the draft"),
            })} disabled={createDraft.isPending}>
              {draft ? "Refresh the draft snapshot" : "Prepare the draft snapshot"}
            </Button>
            <div className="flex items-center gap-2">
              <Switch id="allergen-test-mode" checked={testMode} onCheckedChange={setTestMode} />
              <Label htmlFor="allergen-test-mode" className="text-xs">
                Test mode {testMode ? "on — nothing counts" : "off"}
              </Label>
            </div>
          </div>
          {testMode ? (
            <Alert>
              <FlaskConical className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Test mode. Anything you read or answer here is stored separately as test activity: no
                staff assignment, no completion, no certificate, no notification and nothing in
                compliance reporting.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Test mode is off, so your own reading and attempts are recorded against your account.
                Staff still cannot reach this course.
              </AlertDescription>
            </Alert>
          )}

          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-1">
              <p className="font-medium">{OUTSTANDING_EVIDENCE_WARNING}</p>
              {OUTSTANDING_EVIDENCE_REQUESTS.map((r) => (
                <p key={r.dish}>
                  <span className="font-medium">{r.dish}</span>
                  {r.onCurrentMenu ? " (on the current menu)" : ""} — still required: {r.required.join(", ")}. {r.effect}
                </p>
              ))}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="pilot">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="pilot" className="gap-1"><Rocket className="h-3.5 w-3.5" />Pilot</TabsTrigger>
          <TabsTrigger value="walkthrough" className="gap-1">
            <Smartphone className="h-3.5 w-3.5" />10-minute walkthrough
          </TabsTrigger>
          <TabsTrigger value="lessons" className="gap-1"><BookOpen className="h-3.5 w-3.5" />Lessons</TabsTrigger>

          <TabsTrigger value="questions" className="gap-1"><ClipboardList className="h-3.5 w-3.5" />Questions</TabsTrigger>
          <TabsTrigger value="practical">Practical sign-off</TabsTrigger>
          <TabsTrigger value="comparison" className="gap-1"><GitCompare className="h-3.5 w-3.5" />Version 1 vs 2</TabsTrigger>
          <TabsTrigger value="learner">Learner preview</TabsTrigger>
          <TabsTrigger value="acceptance" className="gap-1">
            <FlaskConical className="h-3.5 w-3.5" />Management learner preview
          </TabsTrigger>
          <TabsTrigger value="checklist">Hands-on checklist</TabsTrigger>
          <TabsTrigger value="programme" className="gap-1"><Users className="h-3.5 w-3.5" />Assignments, sign-off &amp; certificates</TabsTrigger>
        </TabsList>

        {/* ── The simple pilot view: status, candidates, checks, evidence, buttons ── */}
        <TabsContent value="pilot" className="pt-3">
          <AllergenPilotControl />
        </TabsContent>

        {/* ── The ten-minute management acceptance walkthrough ── */}
        <TabsContent value="walkthrough" className="pt-3">
          <AllergenWalkthrough />
        </TabsContent>


        <TabsContent value="programme" className="pt-3">
          <AllergenProgrammeBoard testMode={testMode} />
        </TabsContent>

        {/* ── Lessons ── */}
        <TabsContent value="lessons" className="space-y-2 pt-3">
          {ALLERGEN_SAFETY_LESSONS.map((lesson) => (
            <Card key={lesson.ref}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{lesson.order}. {lesson.title}</CardTitle>
                <CardDescription className="text-xs">{lesson.summary}</CardDescription>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {lesson.estimated_minutes} min
                    {lesson.original_minutes && lesson.original_minutes !== lesson.estimated_minutes
                      ? ` (was ${lesson.original_minutes})`
                      : ""}
                  </Badge>
                  <Badge variant={lesson.mandatory ? "destructive" : "outline"} className="text-[10px]">
                    {lesson.mandatory ? "Required lesson" : "Optional"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{lesson.sections.length} sections</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {lesson.condensed && (
                  <p className="text-[11px] text-muted-foreground">
                    Shortened for management review: {lesson.condensed}
                  </p>
                )}
                {lesson.sections.map((s) => (
                  <div key={s.ref} className="rounded-md border p-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{s.heading}</p>
                      <Badge variant={s.mandatory ? "destructive" : "outline"} className="text-[10px]">
                        {s.mandatory ? "Required" : "Extra"}
                      </Badge>
                    </div>
                    <div className="mt-1 space-y-1 text-muted-foreground">
                      {s.paragraphs.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
                      {s.example && <p className="italic">In service: {s.example}</p>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.sources.map((ref) => (
                        <Badge key={ref} variant="outline" className="text-[10px]">{courseSource(ref).title}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── Questions ── */}
        <TabsContent value="questions" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Scored bank for a chosen site</CardTitle>
              <CardDescription className="text-xs">
                A dish question is only scored when the flavour is confirmed against the matrix, live on
                that site's current menu and free of unresolved conflicts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select value={branchId ?? "none"} onValueChange={(v) => setBranchId(v === "none" ? null : v)}>
                <SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Choose a site" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No site chosen</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.display_name ?? b.branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{bank.questions.length} scored</Badge>
                <Badge variant="outline">{bank.questions.filter((q) => q.critical).length} critical</Badge>
                <Badge variant="outline">{bank.excluded.length} left out</Badge>
              </div>
            </CardContent>
          </Card>

          {ALLERGEN_QUESTION_BANK.map((q) => {
            const publishable = canPublishScoredQuestion(q, eligibility);
            const inBank = bank.questions.some((x) => x.id === q.id);
            return (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{q.prompt}</CardTitle>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="outline" className="text-[10px]">
                      {q.type === "single" ? "One answer" : q.type === "multi" ? "Several answers" : "Scenario"}
                    </Badge>
                    {q.critical && <Badge variant="destructive" className="text-[10px]">Critical safety</Badge>}
                    {q.flavour && <Badge variant="outline" className="text-[10px]">{q.flavour}</Badge>}
                    {q.requires_current_menu && <Badge variant="outline" className="text-[10px]">Current menu only</Badge>}
                    <Badge variant={q.active ? "secondary" : "outline"} className="text-[10px]">
                      {q.active ? "Active" : "Held — awaiting evidence"}
                    </Badge>
                    <Badge variant={inBank ? "secondary" : "outline"} className="text-[10px]">
                      {inBank ? "In the scored bank for this site" : "Not scored for this site"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  {q.options.map((o) => (
                    <p key={o.id} className={q.correct.includes(o.id) ? "font-medium" : "text-muted-foreground"}>
                      {q.correct.includes(o.id) ? "✔ " : "• "}{o.text}
                    </p>
                  ))}
                  <p className="pt-1 text-muted-foreground">{q.explanation}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <Badge variant="outline" className="text-[10px]">Lesson: {q.lesson_ref}</Badge>
                    {q.sources.map((ref) => (
                      <Badge key={ref} variant="outline" className="text-[10px]">{courseSource(ref).title}</Badge>
                    ))}
                  </div>
                  {!publishable.eligible && (
                    <Alert className="mt-2">
                      <AlertDescription className="text-xs">
                        Cannot be published as a scored question: {publishable.reason}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Kept out of the scored exam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              {EXCLUDED_FROM_SCORING.map((e) => (
                <p key={e.flavour}><span className="font-medium text-foreground">{e.flavour}</span> — {e.reason}</p>
              ))}
              <p className="pt-2 text-foreground">{APPROVED_WORDING.shared_dessert_fryer}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Practical sign-off ── */}
        <TabsContent value="practical" className="pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{PRACTICAL_SIGNOFF_TEMPLATE.title}</CardTitle>
              <CardDescription className="text-xs">{PRACTICAL_SIGNOFF_TEMPLATE.note}</CardDescription>
              <Badge variant="outline" className="mt-1 w-fit text-[10px]">
                On passing the exam: {PRACTICAL_SIGNOFF_TEMPLATE.status_on_assessment_pass}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {PRACTICAL_SIGNOFF_TEMPLATE.items.map((i) => (
                <div key={i.ref} className="rounded-md border p-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{i.title}</p>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {i.audience === "both" ? "Front of house and kitchen" : i.audience === "foh" ? "Front of house" : "Kitchen"}
                      </Badge>
                      {i.critical && <Badge variant="destructive" className="text-[10px]">Critical</Badge>}
                    </div>
                  </div>
                  <p className="mt-1 text-muted-foreground">{i.observe}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Version comparison ── */}
        <TabsContent value="comparison" className="pt-3">
          {!comparison ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Prepare the draft snapshot above to see how the proposed version compares with the
                published one.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Published version {comparison.fromVersion ?? "—"} compared with proposed version {comparison.toVersion}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Proposed only. Nothing is published until you approve it.
                  </CardDescription>
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                    <Badge variant="outline">{comparison.counts.added} added</Badge>
                    <Badge variant="outline">{comparison.counts.corrected} corrected</Badge>
                    <Badge variant="outline">{comparison.counts.superseded} superseded</Badge>
                    <Badge variant="outline">{comparison.counts.unchanged} unchanged</Badge>
                  </div>
                </CardHeader>
              </Card>
              {([["added", "Added"], ["corrected", "Corrected"], ["superseded", "Superseded or removed"]] as const).map(
                ([key, label]) => (
                  <Card key={key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{label} ({(comparison[key] ?? []).length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      {(comparison[key] ?? []).slice(0, 60).map((c: any, i: number) => (
                        <div key={`${c.label}-${i}`} className="rounded-md border p-2">
                          <p className="font-medium">{c.label}</p>
                          <p className="text-[10px] uppercase text-muted-foreground">{c.area}</p>
                          {c.before && <p className="mt-1 text-muted-foreground line-through">{c.before}</p>}
                          {c.after && <p className="mt-1 text-muted-foreground">{c.after}</p>}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(c.sources ?? []).map((ref: any) => (
                              <Badge key={ref} variant="outline" className="text-[10px]">{courseSource(ref).title}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      {(comparison[key] ?? []).length === 0 && <p className="text-muted-foreground">Nothing in this group.</p>}
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Learner preview ── */}
        <TabsContent value="learner" className="space-y-3 pt-3">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 py-3">
              <Button size="sm" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")} className="gap-1">
                <Monitor className="h-3.5 w-3.5" /> Computer
              </Button>
              <Button size="sm" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")} className="gap-1">
                <Smartphone className="h-3.5 w-3.5" /> Phone
              </Button>
              <Button size="sm" variant={learnerView === "lessons" ? "default" : "outline"} onClick={() => setLearnerView("lessons")}>
                Lessons
              </Button>
              <Button size="sm" variant={learnerView === "assessment" ? "default" : "outline"} onClick={() => setLearnerView("assessment")}>
                Assessment
              </Button>
              <Select value={branchId ?? "none"} onValueChange={(v) => setBranchId(v === "none" ? null : v)}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Site" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No site chosen</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.display_name ?? b.branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {testMode && <Badge variant="destructive" className="text-[10px]">Test mode — nothing counts</Badge>}
            </CardContent>
          </Card>

          <div className={device === "mobile" ? "mx-auto w-full max-w-[390px] rounded-xl border p-2" : ""}>
            {learnerView === "lessons" ? (
              <AllergenLessonReader
                isTest={testMode}
                courseVersionLabel={versionLabel}
                draftId={draft?.id ?? null}
                onAssessmentOpen={() => setLearnerView("assessment")}
              />
            ) : (
              <AllergenAssessmentRunner
                isTest={testMode}
                branchId={branchId}
                branchName={branches.find((b: any) => b.id === branchId)?.display_name}
                courseVersionLabel={versionLabel}
                draftId={draft?.id ?? null}
              />
            )}
          </div>
        </TabsContent>

        {/* ── Final hands-on acceptance stage (management only, isolated test data) ── */}
        <TabsContent value="acceptance" className="pt-3">
          <AllergenManagementPreview />
        </TabsContent>

        <TabsContent value="checklist" className="pt-3">
          <AllergenAcceptanceChecklist />
        </TabsContent>
      </Tabs>
    </div>
  );
}
