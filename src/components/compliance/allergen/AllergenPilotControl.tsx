/**
 * Simple management view for moving Allergen Safety to a controlled pilot.
 *
 * Six things only: course status, pilot candidates, the phone check, the
 * computer check, outstanding evidence, and the two separate buttons.
 * Publishing never contacts anybody, and nothing on this screen sends a
 * message, email, link, reminder or certificate.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, CircleAlert, Copy, Link2, Monitor, Send, Smartphone, Upload, Users } from "lucide-react";
import { getCanonicalOrigin } from "@/lib/getCanonicalUrl";
import { toast } from "sonner";
import {
  ALLERGEN_SAFETY_LESSONS,
  ALLERGEN_COURSE_TITLE,
  ALLERGEN_COURSE_TOTAL_MINUTES,
  ALLERGEN_COURSE_ORIGINAL_MINUTES,
} from "@/data/allergen/allergen-safety-lessons";
import { ALLERGEN_COURSE_MODULES } from "@/data/allergen/allergen-course-modules";
import { ALLERGEN_QUESTION_BANK, CRITICAL_QUESTION_COUNT } from "@/data/allergen/allergen-safety-questions";
import { OUTSTANDING_EVIDENCE_REQUESTS } from "@/data/allergen/allergen-acceptance-policy";
import { UD_SITES } from "@/data/allergen/ud-july-2026-menus";
import {
  ALLERGEN_MAX_SCORED_QUESTIONS,
  ALLERGEN_MENU_QUESTION_SLOTS,
  selectQuestionBank,
} from "@/lib/allergen-course";
import {
  controlledPilotGate,
  validatePilotSelection,
  validateBranchFlavourQuestions,
  PILOT_GROUP_SIZE,
  type PilotCandidate,
} from "@/lib/allergen-preview";
import {
  useAllergenDishes,
  useAllergenConflicts,
  usePublishAllergenCourseVersion,
} from "@/hooks/useAllergenLibrary";
import { useAllergenCourseDraft } from "@/hooks/useAllergenCourse";
import { useAcceptanceChecks, useAcceptanceSignoffs } from "@/hooks/useAllergenAcceptance";
import { useBranchLocations } from "@/hooks/useSchedule";
import { usePilotCandidates, usePilotAssignments, usePreparePilotAssignments } from "@/hooks/useAllergenPilot";
import { AllergenCourseEmailCard } from "@/components/compliance/allergen/AllergenCourseEmailCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAllergenMaterialApproval,
  useApproveAllergenMaterial,
} from "@/hooks/useAllergenMaterialApproval";

function Tick({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : (
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
      )}
      <span>{children}</span>
    </div>
  );
}

export function AllergenPilotControl() {
  const { data: draft } = useAllergenCourseDraft();
  const { data: dishes = [] } = useAllergenDishes();
  const { data: conflicts = [] } = useAllergenConflicts();
  const { data: branches = [] } = useBranchLocations();
  const { data: checks = [] } = useAcceptanceChecks();
  const { data: signoffs = [] } = useAcceptanceSignoffs();
  const { data: candidates = [] } = usePilotCandidates();
  const { data: pilotAssignments = [] } = usePilotAssignments();
  const prepare = usePreparePilotAssignments();
  const publish = usePublishAllergenCourseVersion();

  const [chosen, setChosen] = useState<string[]>([]);

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

  const siteBranchId = (site: string) =>
    (branches as any[]).find(
      (b) =>
        String(b.branch ?? "").trim().toLowerCase().replace(/^ud\s+/, "") === site.toLowerCase() ||
        String(b.display_name ?? "").trim().toLowerCase().replace(/^ud\s+/, "") === site.toLowerCase(),
    )?.id ?? null;

  /* Every site's scored questions, checked against the approved menu position. */
  const siteChecks = useMemo(
    () =>
      UD_SITES.map((site) => {
        try {
          const bank = selectQuestionBank({
            bank: ALLERGEN_QUESTION_BANK,
            ...eligibility,
            branchId: siteBranchId(site),
            seed: `pilot:${site}`,
          });
          const scoredFlavours = bank.questions.map((q) => q.flavour).filter(Boolean) as string[];
          const warnings = bank.criticalWarnings ?? [];
          return {
            site,
            scored: bank.questions.length,
            critical: bank.questions.filter((q) => q.critical).length,
            warnings: warnings.length,
            menu: bank.questions.filter((q) => !q.critical).length,
            validation: validateBranchFlavourQuestions(site, scoredFlavours),
            problem: warnings.length
              ? `${warnings.length} critical question(s) are not scored here because their dish record has lost its confirmed evidence: ${warnings
                  .map((w) => `${w.flavour ?? w.id} — ${w.reason}`)
                  .join("; ")} The safety rule is still taught in the lessons.`
              : (null as string | null),
          };
        } catch (e: any) {
          return {
            site,
            scored: 0,
            critical: 0,
            warnings: CRITICAL_QUESTION_COUNT,
            menu: 0,
            validation: { site, scoredFlavours: [], findings: [], ok: false },
            problem: e?.message ?? "The assessment could not be built for this site.",
          };
        }
      }),
    [eligibility, branches],
  );

  const lessonRefsInModules = ALLERGEN_COURSE_MODULES.flatMap((m) => m.lesson_refs);
  const automatedChecksPassing =
    lessonRefsInModules.length === ALLERGEN_SAFETY_LESSONS.length &&
    ALLERGEN_SAFETY_LESSONS.every((l) => lessonRefsInModules.includes(l.ref)) &&
    CRITICAL_QUESTION_COUNT === 15 &&
    siteChecks.every(
      (s) =>
        s.scored <= ALLERGEN_MAX_SCORED_QUESTIONS &&
        s.critical + s.warnings === CRITICAL_QUESTION_COUNT,
    );


  const resultFor = (env: string, ref: string) =>
    checks.find((c: any) => c.environment === env && c.check_ref === ref)?.result ?? null;
  const passed = (env: string, ref: string) =>
    resultFor(env, ref) === "pass" || resultFor(env, ref) === "pass_with_observation";
  const signedFor = (env: string) => signoffs.some((s: any) => s.environment === env);

  const seriousProblems = checks
    .filter((c: any) => c.result === "fail")
    .map((c: any) => `${String(c.environment).replace(/_/g, " ")} — ${c.check_ref}`);

  const gate = controlledPilotGate({
    automatedChecksPassing,
    phoneWalkthroughSigned: signedFor("smartphone"),
    computerWalkthroughSigned: signedFor("desktop"),
    progressSavingConfirmed: passed("smartphone", "lesson-resume") || passed("desktop", "lesson-resume"),
    branchQuestionsConfirmed: siteChecks.every((s) => s.validation.ok),
    certificateControlsConfirmed:
      passed("smartphone", "certificate-display") || passed("desktop", "certificate-display"),
    knownSeriousProblems: seriousProblems,
    materialApprovedByAdministrator: !!approval,
  });

  const chosenCandidates: PilotCandidate[] = candidates.filter((c) => chosen.includes(c.employee_id));
  const selection = validatePilotSelection(chosenCandidates);

  const toggle = (id: string) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-3">
      {/* ── 1. Course status ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ALLERGEN_COURSE_TITLE}</CardTitle>
          <CardDescription>
            {draft
              ? `Proposed version ${draft.proposed_version} — management review. Not published and not available to staff.`
              : "No draft snapshot prepared yet — management review only."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{ALLERGEN_COURSE_MODULES.length} modules</Badge>
            <Badge variant="outline">
              About {ALLERGEN_COURSE_TOTAL_MINUTES} min of learning (was {ALLERGEN_COURSE_ORIGINAL_MINUTES} min)
            </Badge>
            <Badge variant="outline">
              Up to {ALLERGEN_MAX_SCORED_QUESTIONS} scored questions — {CRITICAL_QUESTION_COUNT} critical plus{" "}
              {ALLERGEN_MENU_QUESTION_SLOTS} current-menu
            </Badge>
            <Badge variant="outline">Pass: 80% and every critical question correct</Badge>
            <Badge variant="outline">Coaching after two failed attempts</Badge>
          </div>
          <div className="space-y-1">
            <Tick ok={automatedChecksPassing}>
              Automated checks {automatedChecksPassing ? "passing" : "not passing — see the details below"}.
            </Tick>
            {siteChecks.map((s) => (
              <Tick key={s.site} ok={s.validation.ok && !s.problem}>
                {s.problem ? (
                  <>
                    {s.site}: {s.problem}
                  </>
                ) : (
                  <>
                    {s.site}: {s.scored} scored questions ({s.critical} critical, {s.menu} current-menu).{" "}
                    {s.validation.ok
                      ? "Site questions correct."
                      : "Site questions do not match the approved menu records."}
                  </>
                )}
              </Tick>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 1b. Approving the training material ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4" /> Approve the training material
          </CardTitle>
          <CardDescription className="text-xs">
            Approving records that you are happy with the lessons and questions as they stand, so the
            course can be published and used in the normal way. Approving publishes nothing and
            contacts nobody.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {approval ? (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Approved by {approval.approved_by_name} on{" "}
                  {new Date(approval.created_at).toLocaleDateString("en-GB")}.
                  {approval.note ? ` Note: ${approval.note}` : ""}
                </AlertDescription>
              </Alert>
              {approval.device_walkthroughs_outstanding && (
                <p className="text-[11px] text-muted-foreground">
                  The phone and computer walkthroughs are still recorded as outstanding and stay
                  listed above as open work.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="grid gap-1.5 sm:max-w-[260px]">
                <Label className="text-xs">Your name</Label>
                <Input
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Type your name"
                  className="h-9"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Note (optional)</Label>
                <Textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  rows={2}
                  placeholder="Anything you want recorded with this approval"
                />
              </div>
              <Button
                size="sm"
                className="gap-1"
                disabled={!approverName.trim() || !automatedChecksPassing || approve.isPending}
                onClick={() =>
                  approve.mutate(
                    {
                      approvedByName: approverName,
                      proposedVersion: draft?.proposed_version ?? null,
                      note: approvalNote,
                      deviceWalkthroughsOutstanding: !(signedFor("smartphone") && signedFor("desktop")),
                    },
                    {
                      onSuccess: () => {
                        setApprovalNote("");
                        toast.success("Material approved and recorded. Nothing was published or sent.");
                      },
                      onError: (e: any) => toast.error(e.message ?? "Could not record the approval"),
                    },
                  )
                }
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve the training material
              </Button>
              {!automatedChecksPassing && (
                <p className="text-[11px] text-muted-foreground">
                  The automated checks must pass before the material can be approved.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 2 & 3. Phone and computer checks ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["smartphone", "Phone check", <Smartphone key="p" className="h-4 w-4" />],
          ["desktop", "Computer check", <Monitor key="c" className="h-4 w-4" />],
        ] as const).map(([env, label, icon]) => (
          <Card key={env}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                {icon}
                {label}
              </CardTitle>
              <CardDescription className="text-xs">
                One management walkthrough on a real device, recorded on the hands-on checklist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <Tick ok={signedFor(env)}>
                {signedFor(env) ? "Walkthrough signed." : "Not signed yet — complete the checklist column."}
              </Tick>
              <Tick ok={passed(env, "lesson-resume")}>
                {passed(env, "lesson-resume") ? "Progress saving confirmed." : "Progress saving not yet confirmed."}
              </Tick>
              <Tick ok={passed(env, "certificate-display")}>
                {passed(env, "certificate-display")
                  ? "Certificate controls confirmed."
                  : "Certificate controls not yet confirmed."}
              </Tick>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 4. Pilot candidates ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" /> Pilot candidates
          </CardTitle>
          <CardDescription className="text-xs">
            Choose {PILOT_GROUP_SIZE} people: one from each site, with at least one front-of-house and one
            kitchen member of staff. Choosing somebody does not contact them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {UD_SITES.map((site) => {
            const forSite = candidates.filter((c) => c.site === site);
            return (
              <div key={site} className="space-y-1">
                <p className="text-xs font-semibold">{site}</p>
                {forSite.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No one is recorded at this site as front of house or kitchen.
                  </p>
                )}
                {forSite.map((c) => (
                  <label
                    key={c.employee_id}
                    className="flex items-center gap-2 rounded-md border p-2 text-xs"
                  >
                    <Checkbox
                      checked={chosen.includes(c.employee_id)}
                      onCheckedChange={() => toggle(c.employee_id)}
                    />
                    <span className="flex-1">{c.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {c.audience === "foh" ? "Front of house" : "Kitchen"}
                    </Badge>
                  </label>
                ))}
              </div>
            );
          })}

          {selection.problems.length > 0 && (
            <Alert>
              <AlertDescription className="space-y-0.5 text-xs">
                {selection.problems.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <Button
            size="sm"
            variant="outline"
            disabled={!selection.ok || prepare.isPending}
            onClick={() =>
              prepare.mutate(
                {
                  candidates: chosenCandidates,
                  draftId: draft?.id ?? null,
                  courseVersion: draft?.proposed_version ?? null,
                },
                {
                  onSuccess: () =>
                    toast.success('Three pilot assignments prepared and held at "Pilot — Not sent". Nobody was contacted.'),
                  onError: (e: any) => toast.error(e.message ?? "Could not prepare the pilot assignments"),
                },
              )
            }
          >
            Prepare the pilot assignments — not sent
          </Button>

          {pilotAssignments.length > 0 && (
            <div className="space-y-1 text-xs">
              <p className="font-medium">Prepared already</p>
              {pilotAssignments.map((a: any) => {
                const person = candidates.find((c) => c.employee_id === a.employee_id);
                return (
                  <p key={a.id} className="text-muted-foreground">
                    {person?.name ?? "Member of staff"} — {a.note ?? "Pilot"} ({a.status})
                  </p>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Outstanding evidence ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Outstanding evidence</CardTitle>
          <CardDescription className="text-xs">
            These dishes are excluded from every scored question, so they do not hold up the pilot. They stay
            unconfirmed until the evidence is approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          {OUTSTANDING_EVIDENCE_REQUESTS.map((r) => (
            <p key={r.dish}>
              <span className="font-medium text-foreground">{r.dish}</span> — still required:{" "}
              {r.required.join(", ")}.
            </p>
          ))}
        </CardContent>
      </Card>

      {/* ── 5b. The staff link — copy only, never sent ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Link2 className="h-4 w-4" /> Staff training link
          </CardTitle>
          <CardDescription className="text-xs">
            This is the link staff open on their phone or computer. Copy it and send it yourself when
            you are ready — the system never sends it for you. Only people you have assigned can open
            the course; everyone else sees a polite "not assigned yet" message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md border bg-muted/50 px-2 py-1 text-xs break-all">
              {getCanonicalOrigin()}/training/allergen-safety
            </code>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${getCanonicalOrigin()}/training/allergen-safety`);
                  toast.success("Link copied. Send it yourself — nothing was sent by the system.");
                } catch {
                  toast.error("Could not copy — please copy the link shown above by hand.");
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy link
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            The link works only once the course is published and the person has an assignment. Sharing
            the link alone grants no access.
          </p>
        </CardContent>
      </Card>

      {/* ── 5c. Emailing the course link — manual, one press per send ── */}
      <AllergenCourseEmailCard />

      {/* ── 6. The two separate buttons ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Publish and send</CardTitle>
          <CardDescription className="text-xs">
            Two separate decisions. Publishing makes the course available in the system and contacts nobody.
            Sending the pilot is a second approval and is not switched on.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!gate.ready && (
            <Alert>
              <AlertDescription className="space-y-0.5 text-xs">
                {gate.blockers.map((b) => (
                  <p key={b}>{b}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}
          {gate.ready && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {approval
                  ? `Material approved by ${approval.approved_by_name}. The course is ready to publish for the controlled pilot.`
                  : "Both the phone and computer walkthroughs have passed. The course is marked ready to publish for the controlled pilot."}{" "}
                Nothing has been published, no pilot assignment has been sent and automatic reminders
                remain off.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1"
              disabled={!gate.ready || publish.isPending}
              onClick={() =>
                publish.mutate(
                  { reviewDate: null, note: "Published for the three-person controlled pilot. Nothing sent to staff." },
                  {
                    onSuccess: () => toast.success("Course published. Nobody has been contacted."),
                    onError: (e: any) => toast.error(e.message ?? "Could not publish the course"),
                  },
                )
              }
            >
              <Upload className="h-3.5 w-3.5" /> Publish for the controlled pilot
            </Button>
            <Button size="sm" variant="outline" className="gap-1" disabled>
              <Send className="h-3.5 w-3.5" /> Send the pilot — needs your separate approval
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Still open before a full rollout, but not holding up the pilot:{" "}
            {gate.openActionsBeforeFullRollout.join(" ")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
