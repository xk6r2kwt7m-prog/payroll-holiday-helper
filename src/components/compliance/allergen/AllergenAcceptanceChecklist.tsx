/**
 * Hands-on acceptance checklist — completed by a person, not by the system.
 *
 * Five columns: smartphone, computer, keyboard only, screen reader and an
 * interrupted connection. Each line is recorded with a result, and anything
 * that fails or was not tested must carry a short written comment.
 *
 * Automated checks alone are not accessibility acceptance; only a signed column
 * counts. Nothing here publishes, assigns, certifies or sends anything.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClipboardList, Signature } from "lucide-react";
import { toast } from "sonner";
import {
  ACCEPTANCE_ENVIRONMENTS, ACCEPTANCE_RESULT_LABELS, checksForEnvironment,
  acceptanceCommentRequired, ACCEPTANCE_TOTAL_CHECKS, ACCESSIBILITY_STATEMENT_CAUTION,
} from "@/data/allergen/allergen-acceptance-checklist";
import type { AcceptanceEnvironment, AcceptanceResult } from "@/data/allergen/allergen-acceptance-checklist";
import { acceptanceOverview, environmentChecklistState } from "@/lib/allergen-preview";
import {
  useAcceptanceChecks, useRecordAcceptanceCheck,
  useAcceptanceSignoffs, useSignAcceptanceEnvironment,
} from "@/hooks/useAllergenAcceptance";

const RESULT_OPTIONS = (Object.keys(ACCEPTANCE_RESULT_LABELS) as AcceptanceResult[]).map(
  (key) => ({ key, label: ACCEPTANCE_RESULT_LABELS[key] }),
);

const OUTCOME_LABEL: Record<string, string> = {
  accepted: "Accepted",
  accepted_with_observations: "Accepted with observations",
  not_accepted: "Not accepted",
  incomplete: "Not finished",
};

export function AllergenAcceptanceChecklist() {
  const { data: rows = [] } = useAcceptanceChecks();
  const { data: signoffs = [] } = useAcceptanceSignoffs();
  const record = useRecordAcceptanceCheck();
  const sign = useSignAcceptanceEnvironment();

  const [comments, setComments] = useState<Record<string, string>>({});
  const [signerName, setSignerName] = useState("");
  const [deviceNote, setDeviceNote] = useState("");

  const recorded = useMemo(
    () =>
      rows.map((r) => ({
        environment: r.environment as AcceptanceEnvironment,
        check_ref: r.check_ref,
        result: r.result as AcceptanceResult,
        comment: r.comment,
      })),
    [rows],
  );
  const overview = acceptanceOverview(recorded);

  const rowFor = (env: AcceptanceEnvironment, ref: string) =>
    rows.find((r) => r.environment === env && r.check_ref === ref) ?? null;

  const save = (env: AcceptanceEnvironment, ref: string, result: AcceptanceResult) => {
    const key = `${env}:${ref}`;
    const comment = comments[key] ?? rowFor(env, ref)?.comment ?? "";
    record.mutate(
      { environment: env, checkRef: ref, result, comment },
      {
        onSuccess: () => toast.success("Result recorded."),
        onError: (e: any) => toast.error(e.message ?? "Could not record this result"),
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Hands-on acceptance checklist
          </CardTitle>
          <CardDescription>
            A person must work through the course in each of the five columns below and record what they
            actually saw. Automated tests do not establish that the course is readable, usable with a
            keyboard alone or usable with a screen reader — only these signed columns do.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">
              {overview.totalRecorded} of {ACCEPTANCE_TOTAL_CHECKS} lines recorded
            </Badge>
            <Badge variant={overview.failures ? "destructive" : "outline"}>
              {overview.failures} failures
            </Badge>
            <Badge variant="outline">{overview.notTested} not tested</Badge>
            <Badge variant={overview.handsOnComplete ? "secondary" : "destructive"}>
              {overview.handsOnComplete
                ? "Hands-on review complete"
                : "Hands-on review not complete"}
            </Badge>
          </div>
          {!overview.handsOnComplete && (
            <Alert>
              <AlertDescription className="text-xs">
                Until every line is recorded and every failure or untested line is explained, the course
                is not ready for publication or a pilot.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue={ACCEPTANCE_ENVIRONMENTS[0].key}>
        <TabsList className="flex w-full flex-wrap justify-start">
          {ACCEPTANCE_ENVIRONMENTS.map((e) => {
            const state = environmentChecklistState(e.key, recorded);
            return (
              <TabsTrigger key={e.key} value={e.key} className="text-xs">
                {e.label} ({state.recorded}/{state.total})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ACCEPTANCE_ENVIRONMENTS.map((env) => {
          const state = environmentChecklistState(env.key, recorded);
          const signed = signoffs.filter((s) => s.environment === env.key);
          return (
            <TabsContent key={env.key} value={env.key} className="space-y-3 pt-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{env.label}</CardTitle>
                  <CardDescription className="text-xs">{env.how}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{OUTCOME_LABEL[state.outcome]}</Badge>
                    <Badge variant="outline">{state.pass} passed</Badge>
                    <Badge variant="outline">{state.passWithObservation} with observation</Badge>
                    <Badge variant={state.fail ? "destructive" : "outline"}>{state.fail} failed</Badge>
                    <Badge variant="outline">{state.notTested} not tested</Badge>
                  </div>

                  {checksForEnvironment(env.key).map((check) => {
                    const key = `${env.key}:${check.ref}`;
                    const existing = rowFor(env.key, check.ref);
                    const comment = comments[key] ?? existing?.comment ?? "";
                    return (
                      <div key={check.ref} className="rounded-md border p-3 text-xs">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-medium">{check.title}</p>
                          {existing && (
                            <Badge variant={existing.result === "fail" ? "destructive" : "secondary"}
                              className="text-[10px]">
                              {ACCEPTANCE_RESULT_LABELS[existing.result as AcceptanceResult]}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-muted-foreground">{check.what_to_do}</p>
                        <Textarea
                          className="mt-2"
                          rows={2}
                          placeholder="What you saw (required for a failure or a line you could not test)"
                          value={comment}
                          onChange={(e) => setComments({ ...comments, [key]: e.target.value })}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {RESULT_OPTIONS.map((r) => (
                            <Button
                              key={r.key}
                              size="sm"
                              variant={existing?.result === r.key ? "default" : "outline"}
                              className="min-h-11"
                              disabled={
                                record.isPending ||
                                (acceptanceCommentRequired(r.key) && !comment.trim())
                              }
                              onClick={() => save(env.key, check.ref, r.key)}
                            >
                              {r.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Column sign-off */}
                  <div className="space-y-2 rounded-md border p-3">
                    <p className="text-sm font-medium">Sign this column</p>
                    {state.missingComments.length > 0 && (
                      <p className="text-xs text-destructive">
                        A comment is still needed for: {state.missingComments.join(", ")}.
                      </p>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">Name of the person who tested</Label>
                        <Input value={signerName} onChange={(e) => setSignerName(e.target.value)}
                          placeholder="Full name" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Device, browser or assistive software used</Label>
                        <Input value={deviceNote} onChange={(e) => setDeviceNote(e.target.value)}
                          placeholder="e.g. iPhone 13, Safari" className="mt-1" />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={!state.readyToSign || sign.isPending || !signerName.trim()}
                      onClick={() =>
                        sign.mutate(
                          {
                            environment: env.key,
                            outcome: state.outcome === "incomplete" ? "not_accepted" : (state.outcome as any),
                            signedByName: signerName,
                            deviceNote: deviceNote || null,
                            summary: {
                              pass: state.pass,
                              pass_with_observation: state.passWithObservation,
                              fail: state.fail,
                              not_tested: state.notTested,
                              total: state.total,
                            },
                          },
                          {
                            onSuccess: () => toast.success(`${env.label} column signed.`),
                            onError: (e: any) => toast.error(e.message ?? "Could not sign this column"),
                          },
                        )
                      }
                    >
                      <Signature className="h-3.5 w-3.5" />
                      Sign as {OUTCOME_LABEL[state.outcome]}
                    </Button>
                    {signed.length > 0 && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {signed.map((s) => (
                          <p key={s.id}>
                            {OUTCOME_LABEL[s.outcome] ?? s.outcome} — {s.signed_by_name} on{" "}
                            {s.signed_at?.slice(0, 10)}
                            {s.device_note ? ` (${s.device_note})` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
