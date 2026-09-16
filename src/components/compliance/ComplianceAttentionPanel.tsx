import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, Wine, CalendarClock, ClipboardList } from "lucide-react";
import {
  useInductionPacks, useAlcoholAuthorisations, useComplianceCertificates,
  useComplianceActions, useComplianceDocuments,
} from "@/hooks/useCompliance";
import { resolveExpiryBand } from "@/lib/compliance-expiry";
import { resolveAuthorisationStatus } from "@/lib/alcohol-authorisation-status";
import { cn } from "@/lib/utils";

interface Row {
  icon: any;
  label: string;
  detail: string;
  tone: "red" | "amber" | "green" | "grey";
}

const toneClass: Record<string, string> = {
  red: "bg-destructive/10 text-destructive",
  amber: "bg-warning/10 text-warning",
  green: "bg-success/10 text-success",
  grey: "bg-muted text-muted-foreground",
};

/** Shows only what needs attention. Completed work is not listed. */
export function ComplianceAttentionPanel({ onJump }: { onJump?: (section: string) => void }) {
  const { data: packs = [] } = useInductionPacks();
  const { data: auths = [] } = useAlcoholAuthorisations();
  const { data: certs = [] } = useComplianceCertificates();
  const { data: actions = [] } = useComplianceActions();
  const { data: documents = [] } = useComplianceDocuments();

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];

    const incomplete = (packs as any[]).filter(p => !p.completed_at && !p.is_test_send);
    if (incomplete.length > 0) {
      out.push({
        icon: Clock,
        label: `${incomplete.length} staff induction${incomplete.length === 1 ? "" : "s"} not finished`,
        detail: incomplete
          .slice(0, 3)
          .map(p => (p.employees ? `${p.employees.forename} ${p.employees.surname}` : "Staff"))
          .join(", "),
        tone: "amber",
      });
    }

    const pendingAuth = (auths as any[]).filter(a => {
      const emp = a.employees;
      return resolveAuthorisationStatus(a, emp ? { status: emp.status, archived_at: emp.archived_at } : undefined) === "pending";
    });
    if (pendingAuth.length > 0) {
      out.push({
        icon: Wine,
        label: `${pendingAuth.length} awaiting alcohol authorisation`,
        detail: "A DPS or personal licence holder needs to approve these.",
        tone: "amber",
      });
    }

    const expiredCerts = (certs as any[]).filter(c => resolveExpiryBand(c.expiry_date) === "expired");
    const soonCerts = (certs as any[]).filter(c => ["30", "60"].includes(String(resolveExpiryBand(c.expiry_date))));
    if (expiredCerts.length > 0) {
      out.push({
        icon: CalendarClock,
        label: `${expiredCerts.length} certificate${expiredCerts.length === 1 ? "" : "s"} expired`,
        detail: expiredCerts.slice(0, 3).map(c => `${c.certificate_type} (${c.branch})`).join(", "),
        tone: "red",
      });
    }
    if (soonCerts.length > 0) {
      out.push({
        icon: CalendarClock,
        label: `${soonCerts.length} certificate${soonCerts.length === 1 ? "" : "s"} expiring soon`,
        detail: soonCerts.slice(0, 3).map(c => `${c.certificate_type} (${c.branch})`).join(", "),
        tone: "amber",
      });
    }

    const openActions = (actions as any[]).filter(a => a.status !== "completed");
    if (openActions.length > 0) {
      out.push({
        icon: ClipboardList,
        label: `${openActions.length} outstanding inspection action${openActions.length === 1 ? "" : "s"}`,
        detail: openActions.slice(0, 3).map(a => a.title).join(", "),
        tone: "red",
      });
    }

    const expiredDocs = (documents as any[]).filter(d => resolveExpiryBand(d.expires_at) === "expired");
    if (expiredDocs.length > 0) {
      out.push({
        icon: AlertTriangle,
        label: `${expiredDocs.length} document${expiredDocs.length === 1 ? "" : "s"} past their review date`,
        detail: expiredDocs.slice(0, 3).map(d => d.name).join(", "),
        tone: "red",
      });
    }

    return out;
  }, [packs, auths, certs, actions, documents]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <div>
          <p className="text-sm font-medium">Nothing needs your attention</p>
          <p className="text-xs text-muted-foreground">Inductions, authorisations, certificates and actions are up to date.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Needs attention</p>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r, i) => (
          <div key={i} className="px-4 py-3 flex items-start gap-3">
            <r.icon className={cn("h-4 w-4 mt-0.5 shrink-0", r.tone === "red" ? "text-destructive" : "text-warning")} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{r.label}</p>
              {r.detail && <p className="text-xs text-muted-foreground truncate">{r.detail}</p>}
            </div>
            <Badge className={cn("text-[10px] shrink-0", toneClass[r.tone])}>
              {r.tone === "red" ? "Overdue" : "Soon"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
