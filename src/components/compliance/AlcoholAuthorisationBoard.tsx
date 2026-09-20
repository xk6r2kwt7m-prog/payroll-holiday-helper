import { useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wine, Printer, ChevronDown, ChevronRight, Download, Mail,
} from "lucide-react";
import { useAlcoholAuthorisations } from "@/hooks/useCompliance";
import { usePremisesLicences } from "@/hooks/usePremisesLicences";
import {
  useEmployeesWithBranches, useRecordLicenceDocumentIssue,
  useAlcoholListDecisions, useSetAlcoholListDecision,
} from "@/hooks/useDpsRegister";
import {
  buildDpsRegister, registerCsv, registerPdfRows, registerSummary, registerSummaryLine,
  outstandingSignatureLine, unclassifiedForSite,
  type RegisterAuthorisation, type RegisterRow, type UnclassifiedPerson,
} from "@/lib/dps-register";

import { buildDpsAuthorisation, type LicenceSite } from "@/lib/licensing-documents";
import { LicensingDocumentPDF } from "@/components/compliance/LicensingDocumentPDF";
import { EmailLicensingDocumentDialog } from "@/components/compliance/EmailLicensingDocumentDialog";
import { DpsStandingAuthorisation } from "@/components/compliance/DpsStandingAuthorisation";
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
  const { data: decisions = [] } = useAlcoholListDecisions();
  const setDecision = useSetAlcoholListDecision();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [emailSite, setEmailSite] = useState<string | null>(null);

  const sites = useMemo(() => {
    const branches = new Set<string>();
    for (const l of licences as any[]) if (l.branch) branches.add(l.branch);
    for (const r of records as any[]) if (r.branch) branches.add(r.branch);
    for (const e of employees) for (const b of e.branches ?? []) branches.add(b);

    return Array.from(branches).sort().map((branch) => {
      const auths = records as unknown as RegisterAuthorisation[];
      const rows = buildDpsRegister({
        branch,
        employees,
        authorisations: auths,
        decisions: decisions as any,
      });
      const licence = (licences as any[]).find((l) => l.branch === branch);
      return {
        branch,
        licence,
        rows,
        unclassified: unclassifiedForSite({
          branch,
          employees,
          authorisations: auths,
          decisions: decisions as any,
        }),
        summary: registerSummary(rows),
        summaryLine: registerSummaryLine(rows, branch),
      };
    }).filter((s) => s.rows.length > 0 || s.unclassified.length > 0 || !!s.licence);
  }, [licences, records, employees, decisions]);

  const totals = useMemo(() => sites.reduce(
    (acc, s) => ({
      covered: acc.covered + s.summary.covered,
      signed: acc.signed + s.summary.signed,
      awaitingSignature: acc.awaitingSignature + s.summary.awaitingSignature,
    }),
    { covered: 0, signed: 0, awaitingSignature: 0 },
  ), [sites]);

  const outstandingSites = useMemo(
    () => sites.filter((s) => s.summary.awaitingSignature > 0),
    [sites],
  );
  const outstandingCount = outstandingSites.reduce((n, s) => n + s.summary.awaitingSignature, 0);


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
        warningLine={outstandingSignatureLine(site.rows, site.branch)}
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
      authorised_count: site.summary.signed,
      listed_count: site.summary.covered,
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
        <DpsStandingAuthorisation />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sites recorded yet. Add a premises licence and assign staff to their site.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2">
              <Stat label="Authorised to sell alcohol" value={totals.covered} tone="green" />
              <Stat label="Signed as well" value={totals.signed} tone="green" />
              <Stat label="Listed, no signature" value={totals.awaitingSignature} tone="grey" />
            </div>

            {outstandingCount > 0 && (
              <p className="rounded-lg bg-muted/50 text-muted-foreground text-xs p-2.5">
                {outstandingCount} {outstandingCount === 1 ? "person has" : "people have"} not added their
                own signature at {outstandingSites.map((s) => s.branch).join(", ")}. That is not a gap: a
                staff signature is not required by law. They are authorised by the Designated Premises
                Supervisor's signature on this list. Collect signatures only if you want the extra record.
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
                          {site.summary.covered} authorised · {site.summary.signed} also signed
                          {site.licence?.dps_name ? ` · Designated Premises Supervisor ${site.licence.dps_name}` : ""}
                          {site.licence?.dps_personal_licence_number ? ` (${site.licence.dps_personal_licence_number})` : ""}
                        </span>
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="px-3 pb-3 space-y-3">
                        <Group title="Signed as well" rows={group("signed")} tone="green" showApproval />
                        <Group title="Listed — signature not required" rows={group("awaiting_signature")} tone="grey" showReason />


                        {site.unclassified.length > 0 && (
                          <div className="space-y-1.5 rounded-md border border-warning/40 bg-warning/5 p-2.5">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-warning">
                              Role not clear — decide ({site.unclassified.length})
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Their job title does not say whether they serve customers. Choose so they are
                              not missing from this site's list. Nothing is sent to them by choosing.
                            </p>
                            {site.unclassified.map((p: UnclassifiedPerson) => (
                              <div
                                key={p.employee_id}
                                className="flex items-start justify-between gap-2 rounded-md border bg-background p-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-snug">{p.name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {p.role || "Role not recorded"}
                                  </p>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    disabled={setDecision.isPending}
                                    onClick={() => setDecision.mutate({
                                      employee_id: p.employee_id,
                                      branch: site.branch,
                                      decision: "front_of_house",
                                    })}
                                  >
                                    Add to the alcohol list
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    disabled={setDecision.isPending}
                                    onClick={() => setDecision.mutate({
                                      employee_id: p.employee_id,
                                      branch: site.branch,
                                      decision: "not_front_of_house",
                                    })}
                                  >
                                    Not front of house
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-[11px] text-muted-foreground">
                          Everyone named here is authorised to sell alcohol by the Designated Premises
                          Supervisor's signature on this list — under the Licensing Act 2003 their own
                          signature is not required. Ask for one only if you want the extra record. The
                          system never authorises anyone by itself.
                        </p>

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
            warningLine={outstandingSignatureLine(emailing.rows, emailing.branch)}

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
            {tone === "green" ? "Signed" : tone === "amber" ? "In progress" : "Authorised"}
          </Badge>
        </div>
      ))}
    </div>
  );
}
