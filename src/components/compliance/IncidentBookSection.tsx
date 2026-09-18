import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { AlertTriangle, Download, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INCIDENT_CATEGORIES, INCIDENT_STATUSES, categoryLabel, statusLabel,
  confidentialityLabel, isRestricted, deadlineState, requiresLicenceRecord,
} from "@/lib/incident-categories";
import {
  REGISTER_KINDS, registerCsv, registerFileName, downloadCsv, type RegisterKind,
} from "@/lib/incident-exports";
import { useIncidents, type IncidentRow } from "@/hooks/useIncidents";
import { IncidentReviewSheet } from "@/components/compliance/IncidentReviewSheet";
import { IncidentForm } from "@/components/incidents/IncidentForm";

/** Manager view of the incident book, inside Documents & Compliance. */
export function IncidentBookSection({ branch }: { branch?: string }) {
  const { data: incidents = [], isLoading } = useIncidents();
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<IncidentRow | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return incidents.filter((i) => {
      if (branch && i.branch !== branch) return false;
      if (status !== "all" && i.status !== status) return false;
      if (category !== "all" && i.category !== category) return false;
      if (!term) return true;
      return [i.report_number, i.location_detail, i.people_involved, i.description, categoryLabel(i.category)]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(term));
    });
  }, [incidents, branch, status, category, search]);

  const overdue = rows.filter((i) => deadlineState(i) === "overdue");
  const openInvestigations = rows.filter((i) => i.status !== "closed" && i.status !== "draft");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Open" value={openInvestigations.length} />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "warning" : undefined} />
        <div className="col-span-2 sm:col-span-1"><Stat label="Total" value={rows.length} /></div>
      </div>

      {overdue.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
          <p>
            {overdue.length} licence-required {overdue.length === 1 ? "incident was" : "incidents were"} not
            recorded within 24 hours of the incident. The original dates stay on record.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        <Button className="w-full" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Record an incident
        </Button>
        <Button className="w-full" variant="outline" onClick={() => setExportOpen(true)}>
          <Download className="h-4 w-4 mr-1" /> Registers
        </Button>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search reports"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {INCIDENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All categories</SelectItem>
              {INCIDENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No incidents recorded{branch ? ` at ${branch}` : ""} yet.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((i) => {
          const state = deadlineState(i);
          return (
            <button
              key={i.id}
              onClick={() => setSelected(i)}
              className="w-full text-left rounded-xl border border-border bg-card p-3 active:bg-muted"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{categoryLabel(i.category)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {i.report_number ? `${i.report_number} · ` : "Draft · "}
                    {i.branch ?? "—"} · {i.incident_date ?? "no date"} {i.incident_time ?? ""}
                  </p>
                </div>
                <Badge variant={i.status === "closed" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                  {statusLabel(i.status)}
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {requiresLicenceRecord(i.category) && (
                  <Badge variant="outline" className="text-[10px]">Licence record</Badge>
                )}
                {isRestricted(i.confidentiality) && (
                  <Badge variant="secondary" className="text-[10px]">{confidentialityLabel(i.confidentiality)}</Badge>
                )}
                {state === "overdue" && (
                  <Badge className="text-[10px] bg-warning/15 text-warning border-warning/30" variant="outline">
                    Recorded late
                  </Badge>
                )}
                {(state === "urgent" || state === "warning") && (
                  <Badge variant="outline" className="text-[10px] border-warning text-warning">
                    Due within 24 hours
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <IncidentReviewSheet
        incident={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />

      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent side="bottom" className="max-h-[94vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Record an incident</SheetTitle></SheetHeader>
          <div className="mt-4">
            <IncidentForm defaultBranch={branch ?? null} onDone={() => setNewOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <RegisterExportSheet
        open={exportOpen}
        onOpenChange={setExportOpen}
        incidents={incidents}
        branch={branch}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warning" }) {
  return (
    <div className={cn(
      "rounded-xl border p-3",
      tone === "warning" ? "border-warning/40 bg-warning/5" : "border-border bg-card"
    )}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function RegisterExportSheet({
  open, onOpenChange, incidents, branch,
}: { open: boolean; onOpenChange: (v: boolean) => void; incidents: IncidentRow[]; branch?: string }) {
  const [kind, setKind] = useState<RegisterKind>("branch");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader><SheetTitle>Registers</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Which register</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as RegisterKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGISTER_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {kind === "date_range" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Registers leave out personal and medical detail from restricted records. Download the individual
            report if you need the full account.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              const csv = registerCsv(incidents, kind, { branch, from, to });
              if (!csv) { toast.error("Nothing to export for that choice"); return; }
              downloadCsv(registerFileName(kind, { branch }), csv);
              onOpenChange(false);
            }}
          >
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
