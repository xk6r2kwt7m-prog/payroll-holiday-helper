import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
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
    padding: 40,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
    color: DARK,
    backgroundColor: "#fff",
  },
  coverPage: {
    padding: 50,
    fontFamily: "Helvetica",
    color: DARK,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  coverBrand: {
    fontSize: 11,
    letterSpacing: 4,
    color: TEAL,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  coverTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    color: DARK,
  },
  coverSubtitle: {
    fontSize: 12,
    color: GRAY,
    marginBottom: 24,
  },
  coverLine: {
    width: 60,
    height: 2,
    backgroundColor: TEAL,
    marginBottom: 30,
  },
  coverField: {
    fontSize: 11,
    marginBottom: 4,
    textAlign: "center",
  },
  coverLabel: {
    fontSize: 8,
    color: GRAY,
    letterSpacing: 1.5,
    marginBottom: 2,
    marginTop: 12,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: TEAL,
    paddingBottom: 8,
    marginBottom: 16,
  },
  pageHeaderBrand: {
    fontSize: 7,
    color: TEAL,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  pageHeaderText: {
    fontSize: 7,
    color: GRAY,
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 5,
    fontSize: 6.5,
    color: GRAY,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 8,
    color: TEAL,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  summaryCard: {
    backgroundColor: LIGHT_TEAL,
    borderRadius: 4,
    padding: 10,
    width: "23%",
  },
  summaryLabel: {
    fontSize: 7,
    color: GRAY,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  summarySubtext: {
    fontSize: 7,
    color: GRAY,
    marginTop: 2,
  },
  table: {
    marginTop: 4,
    marginBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: TEAL,
    borderRadius: 2,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: LIGHT_BG,
  },
  tableCell: {
    fontSize: 8,
    color: DARK,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: TEAL,
    borderRadius: 2,
    marginTop: 2,
  },
  totalCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },
  deptSection: {
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 10,
  },
  deptTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },
  deptStat: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  deptStatLabel: {
    fontSize: 7.5,
    color: GRAY,
  },
  deptStatValue: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  statusBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  correctionNote: {
    backgroundColor: "#fff5f5",
    borderWidth: 0.5,
    borderColor: "#e53e3e",
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  correctionText: {
    fontSize: 7.5,
    color: "#e53e3e",
    fontFamily: "Helvetica-Bold",
  },
  // Starter card styles
  starterCard: {
    borderWidth: 0.5,
    borderColor: AMBER_BORDER,
    backgroundColor: AMBER_BG,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  starterName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },
  starterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  starterField: {
    width: "48%",
    marginBottom: 4,
  },
  starterFieldLabel: {
    fontSize: 6.5,
    color: GRAY,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  starterFieldValue: {
    fontSize: 8,
    color: DARK,
  },
  missingValue: {
    fontSize: 8,
    color: RED,
    fontFamily: "Helvetica-Bold",
  },
  alertBox: {
    backgroundColor: "#fff5f5",
    borderWidth: 0.5,
    borderColor: "#feb2b2",
    borderRadius: 3,
    padding: 6,
    marginTop: 4,
  },
  alertText: {
    fontSize: 7,
    color: RED,
  },
  noteBox: {
    backgroundColor: LIGHT_BG,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 6,
    marginTop: 4,
  },
  noteText: {
    fontSize: 7,
    color: GRAY,
    fontStyle: "italic",
  },
});

// Column widths for main payroll table
const COL = {
  name: "22%",
  dept: "8%",
  rate: "9%",
  service: "9%",
  hours: "9%",
  perfBonus: "10%",
  specBonus: "10%",
  holiday: "10%",
  total: "13%",
};

// Column widths for holiday payments table
const HCOL = {
  name: "25%",
  date: "15%",
  hours: "12%",
  rate: "12%",
  total: "14%",
  notes: "22%",
};

interface PayrollEntry {
  id: string;
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
    ni_number: string | null;
  } | null;
}

interface HolidayPayment {
  id: string;
  employee_name: string;
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
}

function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PayrollPDF({
  period,
  entries,
  holidayPayments = [],
  starters = [],
  companyName = "UD Restaurants Ltd",
  isCorrection = false,
  correctionNote,
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

  const departments = ["FOH", "BOH", "CPU"];
  const deptStats = departments.map((dept) => {
    const deptEntries = entries.filter((e) => e.employees?.department === dept);
    return {
      name: dept,
      count: deptEntries.length,
      hours: deptEntries.reduce((s, e) => s + Number(e.timesheet_hours), 0),
      total: deptEntries.reduce((s, e) => s + Number(e.total_pay), 0),
    };
  }).filter((d) => d.count > 0);

  const avgHourlyRate = entries.length > 0
    ? entries.reduce((s, e) => s + Number(e.hourly_rate), 0) / entries.length
    : 0;

  const laborPercent = period.sales_total && Number(period.sales_total) > 0
    ? (totals.total / Number(period.sales_total)) * 100
    : null;

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: "#e2e8f0", text: "#4a5568" },
    pending: { bg: "#fefcbf", text: "#975a16" },
    approved: { bg: "#c6f6d5", text: "#276749" },
    rejected: { bg: "#fed7d7", text: "#9b2c2c" },
  };
  const statusStyle = statusColors[period.status] || statusColors.draft;

  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const PageHeader = () => (
    <View style={styles.pageHeader}>
      <Text style={styles.pageHeaderBrand}>{companyName.toUpperCase()}</Text>
      <Text style={styles.pageHeaderText}>
        Payroll Report — {period.period_name}
        {isCorrection ? " (CORRECTED)" : ""}
      </Text>
    </View>
  );

  const PageFooter = () => (
    <View style={styles.footer} fixed>
      <Text>{companyName} — Confidential</Text>
      <Text>Generated: {generatedAt}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );

  // Helper: determine if a starter has right to work issues
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

  return (
    <Document>
      {/* ─── COVER PAGE ─── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ marginTop: 140, alignItems: "center" }}>
          <Text style={styles.coverBrand}>{companyName.toUpperCase()}</Text>
          <Text style={styles.coverTitle}>Payroll Report</Text>
          <Text style={styles.coverSubtitle}>{period.period_name}</Text>
          <View style={styles.coverLine} />

          {isCorrection && (
            <View style={[styles.statusBadge, { backgroundColor: "#fed7d7", marginBottom: 16 }]}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: RED }}>
                CORRECTED VERSION
              </Text>
            </View>
          )}

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, marginBottom: 20 }]}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: statusStyle.text }}>
              {period.status.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.coverLabel}>PERIOD</Text>
          <Text style={styles.coverField}>
            {formatDate(period.start_date)} — {formatDate(period.end_date)}
          </Text>

          {period.pay_date && (
            <>
              <Text style={styles.coverLabel}>PAY DATE</Text>
              <Text style={styles.coverField}>{formatDate(period.pay_date)}</Text>
            </>
          )}

          <Text style={styles.coverLabel}>EMPLOYEES</Text>
          <Text style={styles.coverField}>{entries.length}</Text>

          {starters.length > 0 && (
            <>
              <Text style={styles.coverLabel}>NEW STARTERS</Text>
              <Text style={styles.coverField}>{starters.length}</Text>
            </>
          )}

          <Text style={styles.coverLabel}>TOTAL PAYROLL</Text>
          <Text style={{ ...styles.coverField, fontSize: 16, fontFamily: "Helvetica-Bold" }}>
            {formatCurrency(totals.total)}
          </Text>

          {holidayPayments.length > 0 && (
            <>
              <Text style={styles.coverLabel}>HOLIDAY PAY</Text>
              <Text style={styles.coverField}>{formatCurrency(holidayTotal)}</Text>
            </>
          )}

          {/* Contents listing */}
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <Text style={{ ...styles.coverLabel, marginTop: 0 }}>CONTENTS</Text>
            <Text style={{ fontSize: 8, color: GRAY, marginTop: 4 }}>1. Period Summary & Department Breakdown</Text>
            <Text style={{ fontSize: 8, color: GRAY }}>2. Employee Payroll Detail</Text>
            {holidayPayments.length > 0 && (
              <Text style={{ fontSize: 8, color: GRAY }}>3. Holiday Payments</Text>
            )}
            {starters.length > 0 && (
              <Text style={{ fontSize: 8, color: GRAY }}>
                {holidayPayments.length > 0 ? "4" : "3"}. New Starter Details
              </Text>
            )}
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ─── SUMMARY PAGE ─── */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        {isCorrection && correctionNote && (
          <View style={styles.correctionNote}>
            <Text style={styles.correctionText}>CORRECTION: {correctionNote}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Period Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL PAYROLL</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totals.total)}</Text>
            <Text style={styles.summarySubtext}>{entries.length} employees</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL HOURS</Text>
            <Text style={styles.summaryValue}>{totals.hours.toFixed(1)}</Text>
            <Text style={styles.summarySubtext}>
              {period.period_weeks ? `${(totals.hours / Number(period.period_weeks)).toFixed(1)} hrs/wk` : ""}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>AVG. HOURLY RATE</Text>
            <Text style={styles.summaryValue}>{formatCurrency(avgHourlyRate)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>LABOUR %</Text>
            <Text style={styles.summaryValue}>
              {laborPercent !== null ? `${laborPercent.toFixed(1)}%` : "N/A"}
            </Text>
            {period.sales_total && Number(period.sales_total) > 0 && (
              <Text style={styles.summarySubtext}>of {formatCurrency(Number(period.sales_total))} sales</Text>
            )}
          </View>
        </View>

        {/* Holiday Pay Summary Card (if any) */}
        {holidayPayments.length > 0 && (
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { backgroundColor: AMBER_BG, borderWidth: 0.5, borderColor: AMBER_BORDER }]}>
              <Text style={styles.summaryLabel}>HOLIDAY PAY TOTAL</Text>
              <Text style={[styles.summaryValue, { color: AMBER }]}>{formatCurrency(holidayTotal)}</Text>
              <Text style={styles.summarySubtext}>{holidayPayments.length} payments • {holidayHoursTotal.toFixed(1)} hrs</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: AMBER_BG, borderWidth: 0.5, borderColor: AMBER_BORDER }]}>
              <Text style={styles.summaryLabel}>GRAND TOTAL (INC. HOLIDAY)</Text>
              <Text style={[styles.summaryValue, { color: AMBER }]}>{formatCurrency(totals.total + holidayTotal)}</Text>
              <Text style={styles.summarySubtext}>Payroll + Holiday Pay</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Department Breakdown</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {deptStats.map((dept) => (
            <View key={dept.name} style={[styles.deptSection, { flex: 1 }]}>
              <Text style={styles.deptTitle}>{dept.name}</Text>
              <View style={styles.deptStat}>
                <Text style={styles.deptStatLabel}>Employees</Text>
                <Text style={styles.deptStatValue}>{dept.count}</Text>
              </View>
              <View style={styles.deptStat}>
                <Text style={styles.deptStatLabel}>Hours</Text>
                <Text style={styles.deptStatValue}>{dept.hours.toFixed(1)}</Text>
              </View>
              <View style={styles.deptStat}>
                <Text style={styles.deptStatLabel}>Total Pay</Text>
                <Text style={styles.deptStatValue}>{formatCurrency(dept.total)}</Text>
              </View>
              <View style={styles.deptStat}>
                <Text style={styles.deptStatLabel}>% of Payroll</Text>
                <Text style={styles.deptStatValue}>
                  {totals.total > 0 ? `${((dept.total / totals.total) * 100).toFixed(1)}%` : "0%"}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Cost Breakdown</Text>
        <View style={styles.deptSection}>
          <View style={styles.deptStat}>
            <Text style={styles.deptStatLabel}>Base Pay (hours x rate)</Text>
            <Text style={styles.deptStatValue}>{formatCurrency(totals.basePay)}</Text>
          </View>
          <View style={styles.deptStat}>
            <Text style={styles.deptStatLabel}>Service Charge</Text>
            <Text style={styles.deptStatValue}>{formatCurrency(totals.servicePay)}</Text>
          </View>
          <View style={styles.deptStat}>
            <Text style={styles.deptStatLabel}>Performance Bonuses</Text>
            <Text style={styles.deptStatValue}>{formatCurrency(totals.perfBonus)}</Text>
          </View>
          <View style={styles.deptStat}>
            <Text style={styles.deptStatLabel}>Special Bonuses</Text>
            <Text style={styles.deptStatValue}>{formatCurrency(totals.specBonus)}</Text>
          </View>
          {holidayPayments.length > 0 && (
            <View style={styles.deptStat}>
              <Text style={styles.deptStatLabel}>Holiday Pay</Text>
              <Text style={[styles.deptStatValue, { color: AMBER }]}>{formatCurrency(holidayTotal)}</Text>
            </View>
          )}
          <View style={[styles.deptStat, { marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: BORDER }]}>
            <Text style={{ ...styles.deptStatLabel, fontFamily: "Helvetica-Bold", color: DARK }}>Grand Total</Text>
            <Text style={{ ...styles.deptStatValue, fontSize: 10 }}>
              {formatCurrency(totals.total + holidayTotal)}
            </Text>
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* ─── EMPLOYEE DETAIL TABLE ─── */}
      <Page size="A4" style={styles.page} orientation="landscape">
        <PageHeader />
        <Text style={styles.sectionTitle}>Employee Payroll Detail</Text>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: COL.name }]}>Employee</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.dept, textAlign: "center" }]}>Dept</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.rate, textAlign: "right" }]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.service, textAlign: "right" }]}>Service</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.hours, textAlign: "right" }]}>Hours</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.perfBonus, textAlign: "right" }]}>Perf Bonus</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.specBonus, textAlign: "right" }]}>Spec Bonus</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.holiday, textAlign: "right" }]}>Hol. Accrued</Text>
            <Text style={[styles.tableHeaderCell, { width: COL.total, textAlign: "right" }]}>Total Pay</Text>
          </View>

          {/* Group by department */}
          {departments.map((dept) => {
            const deptEntries = sortedEntries.filter((e) => e.employees?.department === dept);
            if (deptEntries.length === 0) return null;

            const deptTotal = deptEntries.reduce((s, e) => s + Number(e.total_pay), 0);
            const deptHours = deptEntries.reduce((s, e) => s + Number(e.timesheet_hours), 0);

            return (
              <View key={dept}>
                {/* Department header */}
                <View style={{ flexDirection: "row", backgroundColor: LIGHT_TEAL, paddingVertical: 3, paddingHorizontal: 4, marginTop: 4 }}>
                  <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: TEAL }}>
                    {dept} — {deptEntries.length} employees • {deptHours.toFixed(1)} hrs • {formatCurrency(deptTotal)}
                  </Text>
                </View>

                {deptEntries.map((entry, idx) => {
                  const emp = entry.employees;
                  return (
                    <View key={entry.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]} wrap={false}>
                      <View style={{ width: COL.name }}>
                        <Text style={styles.tableCellBold}>
                          {emp?.surname}, {emp?.forename}
                        </Text>
                        {entry.notes && (
                          <Text style={{ fontSize: 6, color: GRAY, marginTop: 1 }}>
                            {entry.notes.length > 60 ? entry.notes.substring(0, 60) + "..." : entry.notes}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.tableCell, { width: COL.dept, textAlign: "center" }]}>
                        {emp?.department}
                      </Text>
                      <Text style={[styles.tableCell, { width: COL.rate, textAlign: "right" }]}>
                        {formatCurrency(entry.hourly_rate)}
                      </Text>
                      <Text style={[styles.tableCell, { width: COL.service, textAlign: "right" }]}>
                        {formatCurrency(Number(entry.service_charge || 0))}
                      </Text>
                      <Text style={[styles.tableCell, { width: COL.hours, textAlign: "right" }]}>
                        {Number(entry.timesheet_hours).toFixed(2)}
                      </Text>
                      <Text style={[styles.tableCell, { width: COL.perfBonus, textAlign: "right" }]}>
                        {formatCurrency(Number(entry.performance_bonus || 0))}
                      </Text>
                      <Text style={[styles.tableCell, { width: COL.specBonus, textAlign: "right" }]}>
                        {formatCurrency(Number(entry.special_bonus || 0))}
                      </Text>
                      <Text style={[styles.tableCell, { width: COL.holiday, textAlign: "right" }]}>
                        {Number(entry.holiday_accrued_hours || 0).toFixed(2)} hrs
                      </Text>
                      <Text style={[styles.tableCellBold, { width: COL.total, textAlign: "right" }]}>
                        {formatCurrency(entry.total_pay)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* Totals row */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalCell, { width: COL.name }]}>TOTALS</Text>
            <Text style={[styles.totalCell, { width: COL.dept }]} />
            <Text style={[styles.totalCell, { width: COL.rate }]} />
            <Text style={[styles.totalCell, { width: COL.service }]} />
            <Text style={[styles.totalCell, { width: COL.hours, textAlign: "right" }]}>
              {totals.hours.toFixed(2)}
            </Text>
            <Text style={[styles.totalCell, { width: COL.perfBonus, textAlign: "right" }]}>
              {formatCurrency(totals.perfBonus)}
            </Text>
            <Text style={[styles.totalCell, { width: COL.specBonus, textAlign: "right" }]}>
              {formatCurrency(totals.specBonus)}
            </Text>
            <Text style={[styles.totalCell, { width: COL.holiday, textAlign: "right" }]}>
              {totals.holiday.toFixed(2)} hrs
            </Text>
            <Text style={[styles.totalCell, { width: COL.total, textAlign: "right" }]}>
              {formatCurrency(totals.total)}
            </Text>
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* ─── HOLIDAY PAYMENTS PAGE (dynamic, only if payments exist) ─── */}
      {holidayPayments.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PageHeader />
          <Text style={styles.sectionTitle}>Holiday Payments — {period.period_name}</Text>
          <Text style={{ fontSize: 7.5, color: GRAY, marginBottom: 10 }}>
            Holiday pay recorded against this payroll period. {holidayPayments.length} payment{holidayPayments.length !== 1 ? "s" : ""} totalling {formatCurrency(holidayTotal)} for {holidayHoursTotal.toFixed(1)} hours.
          </Text>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: HCOL.name }]}>Employee</Text>
              <Text style={[styles.tableHeaderCell, { width: HCOL.date, textAlign: "center" }]}>Holiday Date</Text>
              <Text style={[styles.tableHeaderCell, { width: HCOL.hours, textAlign: "right" }]}>Hours</Text>
              <Text style={[styles.tableHeaderCell, { width: HCOL.rate, textAlign: "right" }]}>Rate</Text>
              <Text style={[styles.tableHeaderCell, { width: HCOL.total, textAlign: "right" }]}>Total</Text>
              <Text style={[styles.tableHeaderCell, { width: HCOL.notes }]}>Notes</Text>
            </View>

            {holidayPayments.map((payment, idx) => (
              <View key={payment.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]} wrap={false}>
                <Text style={[styles.tableCellBold, { width: HCOL.name }]}>
                  {payment.employees
                    ? `${payment.employees.surname}, ${payment.employees.forename}`
                    : payment.employee_name}
                </Text>
                <Text style={[styles.tableCell, { width: HCOL.date, textAlign: "center" }]}>
                  {payment.holiday_taken_date ? formatDate(payment.holiday_taken_date) : "—"}
                </Text>
                <Text style={[styles.tableCell, { width: HCOL.hours, textAlign: "right" }]}>
                  {Number(payment.hours).toFixed(2)}
                </Text>
                <Text style={[styles.tableCell, { width: HCOL.rate, textAlign: "right" }]}>
                  {formatCurrency(Number(payment.rate))}
                </Text>
                <Text style={[styles.tableCellBold, { width: HCOL.total, textAlign: "right" }]}>
                  {formatCurrency(Number(payment.total))}
                </Text>
                <Text style={[styles.tableCell, { width: HCOL.notes }]}>
                  {payment.notes || "—"}
                </Text>
              </View>
            ))}

            {/* Holiday totals row */}
            <View style={styles.totalRow}>
              <Text style={[styles.totalCell, { width: HCOL.name }]}>TOTAL HOLIDAY PAY</Text>
              <Text style={[styles.totalCell, { width: HCOL.date }]} />
              <Text style={[styles.totalCell, { width: HCOL.hours, textAlign: "right" }]}>
                {holidayHoursTotal.toFixed(2)}
              </Text>
              <Text style={[styles.totalCell, { width: HCOL.rate }]} />
              <Text style={[styles.totalCell, { width: HCOL.total, textAlign: "right" }]}>
                {formatCurrency(holidayTotal)}
              </Text>
              <Text style={[styles.totalCell, { width: HCOL.notes }]} />
            </View>
          </View>

          <PageFooter />
        </Page>
      )}

      {/* ─── NEW STARTERS PAGE (dynamic, only if starters exist) ─── */}
      {starters.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PageHeader />
          <Text style={styles.sectionTitle}>New Starter Details</Text>
          <Text style={{ fontSize: 7.5, color: GRAY, marginBottom: 10 }}>
            {starters.length} new starter{starters.length !== 1 ? "s" : ""} included in this payroll period.
            Details below are for payroll processing and HMRC compliance.
          </Text>

          {starters.map((starter) => {
            const rtwStatus = getRTWStatus(starter);
            const hasNI = !!starter.ni_number;

            return (
              <View key={starter.id} style={styles.starterCard} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={styles.starterName}>
                    {starter.forename} {starter.surname}
                  </Text>
                  <View style={[styles.statusBadge, {
                    backgroundColor: rtwStatus.status === "ok" ? "#c6f6d5" : rtwStatus.status === "pending" ? AMBER_BG : "#fed7d7",
                  }]}>
                    <Text style={{
                      fontSize: 6.5,
                      fontFamily: "Helvetica-Bold",
                      color: rtwStatus.status === "ok" ? "#276749" : rtwStatus.status === "pending" ? AMBER : RED,
                    }}>
                      {rtwStatus.status === "ok" ? "RTW OK" : rtwStatus.status === "pending" ? "RTW PENDING" : "RTW MISSING"}
                    </Text>
                  </View>
                </View>

                <View style={styles.starterGrid}>
                  <View style={styles.starterField}>
                    <Text style={styles.starterFieldLabel}>DEPARTMENT</Text>
                    <Text style={styles.starterFieldValue}>{starter.department}</Text>
                  </View>
                  <View style={styles.starterField}>
                    <Text style={styles.starterFieldLabel}>HOURLY RATE</Text>
                    <Text style={styles.starterFieldValue}>{formatCurrency(starter.hourly_rate)}</Text>
                  </View>
                  <View style={styles.starterField}>
                    <Text style={styles.starterFieldLabel}>START DATE</Text>
                    <Text style={styles.starterFieldValue}>
                      {starter.start_date ? formatDate(starter.start_date) : "Not set"}
                    </Text>
                  </View>
                  <View style={styles.starterField}>
                    <Text style={styles.starterFieldLabel}>NI NUMBER</Text>
                    {hasNI ? (
                      <Text style={styles.starterFieldValue}>{starter.ni_number}</Text>
                    ) : (
                      <Text style={styles.missingValue}>Not provided — see below</Text>
                    )}
                  </View>
                </View>

                {/* Banking Details */}
                <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: BORDER }}>
                  <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 4 }}>Banking Details</Text>
                  <View style={styles.starterGrid}>
                    <View style={styles.starterField}>
                      <Text style={styles.starterFieldLabel}>SORT CODE</Text>
                      <Text style={starter.sort_code ? styles.starterFieldValue : styles.missingValue}>
                        {starter.sort_code || "Missing"}
                      </Text>
                    </View>
                    <View style={styles.starterField}>
                      <Text style={styles.starterFieldLabel}>ACCOUNT NUMBER</Text>
                      <Text style={starter.bank_account_no ? styles.starterFieldValue : styles.missingValue}>
                        {starter.bank_account_no || "Missing"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right to Work Section */}
                <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: BORDER }}>
                  <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 4 }}>
                    Right to Work in the UK
                  </Text>
                  <View style={styles.starterGrid}>
                    <View style={styles.starterField}>
                      <Text style={styles.starterFieldLabel}>NATIONALITY</Text>
                      <Text style={starter.nationality ? styles.starterFieldValue : styles.missingValue}>
                        {starter.nationality || "Not recorded"}
                      </Text>
                    </View>
                    <View style={styles.starterField}>
                      <Text style={styles.starterFieldLabel}>PASSPORT NUMBER</Text>
                      <Text style={starter.passport_no ? styles.starterFieldValue : styles.missingValue}>
                        {starter.passport_no || "Not on file"}
                      </Text>
                    </View>
                    <View style={styles.starterField}>
                      <Text style={styles.starterFieldLabel}>SETTLEMENT STATUS</Text>
                      <Text style={starter.settlement_status ? styles.starterFieldValue : styles.missingValue}>
                        {starter.settlement_status || "Not recorded"}
                      </Text>
                    </View>
                    <View style={styles.starterField}>
                      <Text style={styles.starterFieldLabel}>SHARE CODE</Text>
                      <Text style={starter.sharing_code ? styles.starterFieldValue : styles.missingValue}>
                        {starter.sharing_code || "Not provided"}
                      </Text>
                    </View>
                    {starter.residence_permit && (
                      <View style={styles.starterField}>
                        <Text style={styles.starterFieldLabel}>RESIDENCE PERMIT</Text>
                        <Text style={styles.starterFieldValue}>{starter.residence_permit}</Text>
                      </View>
                    )}
                  </View>

                  {/* RTW Status note */}
                  <View style={rtwStatus.status === "ok" ? styles.noteBox : styles.alertBox}>
                    <Text style={rtwStatus.status === "ok" ? styles.noteText : styles.alertText}>
                      {rtwStatus.label}
                    </Text>
                  </View>

                  {/* Missing NI explanation */}
                  {!hasNI && (
                    <View style={[styles.alertBox, { marginTop: 4 }]}>
                      <Text style={styles.alertText}>
                        No National Insurance number on file.
                        {starter.passport_no
                          ? ` Passport (${starter.passport_no}) and nationality (${starter.nationality || "unknown"}) recorded as interim identification.`
                          : " Passport number and nationality must be provided to HMRC until NI number is obtained."}
                        {" "}Employee should apply for NI via gov.uk or call HMRC on 0300 200 3500.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Notes */}
                {starter.notes && (
                  <View style={[styles.noteBox, { marginTop: 6 }]}>
                    <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 2 }}>ADMIN NOTES</Text>
                    <Text style={styles.noteText}>{starter.notes}</Text>
                  </View>
                )}
              </View>
            );
          })}

          <PageFooter />
        </Page>
      )}
    </Document>
  );
}
