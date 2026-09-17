import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wine, AlertTriangle, Printer, ChevronDown, ChevronRight, Download } from "lucide-react";
import { useAlcoholAuthorisations } from "@/hooks/useCompliance";
import { usePremisesLicences } from "@/hooks/usePremisesLicences";
import {
  authorisedListCsv, boardTotals, buildAlcoholBoard, sitesWithNobodyAuthorised,
  type BoardEntry,
} from "@/lib/alcohol-board";
import { cn } from "@/lib/utils";

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-GB") : "—";
}

/**
 * Live picture of who may sell alcohol, by site.
 * Read-only — authorising and revoking stays in the alcohol authorisations panel,
 * so nothing here can change a record.
 */
export function AlcoholAuthorisationBoard() {
  const { data: records = [], isLoading } = useAlcoholAuthorisations();
  const { data: licences = [] } = usePremisesLicences();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const sites = useMemo(
    () => buildAlcoholBoard(records as any, licences as any),
    [records, licences],
  );
  const totals = useMemo(() => boardTotals(sites), [sites]);
  const emptySites = useMemo(() => sitesWithNobodyAuthorised(sites), [sites]);

  const downloadList = () => {
    const csv = authorisedListCsv(sites);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alcohol-authorised-staff-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wine className="h-4 w-4 text-muted-foreground" />
          Who can sell alcohol
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Updates as staff sign and the licence holder approves. Show this to an officer if asked.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alcohol authorisations yet. Send one from the panel below.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Authorised" value={totals.authorised} tone="green" />
              <Stat label="Awaiting signature" value={totals.awaitingSignature} tone="amber" />
              <Stat label="Awaiting approval" value={totals.awaitingApproval} tone="amber" />
              <Stat label="Not authorised" value={totals.notAuthorised} tone="grey" />
            </div>

            {emptySites.length > 0 && (
              <p className="rounded-lg bg-destructive/10 text-destructive text-xs p-2.5 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Nobody is authorised to sell alcohol at {emptySites.join(", ")}. Alcohol must not be
                  sold there until someone is authorised by the licence holder.
                </span>
              </p>
            )}

            <div className="space-y-3">
              {sites.map((site) => {
                const isCollapsed = !!collapsed[site.branch];
                return (
                  <div key={site.branch} className="rounded-lg border">
                    <button
                      type="button"
                      className="w-full flex items-start gap-2 p-3 text-left"
                      onClick={() => setCollapsed((c) => ({ ...c, [site.branch]: !isCollapsed }))}
                    >
                      {isCollapsed
                        ? <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        : <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium">{site.branch}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {site.authorised.length} authorised
                          {site.dpsName ? ` · Designated Premises Supervisor ${site.dpsName}` : ""}
                          {site.dpsLicenceNumber ? ` (${site.dpsLicenceNumber})` : ""}
                        </span>
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="px-3 pb-3 space-y-3">
                        <Group title="Can sell alcohol" entries={site.authorised} tone="green" showApproval />
                        <Group title="Waiting for the staff member to sign" entries={site.awaitingSignature} tone="amber" />
                        <Group title="Signed — waiting for the licence holder" entries={site.awaitingApproval} tone="amber" />
                        <Group title="Not authorised" entries={site.notAuthorised} tone="grey" showReason />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={downloadList}>
                <Download className="h-4 w-4 mr-1.5" /> Download the list
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1.5" /> Print
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  const toneClass: Record<string, string> = {
    green: "text-success",
    amber: "text-warning",
    grey: "text-muted-foreground",
  };
  return (
    <div className="rounded-lg border p-2.5">
      <p className={cn("text-lg font-semibold leading-none", toneClass[tone])}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function Group({
  title,
  entries,
  tone,
  showApproval,
  showReason,
}: {
  title: string;
  entries: BoardEntry[];
  tone: string;
  showApproval?: boolean;
  showReason?: boolean;
}) {
  if (entries.length === 0) return null;
  const badgeTone: Record<string, string> = {
    green: "bg-success/10 text-success",
    amber: "bg-warning/10 text-warning",
    grey: "bg-muted text-muted-foreground",
  };
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({entries.length})
      </p>
      {entries.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-2 rounded-md border p-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug">{e.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {e.jobTitle || "Role not recorded"}
              {e.signedAt ? ` · signed ${formatDate(e.signedAt)}` : ""}
              {showApproval && e.approvedAt ? ` · authorised ${formatDate(e.approvedAt)}` : ""}
            </p>
            {showApproval && e.approvedBy && (
              <p className="text-[11px] text-muted-foreground">
                Authorised by {e.approvedBy}
                {e.approverLicence ? ` (${e.approverLicence})` : ""}
              </p>
            )}
            {showReason && e.revokedReason && (
              <p className="text-[11px] text-muted-foreground">Reason: {e.revokedReason}</p>
            )}
          </div>
          <Badge variant="outline" className={cn("text-[10px] shrink-0", badgeTone[tone])}>
            {tone === "green" ? "Authorised" : tone === "amber" ? "In progress" : "No"}
          </Badge>
        </div>
      ))}
    </div>
  );
}
