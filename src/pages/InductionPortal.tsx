import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/letters/SignaturePad";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText, ExternalLink, CheckCircle2, AlertCircle, Loader2, Wine, ShieldCheck,
  ChevronLeft, HeartPulse, ClipboardCheck, PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ASSESSMENT_QUESTIONS,
  DECLARATION_STATEMENT,
  FINAL_DECLARATION,
  HEALTH_DECLARATION_QUESTIONS,
  ILLNESS_RULE,
  INDUCTION_MODULES,
  INDUCTION_VERSION,
  SITE_FIELD_LABELS,
  type InductionBlock,
  type SiteFieldKey,
} from "@/data/induction/ud-induction-2026";
import {
  InductionDocumentReader,
  type ReaderPayload,
} from "@/components/induction/InductionDocumentReader";
import { canConfirmDocument } from "@/lib/document-reader";

interface PackItem {
  id: string;
  document_name: string;
  document_category: string | null;
  document_version: number | null;
  requires_signature: boolean;
  acknowledged_at: string | null;
  view_url: string | null;
  /** On-screen reading version, when a manager has prepared one. */
  reader?: ReaderPayload | null;
}

interface ModuleRow {
  id: string;
  module_key: string;
  title: string;
  read_at: string | null;
  acknowledged_at: string | null;
}

interface PortalData {
  pack: {
    id: string;
    branch: string | null;
    staff_role: string | null;
    status: string;
    completed_at: string | null;
    includes_alcohol: boolean;
    final_statement_text: string | null;
    issued_by_name: string | null;
  };
  employee: { name: string; first_name: string };
  modules: ModuleRow[];
  declaration: { signed_at: string | null; has_yes_answer: boolean } | null;
  assessment: { score: number; total: number; passed: boolean } | null;
  practical: { id: string; group_key: string; label: string; verified_at: string | null }[];
  site: Partial<Record<SiteFieldKey, string | null>>;
  items: PackItem[];
  alcohol: { id: string; status: string; employee_signed_at: string | null } | null;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/induction-portal`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type StepKind = "module" | "declaration" | "quiz" | "documents" | "alcohol" | "signoff";
interface Step {
  kind: StepKind;
  key: string;
  title: string;
  done: boolean;
}

export default function InductionPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const [itemSignatures, setItemSignatures] = useState<Record<string, string>>({});
  const [alcoholSignature, setAlcoholSignature] = useState("");
  const [finalSignature, setFinalSignature] = useState("");
  const [finalAgreed, setFinalAgreed] = useState(false);

  const [declAnswers, setDeclAnswers] = useState<Record<string, boolean | undefined>>({});
  const [declSignature, setDeclSignature] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      const json = await res.json();
      if (!res.ok) setError(json?.message || json?.error || "This link could not be opened.");
      else { setData(json); setError(null); }
    } catch {
      setError("We could not load your induction. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ token, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Something went wrong");
    return json;
  };

  /* ── Steps ── */
  const steps: Step[] = useMemo(() => {
    if (!data) return [];
    const list: Step[] = data.modules.map((m) => ({
      kind: "module" as const,
      key: m.module_key,
      title: m.title,
      done: !!m.acknowledged_at,
    }));
    list.push({ kind: "declaration", key: "declaration", title: "Health declaration", done: !!data.declaration?.signed_at });
    list.push({ kind: "quiz", key: "quiz", title: "Knowledge check", done: !!data.assessment?.passed });
    if (data.items.length > 0) {
      list.push({
        kind: "documents",
        key: "documents",
        title: "Documents to confirm",
        done: data.items.every((i) => !!i.acknowledged_at),
      });
    }
    if (data.pack.includes_alcohol) {
      list.push({ kind: "alcohol", key: "alcohol", title: "Alcohol sales", done: !!data.alcohol?.employee_signed_at });
    }
    list.push({ kind: "signoff", key: "signoff", title: "Sign and finish", done: false });
    return list;
  }, [data]);

  // Resume where the staff member left off.
  const [resumed, setResumed] = useState(false);
  useEffect(() => {
    if (resumed || steps.length === 0) return;
    const next = steps.findIndex((s) => !s.done);
    setStepIndex(next === -1 ? steps.length - 1 : next);
    setResumed(true);
  }, [steps, resumed]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-warning mx-auto mb-3" />
          <h1 className="text-lg font-semibold mb-2">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (data.pack.completed_at) {
    const pendingPractical = data.practical.filter((p) => !p.verified_at).length;
    return (
      <div className="min-h-screen bg-background p-5">
        <div className="max-w-lg mx-auto pt-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">All done, {data.employee.first_name}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your induction was saved to your staff record. Version {INDUCTION_VERSION}.
          </p>
          <div className="rounded-xl border border-border bg-card p-4 text-left space-y-2">
            {data.assessment && (
              <p className="text-sm">
                Knowledge check: <strong>{data.assessment.score}/{data.assessment.total}</strong>{" "}
                {data.assessment.passed ? "— passed" : ""}
              </p>
            )}
            {data.modules.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span className="truncate">{m.title}</span>
              </div>
            ))}
            {data.items.map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span className="truncate">{i.document_name}</span>
              </div>
            ))}
          </div>
          {pendingPractical > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Your manager still needs to verify {pendingPractical} practical item{pendingPractical === 1 ? "" : "s"} with you on site.
              Until then you must not use equipment you have not been trained on.
            </p>
          )}
        </div>
      </div>
    );
  }

  const step = steps[stepIndex];
  const doneCount = steps.filter((s) => s.done).length;
  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));

  /* ── Step actions ── */

  const acknowledgeModule = async (key: string) => {
    setBusy(key);
    try {
      await post({ action: "acknowledge_module", module_key: key });
      await load();
      goNext();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const submitDeclaration = async () => {
    setBusy("declaration");
    try {
      const res = await post({ action: "submit_declaration", answers: declAnswers, signature_data: declSignature });
      await load();
      if (res?.has_yes_answer) {
        toast.info("Thank you. Your manager will speak with you before you handle food.");
      }
      goNext();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const submitQuiz = async () => {
    setBusy("quiz");
    try {
      const res = await post({ action: "submit_assessment", answers: quizAnswers });
      setQuizResult({ score: res.score, total: res.total, passed: res.passed });
      await load();
      if (res.passed) toast.success(`Passed — ${res.score}/${res.total}`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const acknowledgeItem = async (item: PackItem) => {
    setBusy(item.id);
    try {
      await post({
        action: "acknowledge_item",
        item_id: item.id,
        signature_data: item.requires_signature ? itemSignatures[item.id] : undefined,
      });
      await load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const confirmAlcohol = async () => {
    setBusy("alcohol");
    try {
      await post({ action: "acknowledge_alcohol", signature_data: alcoholSignature });
      toast.success("Alcohol-sales acknowledgement recorded");
      await load();
      goNext();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const complete = async () => {
    setBusy("complete");
    try {
      await post({ action: "complete", signature_data: finalSignature });
      toast.success("Induction completed — thank you");
      await load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const content = INDUCTION_MODULES.find((m) => m.key === step?.key);
  const declComplete = HEALTH_DECLARATION_QUESTIONS.every((q) => typeof declAnswers[q.key] === "boolean");
  const allStepsDone = steps.filter((s) => s.kind !== "signoff").every((s) => s.done);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky mobile header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setStepIndex((i) => i - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{step?.title}</p>
              <p className="text-[11px] text-muted-foreground">
                Step {stepIndex + 1} of {steps.length} · {doneCount} done
              </p>
            </div>
            {data.pack.branch && <Badge variant="outline" className="text-[10px] shrink-0">{data.pack.branch}</Badge>}
          </div>
          <Progress value={(doneCount / steps.length) * 100} className="h-1.5" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {stepIndex === 0 && (
          <div>
            <h1 className="text-xl font-bold">Welcome, {data.employee.first_name}</h1>
            <p className="text-sm text-muted-foreground">
              Short sections, one at a time. You can stop and come back — we save your place.
            </p>
          </div>
        )}

        {/* Reading module */}
        {step?.kind === "module" && content && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{content.summary} · about {content.minutes} min</p>
            <div className="space-y-4">
              {content.blocks.map((b, i) => (
                <BlockView key={i} block={b} site={data.site} />
              ))}
            </div>
            <StickyAction
              label={step.done ? "Continue" : "I have read and understood this"}
              busy={busy === step.key}
              onClick={() => (step.done ? goNext() : acknowledgeModule(step.key))}
            />
          </div>
        )}

        {/* Health declaration */}
        {step?.kind === "declaration" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3">
              <HeartPulse className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{ILLNESS_RULE}</p>
            </div>
            {data.declaration?.signed_at ? (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Declaration submitted
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {HEALTH_DECLARATION_QUESTIONS.map((q, idx) => (
                    <div key={q.key} className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <p className="text-sm">{idx + 1}. {q.text}</p>
                      <div className="flex gap-2">
                        {[true, false].map((val) => (
                          <Button
                            key={String(val)}
                            type="button"
                            size="sm"
                            variant={declAnswers[q.key] === val ? "default" : "outline"}
                            className="flex-1 min-h-[40px]"
                            onClick={() => setDeclAnswers((a) => ({ ...a, [q.key]: val }))}
                          >
                            {val ? "Yes" : "No"}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <p className="text-xs text-muted-foreground">{DECLARATION_STATEMENT}</p>
                  <SignaturePad onSignatureChange={(s) => setDeclSignature(s ?? "")} />
                </div>
              </>
            )}
            <StickyAction
              label={data.declaration?.signed_at ? "Continue" : "Submit declaration"}
              busy={busy === "declaration"}
              disabled={!data.declaration?.signed_at && (!declComplete || !declSignature)}
              onClick={() => (data.declaration?.signed_at ? goNext() : submitDeclaration())}
            />
          </div>
        )}

        {/* Knowledge check */}
        {step?.kind === "quiz" && (
          <div className="space-y-4">
            {data.assessment?.passed ? (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-sm flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-success" />
                Passed — {data.assessment.score}/{data.assessment.total}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  10 questions. You need 8 correct to pass. If you don't pass you can try again.
                </p>
                {quizResult && !quizResult.passed && (
                  <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-sm">
                    You scored {quizResult.score}/{quizResult.total}. Review the sections and try again.
                  </div>
                )}
                <div className="space-y-2">
                  {ASSESSMENT_QUESTIONS.map((q, idx) => (
                    <div key={q.key} className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <p className="text-sm">{idx + 1}. {q.text}</p>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <Button
                            key={oi}
                            type="button"
                            variant={quizAnswers[q.key] === oi ? "default" : "outline"}
                            className="w-full justify-start text-left min-h-[44px] h-auto py-2 whitespace-normal"
                            onClick={() => setQuizAnswers((a) => ({ ...a, [q.key]: oi }))}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <StickyAction
              label={data.assessment?.passed ? "Continue" : "Submit answers"}
              busy={busy === "quiz"}
              disabled={!data.assessment?.passed && Object.keys(quizAnswers).length < ASSESSMENT_QUESTIONS.length}
              onClick={() => (data.assessment?.passed ? goNext() : submitQuiz())}
            />
          </div>
        )}

        {/* Documents */}
        {step?.kind === "documents" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Read each document, then confirm it. Where a document has been prepared for the screen
              you can read it here section by section — the original file is always available too.
            </p>
            {data.items.map((item) => {
              const isDone = !!item.acknowledged_at;
              const reader = item.reader ?? null;
              const readerDone = !reader || canConfirmDocument(reader.sections, reader.questions, reader.progress);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-4 space-y-3",
                    isDone ? "border-success/30 bg-success/5" : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.document_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.document_category}
                        {item.document_version ? ` · version ${item.document_version}` : ""}
                        {item.requires_signature ? " · signature required" : ""}
                      </p>
                    </div>
                    {isDone && <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
                  </div>

                  {!isDone && reader && (
                    <InductionDocumentReader
                      reader={reader}
                      itemId={item.id}
                      disabled={busy === item.id}
                      onRead={async (sectionId) => {
                        await post({ action: "read_section", item_id: item.id, section_id: sectionId });
                        await load();
                      }}
                      onAnswer={async (questionId, answerIndex) => {
                        const res = await post({
                          action: "answer_section_question",
                          item_id: item.id,
                          question_id: questionId,
                          answer_index: answerIndex,
                        });
                        await load();
                        return { correct: !!res.correct, explanation: res.explanation ?? null };
                      }}
                    />
                  )}

                  {item.view_url && (
                    <a
                      href={item.view_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {reader ? "Open the original file" : "Open document"}
                    </a>
                  )}

                  {!isDone && item.requires_signature && readerDone && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Sign below</p>
                      <SignaturePad onSignatureChange={(sig) => setItemSignatures((s) => ({ ...s, [item.id]: sig ?? "" }))} />
                    </div>
                  )}

                  {!isDone && (
                    <Button
                      size="sm"
                      className="w-full min-h-[44px]"
                      disabled={
                        busy === item.id ||
                        !readerDone ||
                        (item.requires_signature && !itemSignatures[item.id])
                      }
                      onClick={() => acknowledgeItem(item)}
                    >
                      {busy === item.id
                        ? "Saving..."
                        : readerDone
                          ? "I have read and understood this"
                          : "Finish reading to confirm"}
                    </Button>
                  )}
                </div>
              );
            })}
            <StickyAction
              label="Continue"
              disabled={!data.items.every((i) => i.acknowledged_at)}
              onClick={goNext}
            />
          </div>
        )}

        {/* Alcohol */}
        {step?.kind === "alcohol" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wine className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">Alcohol sales acknowledgement</p>
              </div>
              <p className="text-xs text-muted-foreground">
                I confirm I have been trained on age verification (Challenge 25), the refusal-of-sale procedure,
                the premises licence conditions and the refusal/incident book, and I accept written authorisation
                to sell alcohol at this branch under the supervision of the premises licence holder or DPS.
              </p>
              {data.alcohol?.employee_signed_at ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <ShieldCheck className="h-4 w-4" /> Signed — awaiting confirmation from your manager
                </div>
              ) : (
                <SignaturePad onSignatureChange={(sig) => setAlcoholSignature(sig ?? "")} />
              )}
            </div>
            <StickyAction
              label={data.alcohol?.employee_signed_at ? "Continue" : "Confirm acknowledgement"}
              busy={busy === "alcohol"}
              disabled={!data.alcohol?.employee_signed_at && !alcoholSignature}
              onClick={() => (data.alcohol?.employee_signed_at ? goNext() : confirmAlcohol())}
            />
          </div>
        )}

        {/* Sign off */}
        {step?.kind === "signoff" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Declaration and sign-off</p>
              </div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <Checkbox checked={finalAgreed} onCheckedChange={(v) => setFinalAgreed(v === true)} className="mt-0.5" />
                <span>{data.pack.final_statement_text || FINAL_DECLARATION}</span>
              </label>
              <SignaturePad onSignatureChange={(sig) => setFinalSignature(sig ?? "")} />
            </div>
            {!allStepsDone && (
              <ul className="text-xs text-muted-foreground space-y-1">
                {steps.filter((s) => s.kind !== "signoff" && !s.done).map((s) => (
                  <li key={s.key}>
                    <button className="underline" onClick={() => setStepIndex(steps.findIndex((x) => x.key === s.key))}>
                      Still to do: {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <StickyAction
              label="Complete my induction"
              busy={busy === "complete"}
              disabled={!allStepsDone || !finalAgreed || !finalSignature}
              onClick={complete}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StickyAction({
  label, onClick, disabled, busy,
}: { label: string; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur p-3">
      <div className="max-w-lg mx-auto">
        <Button className="w-full min-h-[48px]" disabled={disabled || busy} onClick={onClick}>
          {busy ? "Saving..." : label}
        </Button>
      </div>
    </div>
  );
}

function BlockView({ block, site }: { block: InductionBlock; site: Partial<Record<SiteFieldKey, string | null>> }) {
  if (block.kind === "text") return <p className="text-sm leading-relaxed">{block.text}</p>;
  if (block.kind === "list") {
    return (
      <ul className="space-y-1.5 text-sm">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-primary">•</span>
            <span className="leading-relaxed">{it}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.kind === "steps") {
    return (
      <ol className="space-y-1.5 text-sm">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-semibold text-primary shrink-0">{i + 1}.</span>
            <span className="leading-relaxed">{it}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (block.kind === "callout") {
    return (
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
        <p className="text-xs font-semibold mb-1">{block.title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{block.text}</p>
      </div>
    );
  }
  if (block.kind === "table") {
    return (
      <div className="rounded-xl border border-border overflow-hidden">
        {block.rows.map((row, i) => (
          <div key={i} className={cn("p-3 text-sm space-y-0.5", i % 2 === 1 && "bg-muted/40")}>
            <p className="font-medium">{row[0]}</p>
            {row.slice(1).map((cell, ci) => (
              <p key={ci} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{block.head[ci + 1]}: </span>{cell}
              </p>
            ))}
          </div>
        ))}
      </div>
    );
  }
  // site-specific details
  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {block.fields.map((f) => (
        <div key={f} className="p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{SITE_FIELD_LABELS[f]}</p>
          <p className="text-sm">
            {site?.[f] || <span className="text-muted-foreground">Your manager will show you this during your site induction.</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
