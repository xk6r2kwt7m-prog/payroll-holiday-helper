import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ClipboardList, Plus } from "lucide-react";
import { useMyIncidents } from "@/hooks/useIncidents";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { IncidentForm } from "@/components/incidents/IncidentForm";
import { categoryLabel, statusLabel, isLocked } from "@/lib/incident-categories";

/** Staff-facing incident reporting. Staff only ever see their own reports. */
export default function ReportIncident() {
  const { data: employee } = useCurrentEmployee();
  const { data: mine = [], isLoading } = useMyIncidents();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const reporterName = employee ? `${employee.forename ?? ""} ${employee.surname ?? ""}`.trim() : null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4 pb-24">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Report an incident</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Accidents, near misses, allergen problems, refusals, disorder, CCTV faults and visits from
            the police or council. Your manager reviews every report.
          </p>
        </header>

        <Button className="w-full" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New report
        </Button>

        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            My reports
          </p>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && mine.length === 0 && (
            <p className="text-sm text-muted-foreground">You have not reported anything yet.</p>
          )}
          {mine.map((r) => (
            <button
              key={r.id}
              className="w-full text-left rounded-xl border border-border bg-card p-3 active:bg-muted"
              onClick={() => { setEditing(r); setOpen(true); }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{categoryLabel(r.category)}</p>
                <Badge variant={r.status === "closed" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                  {statusLabel(r.status)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {r.report_number ? `${r.report_number} · ` : ""}
                {r.branch ?? "—"} · {r.incident_date ?? "no date"} {r.incident_time ?? ""}
              </p>
            </button>
          ))}
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editing ? (isLocked(editing.status) ? "Your report" : "Finish your draft") : "New report"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {editing && isLocked(editing.status) ? (
              <SubmittedView incident={editing} />
            ) : (
              <IncidentForm
                existing={editing}
                reporterName={reporterName}
                reporterEmployeeId={employee?.id ?? null}
                defaultBranch={employee?.branch ?? null}
                onDone={() => setOpen(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function SubmittedView({ incident }: { incident: any }) {
  const rows: [string, string][] = [
    ["Report number", incident.report_number ?? "—"],
    ["Status", statusLabel(incident.status)],
    ["Branch", incident.branch ?? "—"],
    ["When it happened", `${incident.incident_date ?? "—"} ${incident.incident_time ?? ""}`.trim()],
    ["Submitted", incident.submitted_at ? new Date(incident.submitted_at).toLocaleString() : "—"],
    ["Where", incident.location_detail ?? "—"],
    ["What happened", incident.description ?? "—"],
    ["What you did", incident.immediate_action ?? "—"],
  ];
  return (
    <div className="space-y-3">
      {rows.map(([k, v]) => (
        <div key={k}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
          <p className="text-sm whitespace-pre-wrap">{v}</p>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">
        Submitted reports cannot be changed or deleted. Ask your manager if something needs correcting.
      </p>
    </div>
  );
}
