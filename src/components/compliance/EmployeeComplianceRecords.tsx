import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Download, FileText } from "lucide-react";
import { useInductionPacks, useInductionPackItems } from "@/hooks/useCompliance";
import { AlcoholAuthorisationsPanel } from "@/components/compliance/AlcoholAuthorisationsPanel";
import { useState } from "react";

function PackDetail({ pack }: { pack: any }) {
  const { data: items = [] } = useInductionPackItems(pack.id);

  const download = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = items
      .map(
        (i: any) =>
          `<tr><td>${i.document_name}</td><td>v${i.document_version ?? 1}</td><td>${
            i.acknowledged_at ? new Date(i.acknowledged_at).toLocaleString("en-GB") : "not confirmed"
          }</td></tr>`
      )
      .join("");
    w.document.write(`
      <html><head><title>Induction record</title>
      <style>body{font-family:sans-serif;padding:32px;color:#111}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ddd;padding:6px;text-align:left}</style>
      </head><body>
      <h1>Induction completion record</h1>
      <p><strong>Staff:</strong> ${pack.employees ? `${pack.employees.forename} ${pack.employees.surname}` : ""}</p>
      <p><strong>Branch:</strong> ${pack.branch ?? ""} &nbsp; <strong>Role:</strong> ${pack.staff_role ?? ""}</p>
      <p><strong>Issued by:</strong> ${pack.issued_by_name ?? ""}</p>
      <p><strong>Sent:</strong> ${pack.sent_at ? new Date(pack.sent_at).toLocaleString("en-GB") : ""}</p>
      <p><strong>Opened:</strong> ${pack.opened_at ? new Date(pack.opened_at).toLocaleString("en-GB") : "—"}</p>
      <p><strong>Completed:</strong> ${pack.completed_at ? new Date(pack.completed_at).toLocaleString("en-GB") : "—"}</p>
      <table><thead><tr><th>Document</th><th>Version</th><th>Confirmed</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:16px;">${pack.final_statement_text ?? ""}</p>
      ${pack.final_signature_data ? `<img src="${pack.final_signature_data}" style="height:70px;margin-top:8px" />` : ""}
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="space-y-1">
        {items.map((i: any) => (
          <div key={i.id} className="flex items-center gap-2 text-xs">
            {i.acknowledged_at ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-warning shrink-0" />
            )}
            <span className="truncate">{i.document_name}</span>
            <span className="text-muted-foreground">v{i.document_version ?? 1}</span>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={download}>
        <Download className="h-3.5 w-3.5 mr-1.5" /> Completion record
      </Button>
    </div>
  );
}

/** Training & Compliance records shown inside an employee's profile. */
export function EmployeeComplianceRecords({ employeeId }: { employeeId: string }) {
  const { data: packs = [], isLoading } = useInductionPacks(employeeId);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Induction &amp; compliance
          </p>
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading...</p>
        ) : packs.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" /> No induction sent yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(packs as any[]).map(p => (
              <div key={p.id} className="px-4 py-3">
                <button
                  className="w-full text-left"
                  onClick={() => setExpanded(e => (e === p.id ? null : p.id))}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {p.branch || "Induction"} · {p.staff_role || "All staff"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sent {p.sent_at ? new Date(p.sent_at).toLocaleDateString("en-GB") : "—"}
                        {p.issued_by_name ? ` by ${p.issued_by_name}` : ""}
                      </p>
                    </div>
                    <Badge
                      className={
                        p.completed_at
                          ? "text-[10px] bg-success/10 text-success"
                          : "text-[10px] bg-warning/10 text-warning"
                      }
                    >
                      {p.completed_at ? "Completed" : p.opened_at ? "Opened" : "Sent"}
                    </Badge>
                  </div>
                </button>
                {expanded === p.id && <PackDetail pack={p} />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Alcohol sales authorisation
        </p>
        <AlcoholAuthorisationsPanel employeeId={employeeId} />
      </div>
    </div>
  );
}
