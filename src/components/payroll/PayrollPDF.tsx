import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const TEAL = "#5a9e91";
const DARK = "#1e2a2f";
const GRAY = "#555";
const LIGHT_TEAL = "#eef6f4";
const LIGHT_BG = "#fafaf8";
const BORDER = "#e0ddd8";
const AMBER = "#92400e";
const AMBER_BG = "#fffbeb";
const AMBER_BORDER = "#fbbf24";
const RED = "#9b2c2c";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 7.5,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
    color: DARK,
    backgroundColor: "#fff",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1.5,
    borderBottomColor: TEAL,
    paddingBottom: 6,
    marginBottom: 10,
  },
  topBrand: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: TEAL,
    letterSpacing: 1,
  },
  topTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  topMeta: {
    fontSize: 7,
    color: GRAY,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 30,
    right: 30,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 4,
    fontSize: 6,
    color: GRAY,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 5,
    color: TEAL,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  kpiCard: {
    backgroundColor: LIGHT_TEAL,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 7,
    flex: 1,
  },
  kpiLabel: {
    fontSize: 6,
    color: GRAY,
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  kpiSub: {
    fontSize: 6,
    color: GRAY,
  },
  deptRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  deptCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 6,
  },
  deptName: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 2,
  },
  deptStat: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  deptStatLabel: { fontSize: 6.5, color: GRAY },
  deptStatValue: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: DARK },
  table: { marginTop: 2, marginBottom: 4 },
  thRow: {
    flexDirection: "row",
    backgroundColor: TEAL,
    borderRadius: 2,
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    letterSpacing: 0.2,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 3.5,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  trAlt: { backgroundColor: LIGHT_BG },
  td: { fontSize: 7, color: DARK },
  tdBold: { fontSize: 7, fontFamily: "Helvetica-Bold", color: DARK },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 3,
    backgroundColor: TEAL,
    borderRadius: 2,
    marginTop: 1,
  },
  totalCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#fff" },
  deptSubHeader: {
    flexDirection: "row",
    backgroundColor: LIGHT_TEAL,
    paddingVertical: 2,
    paddingHorizontal: 3,
    marginTop: 3,
  },
  deptSubText: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: TEAL },
  statusBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  correctionNote: {
    backgroundColor: "#fff5f5",
    borderWidth: 0.5,
    borderColor: "#e53e3e",
    borderRadius: 3,
    padding: 5,
    marginBottom: 6,
  },
  correctionText: { fontSize: 7, color: "#e53e3e", fontFamily: "Helvetica-Bold" },
  starterRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 3,
    paddingHorizontal: 3,
    alignItems: "center",
  },
  starterRowLeaver: { backgroundColor: AMBER_BG, borderLeftWidth: 2, borderLeftColor: AMBER },
  starterRowStarter: { backgroundColor: AMBER_BG, borderLeftWidth: 2, borderLeftColor: AMBER },
  missingValue: { fontSize: 6.5, color: RED, fontFamily: "Helvetica-Bold" },
  alertInline: { fontSize: 5.5, color: RED, marginTop: 1 },
  noteInline: { fontSize: 5.5, color: GRAY, fontStyle: "italic", marginTop: 1 },
  statusBadgeSm: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
});

// Main table columns — without holiday pay (moved to own page)
const COL = {
  name: "22%",
  dept: "8%",
  rate: "11%",
  service: "11%",
  hours: "11%",
  perfBonus: "12%",
  specBonus: "12%",
  total: "13%",
};

// Holiday page table columns
const HCOL = {
  name: "24%",
  dept: "8%",
  date: "14%",
  hours: "12%",
  rate: "12%",
  total: "14%",
  notes: "16%",
};

interface PayrollEntry {
  id: string;
  employee_id: string;
  hourly_rate: number;
  service_charge: number | null;
  timesheet_hours: number;
  performance_bonus: number | null;
  special_bonus: number | null;
  holiday_accrued_hours: number | null;
  total_pay: number;
  notes: string | null;
  employees: {
    forename: string;
    surname: string;
    department: string;
    status: string;
    ni_number: string | null;
  } | null;
}

interface HolidayPayment {
  id: string;
  employee_name: string;
  employee_id: string | null;
  hours: number;
  rate: number;
  total: number;
  holiday_taken_date: string | null;
  notes: string | null;
  employees: {
    forename: string;
    surname: string;
    department: string;
  } | null;
}

interface StarterEmployee {
  id: string;
  forename: string;
  surname: string;
  department: string;
  status: string;
  hourly_rate: number;
  ni_number: string | null;
  bank_account_no: string | null;
  sort_code: string | null;
  nationality: string | null;
  passport_no: string | null;
  settlement_status: string | null;
  sharing_code: string | null;
  residence_permit: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}

interface PayrollPeriod {
  period_name: string;
  start_date: string;
  end_date: string;
  pay_date: string | null;
  status: string;
  period_weeks: number | null;
  sales_total: number | null;
  approved_at: string | null;
  notes: string | null;
}

interface PayrollPDFProps {
  period: PayrollPeriod;
  entries: PayrollEntry[];
  holidayPayments?: HolidayPayment[];
  starters?: StarterEmployee[];
  companyName?: string;
  isCorrection?: boolean;
  correctionNote?: string;
  logoUrl?: string;
}

function fmt(amount: number): string {
  return `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PayrollPDF({
  period,
  entries,
  holidayPayments = [],
  starters = [],
  companyName = "UD Restaurants Ltd",
  isCorrection = false,
  correctionNote,
  logoUrl,
}: PayrollPDFProps) {
  const sortedEntries = [...entries].sort((a, b) => {
    const deptOrder: Record<string, number> = { FOH: 0, BOH: 1, CPU: 2 };
    const deptA = deptOrder[a.employees?.department || ""] ?? 99;
    const deptB = deptOrder[b.employees?.department || ""] ?? 99;
    if (deptA !== deptB) return deptA - deptB;
    return (a.employees?.surname || "").localeCompare(b.employees?.surname || "");
  });

  const totals = entries.reduce(
    (acc, e) => ({
      hours: acc.hours + Number(e.timesheet_hours),
      basePay: acc.basePay + Number(e.timesheet_hours) * Number(e.hourly_rate),
      servicePay: acc.servicePay + Number(e.timesheet_hours) * Number(e.service_charge || 0),
      perfBonus: acc.perfBonus + Number(e.performance_bonus || 0),
      specBonus: acc.specBonus + Number(e.special_bonus || 0),
      holiday: acc.holiday + Number(e.holiday_accrued_hours || 0),
      total: acc.total + Number(e.total_pay),
    }),
    { hours: 0, basePay: 0, servicePay: 0, perfBonus: 0, specBonus: 0, holiday: 0, total: 0 }
  );

  const holidayTotal = holidayPayments.reduce((s, p) => s + Number(p.total), 0);
  const holidayHoursTotal = holidayPayments.reduce((s, p) => s + Number(p.hours), 0);
  const grandTotal = totals.total + holidayTotal;

  const departments = ["FOH", "BOH", "CPU"];
  const deptStats = departments.map((dept) => {
    const de = entries.filter((e) => e.employees?.department === dept);
    return {
      name: dept,
      count: de.length,
      hours: de.reduce((s, e) => s + Number(e.timesheet_hours), 0),
      total: de.reduce((s, e) => s + Number(e.total_pay), 0),
    };
  }).filter((d) => d.count > 0);

  const avgRate = entries.length > 0
    ? entries.reduce((s, e) => s + Number(e.hourly_rate), 0) / entries.length
    : 0;

  const laborPct = period.sales_total && Number(period.sales_total) > 0
    ? (grandTotal / Number(period.sales_total)) * 100
    : null;

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: "#e2e8f0", text: "#4a5568" },
    pending: { bg: "#fefcbf", text: "#975a16" },
    approved: { bg: "#c6f6d5", text: "#276749" },
    rejected: { bg: "#fed7d7", text: "#9b2c2c" },
  };
  const sts = statusColors[period.status] || statusColors.draft;

  const now = new Date().toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // Show all starters that appear in this period's entries
  const eligibleStarters = starters;

  const getRTWStatus = (starter: StarterEmployee) => {
    const hasNI = !!starter.ni_number;
    const hasPassport = !!starter.passport_no;
    const hasSettlement = !!starter.settlement_status;
    const hasResidence = !!starter.residence_permit;
    if (hasNI) return { status: "ok", label: "NI Number on file" };
    if (hasPassport && (hasSettlement || hasResidence)) return { status: "pending", label: "Awaiting NI — documents on file" };
    if (hasPassport) return { status: "warning", label: "Passport on file — no settlement/permit details" };
    return { status: "missing", label: "Missing NI & ID documents" };
  };

  const Header = ({ subtitle }: { subtitle?: string }) => (
    <View>
      <View style={styles.topHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {logoUrl && (
            <Image src={logoUrl} style={{ width: 40, height: 40, objectFit: "contain" }} />
          )}
          <View>
            <Text style={styles.topBrand}>{companyName.toUpperCase()}</Text>
            <Text style={styles.topTitle}>
              {subtitle || `Payroll Report${isCorrection ? " — CORRECTED" : ""}`}
            </Text>
          </View>
        </View>
        <View>
          <Text style={styles.topMeta}>{period.period_name}</Text>
          <Text style={styles.topMeta}>
            {fmtDate(period.start_date)} — {fmtDate(period.end_date)}
            {period.period_weeks ? ` (${period.period_weeks}wk)` : ""}
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 4, marginTop: 2 }}>
            <View style={[styles.statusBadge, { backgroundColor: sts.bg }]}>
              <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: sts.text }}>
                {period.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
      {/* Confidentiality Banner */}
      <View style={{ backgroundColor: "#1e2a2f", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 2, marginBottom: 8 }}>
        <Text style={{ fontSize: 5.5, color: "#fff", fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 0.5 }}>
          PRIVATE & CONFIDENTIAL — This document contains sensitive payroll and personal data. It must not be shared with, disclosed to, or accessed by any unauthorised third party.
        </Text>
      </View>
    </View>
  );

  const Footer = () => (
    <View style={styles.footer} fixed>
      <Text>{companyName} — Private & Confidential</Text>
      <Text>Generated: {now}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
    </View>
  );

  return (
    <Document>
      {/* ─── PAGE 1: Summary + Employee Table ─── */}
      <Page size="A4" style={styles.page} orientation="landscape">
        <Header />

        {isCorrection && correctionNote && (
          <View style={styles.correctionNote}>
            <Text style={styles.correctionText}>CORRECTION: {correctionNote}</Text>
          </View>
        )}

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>PAYROLL</Text>
            <Text style={styles.kpiValue}>{fmt(totals.total)}</Text>
            <Text style={styles.kpiSub}>{entries.length} employees</Text>
          </View>
          {holidayTotal > 0 && (
            <View style={[styles.kpiCard, { backgroundColor: AMBER_BG, borderWidth: 0.5, borderColor: AMBER_BORDER }]}>
              <Text style={styles.kpiLabel}>HOLIDAY PAY</Text>
              <Text style={[styles.kpiValue, { color: AMBER }]}>{fmt(holidayTotal)}</Text>
              <Text style={styles.kpiSub}>{holidayHoursTotal.toFixed(1)} hrs • see page 2</Text>
            </View>
          )}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>GRAND TOTAL</Text>
            <Text style={styles.kpiValue}>{fmt(grandTotal)}</Text>
            {period.pay_date && <Text style={styles.kpiSub}>Pay: {fmtDate(period.pay_date)}</Text>}
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>HOURS</Text>
            <Text style={styles.kpiValue}>{totals.hours.toFixed(1)}</Text>
            <Text style={styles.kpiSub}>Avg rate {fmt(avgRate)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>LABOUR %</Text>
            <Text style={styles.kpiValue}>{laborPct !== null ? `${laborPct.toFixed(1)}%` : "N/A"}</Text>
          </View>
        </View>

        {/* Department summary inline */}
        <View style={styles.deptRow}>
          {deptStats.map((d) => (
            <View key={d.name} style={styles.deptCard}>
              <Text style={styles.deptName}>{d.name}</Text>
              <View style={styles.deptStat}>
                <Text style={styles.deptStatLabel}>Staff</Text>
                <Text style={styles.deptStatValue}>{d.count}</Text>
              </View>
              <View style={styles.deptStat}>
                <Text style={styles.deptStatLabel}>Hours</Text>
                <Text style={styles.deptStatValue}>{d.hours.toFixed(1)}</Text>
              </View>
              <View style={styles.deptStat}>
                <Text style={styles.deptStatLabel}>Total</Text>
                <Text style={styles.deptStatValue}>{fmt(d.total)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ─── Employee Detail Table (no holiday pay column) ─── */}
        <Text style={styles.sectionTitle}>Employee Detail</Text>
        <View style={styles.table}>
          <View style={styles.thRow}>
            <Text style={[styles.th, { width: COL.name }]}>Employee</Text>
            <Text style={[styles.th, { width: COL.dept, textAlign: "center" }]}>Dept</Text>
            <Text style={[styles.th, { width: COL.rate, textAlign: "right" }]}>Rate</Text>
            <Text style={[styles.th, { width: COL.service, textAlign: "right" }]}>Service</Text>
            <Text style={[styles.th, { width: COL.hours, textAlign: "right" }]}>Hours</Text>
            <Text style={[styles.th, { width: COL.perfBonus, textAlign: "right" }]}>Perf</Text>
            <Text style={[styles.th, { width: COL.specBonus, textAlign: "right" }]}>Special</Text>
            <Text style={[styles.th, { width: COL.total, textAlign: "right" }]}>Total</Text>
          </View>

          {departments.map((dept) => {
            const de = sortedEntries.filter((e) => e.employees?.department === dept);
            if (de.length === 0) return null;
            const deptTotal = de.reduce((s, e) => s + Number(e.total_pay), 0);
            const deptHours = de.reduce((s, e) => s + Number(e.timesheet_hours), 0);

            return (
              <View key={dept}>
                <View style={styles.deptSubHeader}>
                  <Text style={styles.deptSubText}>
                    {dept} — {de.length} staff • {deptHours.toFixed(1)} hrs • {fmt(deptTotal)}
                  </Text>
                </View>
                {de.map((entry, idx) => {
                  const emp = entry.employees;
                  const empStatus = emp?.status;
                  const isStarter = empStatus === "starter";
                  const isLeaver = empStatus === "leaver";
                  return (
                    <View key={entry.id} style={[
                      styles.tr,
                      idx % 2 === 1 && styles.trAlt,
                      isLeaver && { backgroundColor: AMBER_BG, borderLeftWidth: 2, borderLeftColor: AMBER },
                      isStarter && { backgroundColor: AMBER_BG, borderLeftWidth: 2, borderLeftColor: AMBER },
                    ]} wrap={false}>
                      <View style={{ width: COL.name, flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={styles.tdBold}>
                          {emp?.surname}, {emp?.forename}
                        </Text>
                        {isStarter && (
                          <View style={{ backgroundColor: "#fef3c7", borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 5, fontFamily: "Helvetica-Bold", color: AMBER }}>STARTER</Text>
                          </View>
                        )}
                        {isLeaver && (
                          <View style={{ backgroundColor: "#fef3c7", borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 5, fontFamily: "Helvetica-Bold", color: AMBER }}>LEAVER</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.td, { width: COL.dept, textAlign: "center" }]}>{emp?.department}</Text>
                      <Text style={[styles.td, { width: COL.rate, textAlign: "right" }]}>{fmt(entry.hourly_rate)}</Text>
                      <Text style={[styles.td, { width: COL.service, textAlign: "right" }]}>{fmt(Number(entry.service_charge || 0))}</Text>
                      <Text style={[styles.td, { width: COL.hours, textAlign: "right" }]}>{Number(entry.timesheet_hours).toFixed(2)}</Text>
                      <Text style={[styles.td, { width: COL.perfBonus, textAlign: "right" }]}>{Number(entry.performance_bonus || 0) > 0 ? fmt(Number(entry.performance_bonus)) : ""}</Text>
                      <Text style={[styles.td, { width: COL.specBonus, textAlign: "right" }]}>{Number(entry.special_bonus || 0) > 0 ? fmt(Number(entry.special_bonus)) : ""}</Text>
                      <Text style={[styles.tdBold, { width: COL.total, textAlign: "right" }]}>{fmt(Number(entry.total_pay))}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* Totals */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalCell, { width: COL.name }]}>TOTALS</Text>
            <Text style={[styles.totalCell, { width: COL.dept }]} />
            <Text style={[styles.totalCell, { width: COL.rate }]} />
            <Text style={[styles.totalCell, { width: COL.service }]} />
            <Text style={[styles.totalCell, { width: COL.hours, textAlign: "right" }]}>{totals.hours.toFixed(2)}</Text>
            <Text style={[styles.totalCell, { width: COL.perfBonus, textAlign: "right" }]}>{totals.perfBonus > 0 ? fmt(totals.perfBonus) : ""}</Text>
            <Text style={[styles.totalCell, { width: COL.specBonus, textAlign: "right" }]}>{totals.specBonus > 0 ? fmt(totals.specBonus) : ""}</Text>
            <Text style={[styles.totalCell, { width: COL.total, textAlign: "right" }]}>{fmt(totals.total)}</Text>
          </View>
        </View>

        <Footer />
      </Page>

      {/* ─── PAGE 2: Holiday Payments (only if any) ─── */}
      {holidayPayments.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Header subtitle="Holiday Payments" />

          <Text style={{ fontSize: 7, color: GRAY, marginBottom: 8 }}>
            {holidayPayments.length} holiday payment{holidayPayments.length !== 1 ? "s" : ""} processed in this period — {holidayHoursTotal.toFixed(1)} hours totalling {fmt(holidayTotal)}.
          </Text>

          <View style={styles.table}>
            <View style={styles.thRow}>
              <Text style={[styles.th, { width: HCOL.name }]}>Employee</Text>
              <Text style={[styles.th, { width: HCOL.dept, textAlign: "center" }]}>Dept</Text>
              <Text style={[styles.th, { width: HCOL.date, textAlign: "center" }]}>Date Taken</Text>
              <Text style={[styles.th, { width: HCOL.hours, textAlign: "right" }]}>Hours</Text>
              <Text style={[styles.th, { width: HCOL.rate, textAlign: "right" }]}>Rate</Text>
              <Text style={[styles.th, { width: HCOL.total, textAlign: "right" }]}>Total</Text>
              <Text style={[styles.th, { width: HCOL.notes }]}>Notes</Text>
            </View>

            {holidayPayments.map((hp, idx) => {
              const emp = hp.employees;
              return (
                <View key={hp.id} style={[styles.tr, idx % 2 === 1 && styles.trAlt]} wrap={false}>
                  <Text style={[styles.tdBold, { width: HCOL.name }]}>
                    {emp ? `${emp.surname}, ${emp.forename}` : hp.employee_name}
                  </Text>
                  <Text style={[styles.td, { width: HCOL.dept, textAlign: "center" }]}>{emp?.department || "—"}</Text>
                  <Text style={[styles.td, { width: HCOL.date, textAlign: "center" }]}>
                    {hp.holiday_taken_date ? fmtDate(hp.holiday_taken_date) : "—"}
                  </Text>
                  <Text style={[styles.td, { width: HCOL.hours, textAlign: "right" }]}>{Number(hp.hours).toFixed(2)}</Text>
                  <Text style={[styles.td, { width: HCOL.rate, textAlign: "right" }]}>{fmt(Number(hp.rate))}</Text>
                  <Text style={[styles.tdBold, { width: HCOL.total, textAlign: "right", color: AMBER }]}>{fmt(Number(hp.total))}</Text>
                  <Text style={[styles.td, { width: HCOL.notes }]}>{hp.notes || "—"}</Text>
                </View>
              );
            })}

            <View style={styles.totalRow}>
              <Text style={[styles.totalCell, { width: HCOL.name }]}>TOTAL</Text>
              <Text style={[styles.totalCell, { width: HCOL.dept }]} />
              <Text style={[styles.totalCell, { width: HCOL.date }]} />
              <Text style={[styles.totalCell, { width: HCOL.hours, textAlign: "right" }]}>{holidayHoursTotal.toFixed(2)}</Text>
              <Text style={[styles.totalCell, { width: HCOL.rate }]} />
              <Text style={[styles.totalCell, { width: HCOL.total, textAlign: "right" }]}>{fmt(holidayTotal)}</Text>
              <Text style={[styles.totalCell, { width: HCOL.notes }]} />
            </View>
          </View>

          {/* Grand total reminder */}
          <View style={[styles.kpiRow, { marginTop: 12 }]}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>PAYROLL TOTAL</Text>
              <Text style={styles.kpiValue}>{fmt(totals.total)}</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: AMBER_BG, borderWidth: 0.5, borderColor: AMBER_BORDER }]}>
              <Text style={styles.kpiLabel}>HOLIDAY PAY</Text>
              <Text style={[styles.kpiValue, { color: AMBER }]}>{fmt(holidayTotal)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>GRAND TOTAL</Text>
              <Text style={styles.kpiValue}>{fmt(grandTotal)}</Text>
            </View>
          </View>

          <Footer />
        </Page>
      )}

      {/* ─── PAGE 3: New Starters & Leavers (compact table) ─── */}
      {eligibleStarters.length > 0 && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Header subtitle="Starters & Leavers" />

          <Text style={{ fontSize: 7, color: GRAY, marginBottom: 6 }}>
            {eligibleStarters.filter(s => s.status === 'starter').length} starter{eligibleStarters.filter(s => s.status === 'starter').length !== 1 ? "s" : ""} and {eligibleStarters.filter(s => s.status === 'leaver').length} leaver{eligibleStarters.filter(s => s.status === 'leaver').length !== 1 ? "s" : ""} — details for payroll processing & HMRC compliance.
          </Text>

          {/* Table header */}
          <View style={[styles.thRow, { marginBottom: 0 }]}>
            <Text style={[styles.th, { width: "14%" }]}>NAME</Text>
            <Text style={[styles.th, { width: "7%" }]}>STATUS</Text>
            <Text style={[styles.th, { width: "6%" }]}>DEPT</Text>
            <Text style={[styles.th, { width: "8%" }]}>RATE</Text>
            <Text style={[styles.th, { width: "10%" }]}>START</Text>
            <Text style={[styles.th, { width: "10%" }]}>END</Text>
            <Text style={[styles.th, { width: "10%" }]}>NI NUMBER</Text>
            <Text style={[styles.th, { width: "9%" }]}>SORT CODE</Text>
            <Text style={[styles.th, { width: "10%" }]}>ACCOUNT</Text>
            <Text style={[styles.th, { width: "6%" }]}>RTW</Text>
            <Text style={[styles.th, { width: "10%" }]}>NOTES</Text>
          </View>

          {eligibleStarters.map((starter, idx) => {
            const rtw = getRTWStatus(starter);
            const hasNI = !!starter.ni_number;
            const isLeaver = starter.status === 'leaver';
            const rowStyle = isLeaver ? styles.starterRowLeaver : styles.starterRowStarter;
            const notesParts: string[] = [];
            if (!hasNI && starter.passport_no) notesParts.push(`PP: ${starter.passport_no}`);
            if (!hasNI && !starter.passport_no) notesParts.push("No NI/PP");
            if (!starter.sort_code || !starter.bank_account_no) notesParts.push("Bank missing");

            return (
              <View key={starter.id} style={[styles.starterRow, rowStyle, idx % 2 === 1 ? { backgroundColor: "#fffdf0" } : {}]} wrap={false}>
                <Text style={[styles.tdBold, { width: "14%" }]}>{starter.forename} {starter.surname}</Text>
                <View style={{ width: "7%", flexDirection: "row" }}>
                  <View style={[styles.statusBadgeSm, { backgroundColor: isLeaver ? '#fed7d7' : '#fefcbf' }]}>
                    <Text style={{ fontSize: 5.5, fontFamily: "Helvetica-Bold", color: isLeaver ? RED : AMBER }}>
                      {isLeaver ? 'LEAVER' : 'STARTER'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.td, { width: "6%" }]}>{starter.department}</Text>
                <Text style={[styles.td, { width: "8%" }]}>{fmt(starter.hourly_rate)}</Text>
                <Text style={[styles.td, { width: "10%" }]}>{starter.start_date ? fmtDate(starter.start_date) : "—"}</Text>
                <Text style={[styles.td, { width: "10%", color: isLeaver && starter.end_date ? RED : DARK }]}>
                  {isLeaver ? (starter.end_date ? fmtDate(starter.end_date) : "Not set") : "—"}
                </Text>
                <Text style={[hasNI ? styles.td : styles.missingValue, { width: "10%" }]}>
                  {starter.ni_number || "Missing"}
                </Text>
                <Text style={[starter.sort_code ? styles.td : styles.missingValue, { width: "9%" }]}>
                  {starter.sort_code || "Missing"}
                </Text>
                <Text style={[starter.bank_account_no ? styles.td : styles.missingValue, { width: "10%" }]}>
                  {starter.bank_account_no || "Missing"}
                </Text>
                <View style={{ width: "6%", flexDirection: "row" }}>
                  <View style={[styles.statusBadgeSm, {
                    backgroundColor: rtw.status === "ok" ? "#c6f6d5" : rtw.status === "pending" ? AMBER_BG : "#fed7d7",
                  }]}>
                    <Text style={{ fontSize: 5, fontFamily: "Helvetica-Bold", color: rtw.status === "ok" ? "#276749" : rtw.status === "pending" ? AMBER : RED }}>
                      {rtw.status === "ok" ? "OK" : rtw.status === "pending" ? "PEND" : "MISS"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.td, { width: "10%", fontSize: 5.5, color: notesParts.length > 0 ? RED : GRAY }]}>
                  {notesParts.length > 0 ? notesParts.join("; ") : "✓"}
                </Text>
              </View>
            );
          })}

          <Footer />
        </Page>
      )}
    </Document>
  );
}
