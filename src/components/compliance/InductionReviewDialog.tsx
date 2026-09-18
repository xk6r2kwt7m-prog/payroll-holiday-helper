import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle, HeartPulse, ClipboardCheck, Loader2 } from "lucide-react";
import {
  useInductionProgress, useVerifyPracticalItem, useReviewDeclaration,
} from "@/hooks/useInductionProgress";
import { HEALTH_DECLARATION_QUESTIONS, PRACTICAL_GROUPS, type PracticalGroupKey } from "@/data/induction/ud-induction-2026";

interface Props {
  packId: string | null;
  employeeName: string;
  onClose: () => void;
}

/**
 * Manager review of one induction: sections read, health declaration,
 * knowledge check result, and practical items verified in person.
 */
export function InductionReviewDialog({ packId, employeeName, onClose }: Props) {
  const { data, isLoading } = useInductionProgress(packId ?? undefined);
  const verify = useVerifyPracticalItem();
  const review = useReviewDeclaration();
  const [notes, setNotes] = useState("");

  const grouped = useMemo(() => {
    const map: Record<string, typeof data extends undefined ? never : any[]> = {};
    (data?.practical ?? []).forEach((p) => {
      (map[p.group_key] ||= []).push(p);
    });
    return map;
  }, [data]);

  const latest = data?.assessments?.[0];
  const verifiedCount = (data?.practical ?? []).filter((p) => p.verified_at).length;

  return (
    <Dialog open={!!packId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employeeName} — induction record</DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
            {/* Sections */}
            <section className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Sections</p>
              {data.modules.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  {m.acknowledged_at
                    ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className="truncate">{m.title}</span>
                </div>
              ))}
            </section>

            {/* Knowledge check */}
            <section className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Knowledge check</p>
              {latest ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <ClipboardCheck className={latest.passed ? "h-4 w-4 text-success" : "h-4 w-4 text-warning"} />
                  <span>{latest.score}/{latest.total} — {latest.passed ? "passed" : "not passed"}</span>
                  <Badge variant="outline" className="text-[10px]">
                    attempt {latest.attempt_number}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not taken yet.</p>
              )}
            </section>

            {/* Health declaration */}
            <section className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Health declaration</p>
              {!data.declaration ? (
                <p className="text-sm text-muted-foreground">Not submitted yet.</p>
              ) : (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <HeartPulse className={data.declaration.has_yes_answer ? "h-4 w-4 text-warning" : "h-4 w-4 text-success"} />
                    {data.declaration.has_yes_answer
                      ? "Answered yes to at least one question — speak with them before food handling."
                      : "No issues declared."}
                  </div>
                  {data.declaration.has_yes_answer && (
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {HEALTH_DECLARATION_QUESTIONS.filter((q) => data.declaration!.answers?.[q.key]).map((q) => (
                        <li key={q.key}>• {q.text}</li>
                      ))}
                    </ul>
                  )}
                  {data.declaration.reviewed_at ? (
                    <p className="text-xs text-muted-foreground">
                      Reviewed by {data.declaration.reviewed_by_name} on{" "}
                      {new Date(data.declaration.reviewed_at).toLocaleDateString("en-GB")}
                      {data.declaration.manager_review_notes ? ` — ${data.declaration.manager_review_notes}` : ""}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="What did you agree? For example: not handling food until 48 hours symptom-free."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />
                      <Button
                        size="sm"
                        disabled={!notes.trim() || review.isPending}
                        onClick={() => review.mutate({ id: data.declaration!.id, notes: notes.trim() })}
                      >
                        Record my review
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Practical verification */}
            <section className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Verify in person
                </p>
                <span className="text-xs text-muted-foreground">
                  {verifiedCount} of {data.practical.length} verified
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tick each item once you have shown it and they can do it safely.
              </p>
              {(Object.keys(PRACTICAL_GROUPS) as PracticalGroupKey[]).map((g) => (
                (grouped[g] ?? []).length > 0 && (
                  <div key={g} className="rounded-xl border border-border bg-card">
                    <p className="px-3 py-2 text-xs font-semibold border-b border-border">{PRACTICAL_GROUPS[g]}</p>
                    <div className="divide-y divide-border">
                      {(grouped[g] ?? []).map((p: any) => (
                        <label key={p.id} className="flex items-start gap-3 px-3 py-2.5 text-sm cursor-pointer">
                          <Checkbox
                            checked={!!p.verified_at}
                            onCheckedChange={(v) => verify.mutate({ id: p.id, verified: v === true })}
                          />
                          <span className="min-w-0 flex-1 break-words">{p.label}</span>
                          {p.verified_at && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(p.verified_at).toLocaleDateString("en-GB")}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
