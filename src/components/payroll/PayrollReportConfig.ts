export interface PayrollReportConfig {
  // Sort & Group
  sortBy: "alphabetical" | "location" | "department" | "role" | "hourly_rate" | "custom";
  groupBy: "none" | "location" | "department" | "role";

  // Columns to include
  columns: {
    employeeName: boolean;
    department: boolean;
    location: boolean;
    hourlyRate: boolean;
    hoursWorked: boolean;
    holidayHours: boolean;
    bonuses: boolean;
    serviceCharge: boolean;
    timesheetHours: boolean;
    adjustments: boolean;
    totalPay: boolean;
    notes: boolean;
  };

  // Financial display
  financial: {
    includeBonuses: boolean;
    includeServiceCharge: boolean;
    includeAdjustments: boolean;
    showGrossTotals: boolean;
    showSummaryTotals: boolean;
    hideFinancialAmounts: boolean;
  };

  // Scope
  employeeScope: "all" | "department" | "location" | "custom";
  selectedDepartments: string[];
  selectedEmployeeIds: string[];

  // Layout
  layoutStyle: "full" | "condensed" | "accounting" | "hr_review";
  orientation: "landscape" | "portrait";
  showLogo: boolean;
  showNotes: boolean;
  showAuditFooter: boolean;
}

export const defaultReportConfig: PayrollReportConfig = {
  sortBy: "alphabetical",
  groupBy: "none",
  columns: {
    employeeName: true,
    department: true,
    location: false,
    hourlyRate: true,
    hoursWorked: true,
    holidayHours: true,
    bonuses: true,
    serviceCharge: true,
    timesheetHours: true,
    adjustments: true,
    totalPay: true,
    notes: false,
  },
  financial: {
    includeBonuses: true,
    includeServiceCharge: true,
    includeAdjustments: true,
    showGrossTotals: true,
    showSummaryTotals: true,
    hideFinancialAmounts: false,
  },
  employeeScope: "all",
  selectedDepartments: [],
  selectedEmployeeIds: [],
  layoutStyle: "full",
  orientation: "landscape",
  showLogo: true,
  showNotes: true,
  showAuditFooter: true,
};

export const REPORT_PRESETS: Record<string, { label: string; description: string; config: Partial<PayrollReportConfig> }> = {
  full: {
    label: "Full Payroll Report",
    description: "Complete report with all details",
    config: defaultReportConfig,
  },
  condensed: {
    label: "Condensed Summary",
    description: "Names, hours, and totals only",
    config: {
      layoutStyle: "condensed",
      columns: {
        employeeName: true,
        department: true,
        location: false,
        hourlyRate: true,
        hoursWorked: true,
        holidayHours: false,
        bonuses: false,
        serviceCharge: false,
        timesheetHours: false,
        adjustments: false,
        totalPay: true,
        notes: false,
      },
    },
  },
  accounting: {
    label: "Accounting Report",
    description: "Financial focus with all monetary columns",
    config: {
      layoutStyle: "accounting",
      orientation: "landscape",
      columns: {
        employeeName: true,
        department: true,
        location: false,
        hourlyRate: true,
        hoursWorked: true,
        holidayHours: true,
        bonuses: true,
        serviceCharge: true,
        timesheetHours: true,
        adjustments: true,
        totalPay: true,
        notes: false,
      },
    },
  },
  hr_review: {
    label: "HR Review",
    description: "Employee overview without financial amounts",
    config: {
      layoutStyle: "hr_review",
      financial: {
        includeBonuses: false,
        includeServiceCharge: false,
        includeAdjustments: false,
        showGrossTotals: false,
        showSummaryTotals: false,
        hideFinancialAmounts: true,
      },
    },
  },
};
