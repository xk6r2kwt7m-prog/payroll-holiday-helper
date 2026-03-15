/**
 * Admin-only panel for viewing and managing evidence sources
 * linked to a training module. Never shown to staff.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookOpen, Plus, Trash2, ExternalLink, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  useModuleEvidence,
  useCreateEvidence,
  useDeleteEvidence,
  EVIDENCE_TYPE_OPTIONS,
  CONFIDENCE_OPTIONS,
  type EvidenceType,
  type ConfidenceLevel,
} from "@/hooks/useModuleEvidence";

interface Props {
  documentId: string;
  canEdit: boolean;
}

export function EvidencePanel({ documentId, canEdit }: Props) {
  const { data: evidence = [], isLoading } = useModuleEvidence(documentId);
  const createEvidence = useCreateEvidence();
  const deleteEvidence = useDeleteEvidence();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const [form, setForm] = useState({
    source_title: "",
    evidence_type: "official_guidance" as EvidenceType,
    source_organisation: "",
    source_region: "",
    source_url: "",
    source_notes: "",
    confidence_level: "medium" as ConfidenceLevel,
  });

  const handleSubmit = () => {
    if (!form.source_title.trim()) return;
    createEvidence.mutate({
      document_id: documentId,
      source_title: form.source_title,
      evidence_type: form.evidence_type,
      source_organisation: form.source_organisation || undefined,
      source_region: form.source_region || undefined,
      source_url: form.source_url || undefined,
      source_notes: form.source_notes || undefined,
      confidence_level: form.confidence_level,
    }, {
      onSuccess: () => {
        setForm({ source_title: "", evidence_type: "official_guidance", source_organisation: "", source_region: "", source_url: "", source_notes: "", confidence_level: "medium" });
        setShowForm(false);
      },
    });
  };

  const activeEvidence = evidence.filter(e => e.is_active);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <BookOpen className="h-4 w-4 text-primary shrink-0" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex-1">
          Evidence Sources
        </p>
        <Badge variant="outline" className="text-[9px]">{activeEvidence.length}</Badge>
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <>
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}

          {activeEvidence.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground py-2">No evidence sources linked yet.</p>
          )}

          {activeEvidence.map(ev => (
            <div key={ev.id} className="flex items-start gap-2 p-2 rounded-md bg-card border border-border">
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs font-medium text-foreground truncate">{ev.source_title}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[9px]">
                    {EVIDENCE_TYPE_OPTIONS.find(o => o.value === ev.evidence_type)?.label}
                  </Badge>
                  <Badge className={cn("text-[9px]",
                    ev.confidence_level === "high" ? "bg-success/10 text-success" :
                    ev.confidence_level === "medium" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {ev.confidence_level} confidence
                  </Badge>
                </div>
                {ev.source_organisation && (
                  <p className="text-[10px] text-muted-foreground">{ev.source_organisation}{ev.source_region ? ` · ${ev.source_region}` : ""}</p>
                )}
                {ev.source_notes && (
                  <p className="text-[10px] text-muted-foreground italic">{ev.source_notes}</p>
                )}
                <p className="text-[9px] text-muted-foreground">Added {format(parseISO(ev.created_at), "d MMM yyyy")}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {ev.source_url && (
                  <a href={ev.source_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
                {canEdit && (
                  <Button
                    variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                    onClick={() => deleteEvidence.mutate({ id: ev.id, documentId })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {canEdit && !showForm && (
            <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => setShowForm(true)}>
              <Plus className="h-3 w-3" /> Add Evidence Source
            </Button>
          )}

          {showForm && (
            <div className="space-y-2 p-2 rounded-md border border-primary/20 bg-primary/5">
              <div>
                <Label className="text-[10px]">Source Title *</Label>
                <Input value={form.source_title} onChange={e => setForm(f => ({ ...f, source_title: e.target.value }))} className="h-7 text-xs" placeholder="e.g. FSA Allergen Guidance 2024" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Evidence Type</Label>
                  <Select value={form.evidence_type} onValueChange={v => setForm(f => ({ ...f, evidence_type: v as EvidenceType }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVIDENCE_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Confidence</Label>
                  <Select value={form.confidence_level} onValueChange={v => setForm(f => ({ ...f, confidence_level: v as ConfidenceLevel }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONFIDENCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Organisation</Label>
                  <Input value={form.source_organisation} onChange={e => setForm(f => ({ ...f, source_organisation: e.target.value }))} className="h-7 text-xs" placeholder="e.g. FSA, HSE" />
                </div>
                <div>
                  <Label className="text-[10px]">Region</Label>
                  <Input value={form.source_region} onChange={e => setForm(f => ({ ...f, source_region: e.target.value }))} className="h-7 text-xs" placeholder="e.g. UK, EU" />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">URL</Label>
                <Input value={form.source_url} onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))} className="h-7 text-xs" placeholder="https://..." />
              </div>
              <div>
                <Label className="text-[10px]">Notes</Label>
                <Textarea value={form.source_notes} onChange={e => setForm(f => ({ ...f, source_notes: e.target.value }))} className="text-xs min-h-[40px]" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs h-7" onClick={handleSubmit} disabled={createEvidence.isPending || !form.source_title.trim()}>
                  {createEvidence.isPending ? "Adding…" : "Add"}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
