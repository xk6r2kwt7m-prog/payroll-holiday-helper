/**
 * Admin-only panel for viewing and managing review insights
 * linked to a training module. Never shown to staff.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  useReviewInsights,
  useCreateInsight,
  useDeleteInsight,
  INSIGHT_TAG_OPTIONS,
  type FrequencyLevel,
  type InsightConfidence,
} from "@/hooks/useReviewInsights";
import { validateInsightForm, type InsightValidationResult } from "@/lib/evidence-validation";

interface Props {
  documentId: string;
  canEdit: boolean;
}

const EMPTY_FORM = {
  insight_tag: "recurring_delay_issue",
  summary: "",
  review_channel: "",
  market_scope: "",
  operational_problem: "",
  customer_impact: "",
  suggested_training_response: "",
  frequency_level: "medium" as FrequencyLevel,
  confidence_level: "medium" as InsightConfidence,
};

export function ReviewInsightsPanel({ documentId, canEdit }: Props) {
  const { data: insights = [], isLoading } = useReviewInsights(documentId);
  const createInsight = useCreateInsight();
  const deleteInsight = useDeleteInsight();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [validation, setValidation] = useState<InsightValidationResult | null>(null);

  const handleSubmit = () => {
    const result = validateInsightForm(form);
    setValidation(result);
    if (!result.valid) return;

    createInsight.mutate({
      document_id: documentId,
      insight_tag: form.insight_tag,
      summary: form.summary.trim(),
      review_channel: form.review_channel.trim() || undefined,
      market_scope: form.market_scope.trim() || undefined,
      operational_problem: form.operational_problem.trim() || undefined,
      customer_impact: form.customer_impact.trim() || undefined,
      suggested_training_response: form.suggested_training_response.trim() || undefined,
      frequency_level: form.frequency_level,
      confidence_level: form.confidence_level,
    }, {
      onSuccess: () => {
        setForm({ ...EMPTY_FORM });
        setValidation(null);
        setShowForm(false);
      },
    });
  };

  const activeInsights = insights.filter(i => i.is_active);

  /** How complete is this insight's reasoning chain? */
  const insightStrength = (ins: { operational_problem: string | null; customer_impact: string | null; suggested_training_response: string | null }) => {
    const filled = [ins.operational_problem, ins.customer_impact, ins.suggested_training_response].filter(v => v?.trim()).length;
    if (filled === 3) return { label: "Complete", className: "bg-success/10 text-success" };
    if (filled >= 1) return { label: "Partial", className: "bg-warning/10 text-warning" };
    return { label: "Weak", className: "bg-destructive/10 text-destructive" };
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Eye className="h-4 w-4 text-accent-foreground shrink-0" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex-1">
          Review Insights
        </p>
        <Badge variant="outline" className="text-[9px]">{activeInsights.length}</Badge>
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <>
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}

          {activeInsights.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground py-2">No review insights linked yet.</p>
          )}

          {activeInsights.map(ins => {
            const strength = insightStrength(ins);
            return (
              <div key={ins.id} className="p-2 rounded-md bg-card border border-border space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 mb-0.5">
                      <Badge className="text-[9px] bg-accent/10 text-accent-foreground">
                        {INSIGHT_TAG_OPTIONS.find(o => o.value === ins.insight_tag)?.label || ins.insight_tag}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">{ins.frequency_level} freq</Badge>
                      <Badge className={cn("text-[9px]",
                        ins.confidence_level === "high" ? "bg-success/10 text-success" :
                        ins.confidence_level === "medium" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {ins.confidence_level} conf
                      </Badge>
                      <Badge className={cn("text-[9px]", strength.className)}>
                        {strength.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground">{ins.summary}</p>
                    {ins.operational_problem && (
                      <p className="text-[10px] text-muted-foreground"><span className="font-medium">Problem:</span> {ins.operational_problem}</p>
                    )}
                    {ins.customer_impact && (
                      <p className="text-[10px] text-muted-foreground"><span className="font-medium">Impact:</span> {ins.customer_impact}</p>
                    )}
                    {ins.suggested_training_response && (
                      <p className="text-[10px] text-muted-foreground"><span className="font-medium">Training response:</span> {ins.suggested_training_response}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {ins.review_channel ? `${ins.review_channel} · ` : ""}{format(parseISO(ins.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive shrink-0"
                      onClick={() => deleteInsight.mutate({ id: ins.id, documentId })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {canEdit && !showForm && (
            <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => { setShowForm(true); setValidation(null); }}>
              <Plus className="h-3 w-3" /> Add Review Insight
            </Button>
          )}

          {showForm && (
            <div className="space-y-2 p-2 rounded-md border border-accent/20 bg-accent/5">
              {/* Validation feedback */}
              {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
                <div className="space-y-1">
                  {validation.errors.map((e, i) => (
                    <p key={`e-${i}`} className="text-[10px] text-destructive flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-px" /> {e}
                    </p>
                  ))}
                  {validation.warnings.map((w, i) => (
                    <p key={`w-${i}`} className="text-[10px] text-warning flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-px" /> {w}
                    </p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Insight Tag</Label>
                  <Select value={form.insight_tag} onValueChange={v => setForm(f => ({ ...f, insight_tag: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INSIGHT_TAG_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Channel</Label>
                  <Input value={form.review_channel} onChange={e => setForm(f => ({ ...f, review_channel: e.target.value }))} className="h-7 text-xs" placeholder="e.g. Google, TripAdvisor" />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">Summary * <span className="text-muted-foreground font-normal">(describe the specific pattern)</span></Label>
                <Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className="text-xs min-h-[40px]" rows={2} placeholder="e.g. Multiple reviews mention long waits after ordering, particularly during weekend lunch service" />
              </div>
              <div>
                <Label className="text-[10px]">Operational Problem *</Label>
                <Input value={form.operational_problem} onChange={e => setForm(f => ({ ...f, operational_problem: e.target.value }))} className="h-7 text-xs" placeholder="What operational failure causes this?" />
              </div>
              <div>
                <Label className="text-[10px]">Customer Impact *</Label>
                <Input value={form.customer_impact} onChange={e => setForm(f => ({ ...f, customer_impact: e.target.value }))} className="h-7 text-xs" placeholder="How does this affect the guest experience?" />
              </div>
              <div>
                <Label className="text-[10px]">Suggested Training Response *</Label>
                <Input value={form.suggested_training_response} onChange={e => setForm(f => ({ ...f, suggested_training_response: e.target.value }))} className="h-7 text-xs" placeholder="What training would address this?" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Frequency</Label>
                  <Select value={form.frequency_level} onValueChange={v => setForm(f => ({ ...f, frequency_level: v as FrequencyLevel }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Confidence</Label>
                  <Select value={form.confidence_level} onValueChange={v => setForm(f => ({ ...f, confidence_level: v as InsightConfidence }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs h-7" onClick={handleSubmit} disabled={createInsight.isPending || !form.summary.trim()}>
                  {createInsight.isPending ? "Adding…" : "Add"}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setShowForm(false); setValidation(null); }}>Cancel</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
