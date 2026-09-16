import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  categoryLabel, statusLabel, confidentialityLabel, conditionalFields,
} from "@/lib/incident-categories";

const BRAND = "#4a8c7f";
const DARK = "#1a2630";
const SUBTLE = "#6b7280";
const RULE = "#d1d5db";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#333", lineHeight: 1.5 },
  title: { fontSize: 15, color: DARK, fontFamily: "Helvetica-Bold" },
  meta: { fontSize 8: 8 } as any,
});

export interface IncidentPDFProps {
  incident: Record<string, any>;
  companyName?: string;
  amendments?: { reason: string; created_at: string; changes: any }[];
  witnesses?: { witness_name: string; witness_role?: string | null; statement?: string | null }[];
  evidence?: { label?: string | null; file_name?: string | null; created_at: string }[];
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 3 }}>
      <Text style={{ width: 150, color: SUBTLE }}>{label}</Text>
      <Text style={{ flex: 1 }}>{value && String(value).trim() ? String(value) : "—"}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 5 }}>{title}</Text>
      <View style={{ borderTopWidth: 1, borderTopColor: RULE, paddingTop: 6 }}>{children}</View>
    </View>
  );
}

function yesNo(v: any) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return v === undefined || v === null || v === "" ? "—" : String(v);
}

/** One incident, printed in full for the file or for an authority. */
export function IncidentPDF({ incident, companyName, amendments = [], witnesses = [], evidence = [] }: IncidentPDFProps) {
  const extras = conditionalFields(incident.category);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={{ borderBottomWidth: 2, borderBottomColor: BRAND, paddingBottom: 8, marginBottom: 10 }}>
          <Text style={s.title}>Incident report {incident.report_number ?? ""}</Text>
          <Text style={{ color: SUBTLE }}>
            {companyName ?? ""}{companyName ? " · " : ""}{incident.branch ?? ""} · {categoryLabel(incident.category)}
          </Text>
        </View>

        <Section title="Record">
          <Row label="Report number" value={incident.report_number} />
          <Row label="Status" value={statusLabel(incident.status)} />
          <Row label="Confidentiality" value={confidentialityLabel(incident.confidentiality)} />
          <Row label="Branch" value={incident.branch} />
          <Row label="Date of incident" value={incident.incident_date} />
          <Row label="Time of incident" value={incident.incident_time} />
          <Row label="Submitted" value={incident.submitted_at ? String(incident.submitted_at).slice(0, 16).replace("T", " ") : null} />
          <Row label="Reported by" value={incident.reported_by_name} />
          <Row
            label="Licence requirement"
            value={incident.licence_condition_28 ? "Recorded under the premises licence conditions" : "Not a licence-required category"}
          />
        </Section>

        <Section title="What happened">
          <Row label="Exactly where" value={incident.location_detail} />
          <Row label="People involved" value={incident.people_involved} />
          <Row label="Account" value={incident.description} />
          <Row label="Immediate action" value={incident.immediate_action} />
          <Row label="Manager notified" value={incident.manager_notified ? incident.manager_notified_name || "Yes" : "No"} />
          <Row label="Evidence available" value={yesNo(incident.evidence_available)} />
        </Section>

        {extras.length > 0 && (
          <Section title={`${categoryLabel(incident.category)} details`}>
            {extras.map((f) => (
              <Row key={f.key} label={f.label} value={yesNo(incident.details?.[f.key])} />
            ))}
          </Section>
        )}

        <Section title="Investigation">
          <Row label="Initial review" value={incident.review_notes} />
          <Row label="Findings" value={incident.findings} />
          <Row label="Root cause" value={incident.root_cause} />
          <Row label="Immediate controls" value={incident.immediate_controls} />
          <Row label="RIDDOR review flagged" value={yesNo(incident.riddor_flagged)} />
          <Row label="RIDDOR assessment" value={incident.riddor_assessment} />
          <Row label="Insurer notified" value={yesNo(incident.insurance_notified)} />
          <Row label="Authority notified" value={yesNo(incident.authority_notified)} />
          <Row label="Authority reference" value={incident.authority_reference} />
          <Row label="Training required" value={incident.training_required} />
          <Row label="Responsible" value={[incident.responsible_person, incident.responsible_job_title].filter(Boolean).join(" — ")} />
          <Row label="Completion deadline" value={incident.action_deadline} />
          <Row label="Final outcome" value={incident.outcome} />
          <Row label="Signed off by" value={incident.manager_signature} />
          <Row label="Closed" value={incident.closed_at ? String(incident.closed_at).slice(0, 16).replace("T", " ") : null} />
        </Section>

        {witnesses.length > 0 && (
          <Section title="Witness statements">
            {witnesses.map((w, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  {w.witness_name}{w.witness_role ? ` (${w.witness_role})` : ""}
                </Text>
                <Text>{w.statement ?? "—"}</Text>
              </View>
            ))}
          </Section>
        )}

        {evidence.length > 0 && (
          <Section title="Evidence held">
            {evidence.map((e, i) => (
              <Row key={i} label={String(e.created_at).slice(0, 10)} value={e.label || e.file_name} />
            ))}
          </Section>
        )}

        {amendments.length > 0 && (
          <Section title="Corrections">
            {amendments.map((a, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text style={{ color: SUBTLE }}>{String(a.created_at).slice(0, 16).replace("T", " ")}</Text>
                <Text>Reason: {a.reason}</Text>
                {Array.isArray(a.changes) && a.changes.map((c: any, j: number) => (
                  <Text key={j}>• {c.label}: {c.previous} → {c.next}</Text>
                ))}
              </View>
            ))}
            <Text style={{ color: SUBTLE, marginTop: 4 }}>
              The original entry is preserved; corrections are recorded separately.
            </Text>
          </Section>
        )}
      </Page>
    </Document>
  );
}
