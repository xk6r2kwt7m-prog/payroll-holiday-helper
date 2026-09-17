import { useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wine, AlertTriangle, Printer, ChevronDown, ChevronRight, Download, Mail,
} from "lucide-react";
import { useAlcoholAuthorisations } from "@/hooks/useCompliance";
import { usePremisesLicences } from "@/hooks/usePremisesLicences";
import {
  useEmployeesWithBranches, useRecordLicenceDocumentIssue,
} from "@/hooks/useDpsRegister";
import {
  buildDpsRegister, registerCsv, registerPdfRows, registerSummary, registerSummaryLine,
  type RegisterAuthorisation, type RegisterRow,
} from "@/lib/dps-register";
import { buildDpsAuthorisation, type LicenceSite } from "@/lib/licensing-documents";
import { LicensingDocumentPDF } from "@/components/compliance/LicensingDocumentPDF";
import { EmailLicensingDocumentDialog } from "@/components/compliance/EmailLicensingDocumentDialog";
import { cn } from "@/lib/utils";

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-GB") : "—";
}

/**
 * Live picture of who may sell alcohol, by site.
 *
 * Everyone front of house at a site is listed, so the document shows the whole
 * team and their state — not only the people who have already signed. Read-only:
 * authorising and revoking stays in the alcohol authorisations panel.
 */
export function AlcoholAuthorisationBoard() {
  const { data: records = [], isLoading } = useAlcoholAuthorisations();
  const { data: licences = [] } = usePremisesLicences();
  const employees = useEmployeesWithBranches();
  const recordIssue = useRecordLicenceDocumentIssue();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [emailSite, setEmailSite] = useState<string | null>(null);

  const sites = useMemo(() => {
    const branches = new Set<string>();
    for (const l of licences as any[]) if (l.branch) branches.add(l.branch);
    for (const r of records as any[]) if (r.branch) branches.add(r.branch);
    for (const e of employees) for (const b of e.branches ?? []) branches.add(b);

    return Array.from(branches).sort().map((branch) => {
      const rows = buildDpsRegister({
        branch,
        employees,
        authorisations: records as unknown as RegisterAuthorisation[],
      });
      const licence = (licences as any[]).find((l) => l.branch === branch);
      return {
        branch,
        licence,
        rows,
        summary: registerSummary(rows),
        summaryLine: registerSummaryLine(rows, branch),
      };
    }).filter((s) => s.rows.length > 0 || !!s.licence);
  }, [licences, records, employees]);

  const totals = useMemo(() => sites.reduce(
    (acc, s) => ({
      authorised: acc.authorised + s.summary.authorised,
      awaitingSignature: acc.awaitingSignature + s.summary.awaitingSignature,
      awaitingApproval: acc.awaitingApproval + s.summary.awaitingApproval,
      notAuthorised: acc.notAuthorised + s.summary.notAuthorised,
    }),
    { authorised: 0, awaitingSignature: 0, awaitingApproval: 0, notAuthorised: 0 },
  ), [sites]);

  const emptySites = useMemo(
    () => sites.filter((s) => s.summary.nobodyAuthorised).map((s) => s.branch),
    [sites],
  );

  const siteFor = (branch: string): LicenceSite => {
    const l = (licences as any[]).find((x) => x.branch === branch);
    return {
      branch,
      premises_name: l?.premises_name,
      premises_address: l?.premises_address,
      licence_number: l?.licence_number,
      licence_holder: l?.licence_holder,
      issuing_authority: l?.issuing_authority,
      dps_name: l?.dps_name,
      dps_personal_licence_number: l?.dps_personal_licence_number,
    };
  };

  const downloadCsv = (branch: string, rows: RegisterRow[]) => {
    const blob = new Blob([registerCsv(rows, branch)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${branch}-alcohol-register-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDocument = async (site: (typeof sites)[number]) => {
    const doc = buildDpsAuthorisation(siteFor(site.branch), site.licence?.issue_date ?? null);
    const blob = await pdf(
      <LicensingDocumentPDF
        doc={doc}
        staff={registerPdfRows(site.rows)}
        summaryLine={site.summaryLine}
        warningLine={site.summary.nobodyAuthorised
          ? `Nobody at ${site.branch} is currently authorised to sell alcohol. Alcohol must not be sold until the licence holder has authorised at least one person.`
          : null}
        auditLine="Produced from the live staff register in UglyOps HR."
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${site.branch}-alcohol-authorisation.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    recordIssue.mutate({
      branch: site.branch,
      licence_id: site.licence?.id ?? null,
      subject_type: "dps_authorisation",
      snapshot: { document: doc, rows: site.rows, summary_line: site.summaryLine },
      authorised_count: site.summary.authorised,
      listed_count: site.summary.listed,
    });
  };

  const emailing = sites.find((s) => s.branch === emailSite);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wine className="h-4 w-4 text-muted-foreground" />
          Who can sell alcohol
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Everyone front of house is listed for their site. Download or email the authorisation
          whenever it is asked for.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sites recorded yet. Add a premises licence and assign staff to their site.
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
                const group = (status: RegisterRow["status"]) =>
                  site.rows.filter((r) => r.status === status);
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
                          {site.summary.authorised} of {site.summary.listed} authorised
                          {site.licence?.dps_name ? ` · Designated Premises Supervisor ${site.licence.dps_name}` : ""}
                          {site.licence?.dps_personal_licence_number ? ` (${site.licence.dps_personal_licence_number})` : ""}
                        </span>
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="px-3 pb-3 space-y-3">
                        <Group title="Can sell alcohol" rows={group("authorised")} tone="green" showApproval />
                        <Group title="Signed — waiting for the licence holder" rows={group("awaiting_approval")} tone="amber" />
                        <Group title="Waiting for the staff member to sign" rows={group("awaiting_signature")} tone="amber" />
                        <Group title="Not authorised" rows={group("not_authorised")} tone="grey" showReason />
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button size="sm" variant="outline" onClick={() => downloadDocument(site)}>
                            <Download className="h-3.5 w-3.5 mr-1.5" /> Download the authorisation
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEmailSite(site.branch)}>
                            <Mail className="h-3.5 w-3.5 mr-1.5" /> Email a copy
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadCsv(site.branch, site.rows)}>
                            Register CSV
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1.5" /> Print this page
              </Button>
            </div>
          </>
        )}

        {emailing && (
          <EmailLicensingDocumentDialog
            open={!!emailSite}
            onOpenChange={(v) => setEmailSite(v ? emailSite : null)}
            branch={emailing.branch}
            licenceId={emailing.licence?.id ?? null}
            doc={buildDpsAuthorisation(siteFor(emailing.branch), emailing.licence?.issue_date ?? null)}
            rows={emailing.rows}
            summaryLine={emailing.summaryLine}
            warningLine={emailing.summary.nobodyAuthorised
              ? `Nobody at ${emailing.branch} is currently authorised to sell alcohol.`
              : null}
            auditLine="Produced from the live staff register in UglyOps HR."
          />
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
  title, rows, tone, showApproval, showReason,
}: {
  title: string;
  rows: RegisterRow[];
  tone: string;
  showApproval?: boolean;
  showReason?: boolean;
}) {
  if (rows.length === 0) return null;
  const badgeTone: Record<string, string> = {
    green: "bg-success/10 text-success",
    amber: "bg-warning/10 text-warning",
    grey: "bg-muted text-muted-foreground",
  };
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({rows.length})
      </p>
      {rows.map((r) => (
        <div key={r.employee_id} className="flex items-start justify-between gap-2 rounded-md border p-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug">
              {r.name}
              {r.no_longer_employed && (
                <span className="text-[11px] text-muted-foreground"> · no longer employed</span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {r.role || "Role not recorded"}
              {r.signed_at ? ` · signed ${formatDate(r.signed_at)}` : ""}
              {showApproval && r.approved_at ? ` · authorised ${formatDate(r.approved_at)}` : ""}
            </p>
            {showApproval && r.approved_by && (
              <p className="text-[11px] text-muted-foreground">
                Authorised by {r.approved_by}
                {r.approver_licence ? ` (${r.approver_licence})` : ""}
              </p>
            )}
            {showReason && r.revoked_reason && (
              <p className="text-[11px] text-muted-foreground">Reason: {r.revoked_reason}</p>
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
