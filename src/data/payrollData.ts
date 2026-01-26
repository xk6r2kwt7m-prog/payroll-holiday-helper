// Types based on actual Ugly Dumpling payroll structure
export type Department = "FOH" | "BOH" | "CPU";
export type EmployeeStatus = "active" | "leaver" | "starter";

export interface Employee {
  id: string;
  forename: string;
  surname: string;
  department: Department;
  status: EmployeeStatus;
  hourlyRate: number;
  serviceCharge: number;
  // UK Holiday Entitlement tracking
  holidayAccrued: number; // Hours accrued based on 12.07% rule
  holidayTaken: number; // Hours taken
  holidayPaid: number; // Holiday pay received this period
  notes?: string;
}

export interface PayrollEntry {
  employeeId: string;
  forename: string;
  surname: string;
  department: Department;
  status: EmployeeStatus;
  hourlyRate: number;
  serviceCharge: number;
  performanceBonus: number;
  specialBonus: number;
  timesheetHours: number;
  totalPay: number;
  // Holiday accrual for this period (12.07% of hours worked)
  holidayAccruedThisPeriod: number;
  notes?: string;
}

export interface HolidayPayment {
  id: string;
  employeeForename: string;
  employeeSurname?: string;
  rate: number;
  units: number; // hours
  total: number;
  status?: string;
}

export interface PayrollSummary {
  period: string;
  payDate: string;
  timesheet: number;
  incentives: number;
  holidays: number;
  totalPayroll: number;
}

export interface StarterEmployee {
  name: string;
  niNo: string;
  bankAccountNo: string;
  sortCode: string;
  nationality?: string;
  passportNo?: string;
  settlementStatus?: string;
  sharingCode?: string;
  residencePermit?: string;
}

// UK Holiday Law Constants (Working Time Regulations 1998, updated 2024)
export const UK_HOLIDAY_LAW = {
  // Statutory minimum: 5.6 weeks per year
  STATUTORY_WEEKS: 5.6,
  // Maximum days capped at 28 for 5+ day workers
  MAX_STATUTORY_DAYS: 28,
  // Accrual rate for irregular/part-year workers: 12.07%
  ACCRUAL_RATE: 0.1207,
  // Normal leave (4 weeks) vs basic leave (1.6 weeks)
  NORMAL_LEAVE_WEEKS: 4,
  BASIC_LEAVE_WEEKS: 1.6,
  // Carryover limits
  MAX_CARRYOVER_AGREED: 8, // days if agreed
  MAX_CARRYOVER_FAMILY_LEAVE: 28, // days for maternity/family leave
  MAX_CARRYOVER_SICKNESS: 20, // days for long-term sickness
};

// Calculate holiday accrual based on UK law (12.07% of hours worked)
export const calculateHolidayAccrual = (hoursWorked: number): number => {
  return hoursWorked * UK_HOLIDAY_LAW.ACCRUAL_RATE;
};

// Calculate rolled-up holiday pay (12.07% uplift on hourly rate)
export const calculateRolledUpHolidayPay = (hourlyRate: number, hoursWorked: number): number => {
  return hourlyRate * hoursWorked * UK_HOLIDAY_LAW.ACCRUAL_RATE;
};

// Actual data from January 2026 payroll
export const payrollSummary: PayrollSummary = {
  period: "15th Dec - 25th Jan 2026",
  payDate: "Jan 25, 2026",
  timesheet: 73482.87,
  incentives: 1440.00,
  holidays: 6920.34,
  totalPayroll: 81843.21,
};

// Starter employee from the file
export const starterEmployees: StarterEmployee[] = [
  {
    name: "Karl Ted Ledesma",
    niNo: "RY839100A",
    bankAccountNo: "62739222",
    sortCode: "230120",
  },
];

// Helper to calculate holiday accrual for each employee
const withHolidayAccrual = (emp: Omit<PayrollEntry, 'holidayAccruedThisPeriod'>): PayrollEntry => ({
  ...emp,
  holidayAccruedThisPeriod: calculateHolidayAccrual(emp.timesheetHours),
});

export const employees: PayrollEntry[] = [
  // FOH Department (Front of House)
  withHolidayAccrual({ employeeId: "1", forename: "Lissette", surname: "Paredes", department: "FOH", status: "active", hourlyRate: 12.21, serviceCharge: 4.00, performanceBonus: 150.00, specialBonus: 0, timesheetHours: 196.98, totalPay: 3343.05 }),
  withHolidayAccrual({ employeeId: "2", forename: "Afonso", surname: "Gomes", department: "FOH", status: "active", hourlyRate: 11.00, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 145.99, totalPay: 1751.88 }),
  withHolidayAccrual({ employeeId: "3", forename: "Kazumi", surname: "Ortega", department: "FOH", status: "active", hourlyRate: 12.21, serviceCharge: 1.00, performanceBonus: 50.00, specialBonus: 0, timesheetHours: 117.75, totalPay: 1605.48 }),
  withHolidayAccrual({ employeeId: "4", forename: "Marco", surname: "Ribeiro", department: "FOH", status: "active", hourlyRate: 13.00, serviceCharge: 2.50, performanceBonus: 120.00, specialBonus: 0, timesheetHours: 247.35, totalPay: 3953.92 }),
  withHolidayAccrual({ employeeId: "5", forename: "Rubem", surname: "Pereira", department: "FOH", status: "active", hourlyRate: 13.00, serviceCharge: 2.00, performanceBonus: 120.00, specialBonus: 0, timesheetHours: 234.68, totalPay: 3640.20 }),
  withHolidayAccrual({ employeeId: "6", forename: "Daniela Patricia", surname: "Da Costa Almeida", department: "FOH", status: "active", hourlyRate: 11.00, serviceCharge: 1.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 163.59, totalPay: 2044.88 }),
  withHolidayAccrual({ employeeId: "7", forename: "Viktoriia", surname: "Bastrakova", department: "FOH", status: "active", hourlyRate: 12.21, serviceCharge: 2.00, performanceBonus: 80.00, specialBonus: 0, timesheetHours: 156.23, totalPay: 2300.03 }),
  withHolidayAccrual({ employeeId: "8", forename: "Iara Maria", surname: "Moniz Ferreira", department: "FOH", status: "active", hourlyRate: 9.00, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 45.62, totalPay: 456.20 }),
  withHolidayAccrual({ employeeId: "9", forename: "Anna Margarida (Maggie)", surname: "Abreu Ribeiro", department: "FOH", status: "leaver", hourlyRate: 9.50, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 17.43, totalPay: 183.02 }),
  withHolidayAccrual({ employeeId: "10", forename: "Karl Ted", surname: "Ledesma", department: "FOH", status: "starter", hourlyRate: 12.50, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 18.86, totalPay: 254.61 }),
  withHolidayAccrual({ employeeId: "11", forename: "Wakako", surname: "Ashida", department: "FOH", status: "active", hourlyRate: 12.50, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 165.20, totalPay: 2230.20 }),
  withHolidayAccrual({ employeeId: "12", forename: "Khang", surname: "Le Vy", department: "FOH", status: "leaver", hourlyRate: 12.50, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 41.45, totalPay: 559.58 }),
  withHolidayAccrual({ employeeId: "13", forename: "Steven", surname: "Cumba", department: "FOH", status: "active", hourlyRate: 12.50, serviceCharge: 1.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 219.89, totalPay: 3078.46 }),
  withHolidayAccrual({ employeeId: "14", forename: "Heidy", surname: "Ramos", department: "FOH", status: "active", hourlyRate: 12.21, serviceCharge: 1.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 107.11, totalPay: 1468.48 }),
  
  // BOH Department (Back of House)
  withHolidayAccrual({ employeeId: "15", forename: "Ada", surname: "Feliz", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 3.00, performanceBonus: 100.00, specialBonus: 0, timesheetHours: 132.46, totalPay: 2114.72 }),
  withHolidayAccrual({ employeeId: "16", forename: "Molly", surname: "Booker", department: "BOH", status: "leaver", hourlyRate: 12.21, serviceCharge: 0.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 123.56, totalPay: 1570.45 }),
  withHolidayAccrual({ employeeId: "17", forename: "Adriana", surname: "Baca", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 2.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 93.35, totalPay: 1326.50 }),
  withHolidayAccrual({ employeeId: "18", forename: "Arisnorky", surname: "Feliz", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 2.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 114.73, totalPay: 1630.31 }),
  withHolidayAccrual({ employeeId: "19", forename: "Hafiz", surname: "Rahim", department: "BOH", status: "active", hourlyRate: 14.50, serviceCharge: 0.50, performanceBonus: 120.00, specialBonus: 0, timesheetHours: 242.69, totalPay: 3760.35 }),
  withHolidayAccrual({ employeeId: "20", forename: "Luisa", surname: "Valenzuela", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 1.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 125.61, totalPay: 1722.11 }),
  withHolidayAccrual({ employeeId: "21", forename: "Sultan", surname: "Al Mabrur", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 1.50, performanceBonus: 120.00, specialBonus: 0, timesheetHours: 286.88, totalPay: 4053.12 }),
  withHolidayAccrual({ employeeId: "22", forename: "Sreeja", surname: "Vadlapudi", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 0.50, performanceBonus: 80.00, specialBonus: 0, timesheetHours: 70.63, totalPay: 977.71 }),
  withHolidayAccrual({ employeeId: "23", forename: "Arun", surname: "Thota", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 223.22, totalPay: 2948.74 }),
  withHolidayAccrual({ employeeId: "24", forename: "Rithwik", surname: "Godishala", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 0.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 234.96, totalPay: 2986.34 }),
  withHolidayAccrual({ employeeId: "25", forename: "Nishanth", surname: "Thota", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 0.56, performanceBonus: 0, specialBonus: 0, timesheetHours: 256.89, totalPay: 3280.49 }),
  withHolidayAccrual({ employeeId: "26", forename: "Saicharan", surname: "Manepalli", department: "BOH", status: "active", hourlyRate: 14.50, serviceCharge: 0, performanceBonus: 150.00, specialBonus: 0, timesheetHours: 248.09, totalPay: 3747.30 }),
  
  // CPU Department (Central Production Unit)
  withHolidayAccrual({ employeeId: "27", forename: "Fatima", surname: "Ashraf", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 0, performanceBonus: 0, specialBonus: 80.00, timesheetHours: 172.11, totalPay: 2101.46 }),
  withHolidayAccrual({ employeeId: "28", forename: "Kitty", surname: "Oil Lan", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 0, performanceBonus: 0, specialBonus: 80.00, timesheetHours: 194.70, totalPay: 2377.29 }),
  withHolidayAccrual({ employeeId: "29", forename: "Rheana", surname: "Rahim", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 0, performanceBonus: 0, specialBonus: 0, timesheetHours: 78.49, totalPay: 958.36 }),
  withHolidayAccrual({ employeeId: "30", forename: "Ling", surname: "Chak", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 0, performanceBonus: 0, specialBonus: 80.00, timesheetHours: 207.58, totalPay: 2534.55 }),
  withHolidayAccrual({ employeeId: "31", forename: "Jie En", surname: "Loh", department: "CPU", status: "active", hourlyRate: 9.00, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 40.24, totalPay: 402.40 }),
  withHolidayAccrual({ employeeId: "32", forename: "Jocelyne", surname: "Chala", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 1.56, performanceBonus: 0, specialBonus: 0, timesheetHours: 71.97, totalPay: 991.03 }),
  withHolidayAccrual({ employeeId: "33", forename: "Varsha", surname: "Kumari", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 0.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 160.07, totalPay: 2034.49 }),
  withHolidayAccrual({ employeeId: "34", forename: "Nairobys", surname: "De los Santos", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 30.00, timesheetHours: 56.85, totalPay: 750.99 }),
  withHolidayAccrual({ employeeId: "35", forename: "Samnath", surname: "Thembareni", department: "CPU", status: "active", hourlyRate: 12.50, serviceCharge: 0.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 65.96, totalPay: 857.48 }),
  withHolidayAccrual({ employeeId: "36", forename: "Wing", surname: "Wing", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 2.00, performanceBonus: 80.00, specialBonus: 0, timesheetHours: 239.74, totalPay: 3486.71 }),
];

export const holidayPayments: HolidayPayment[] = [
  { id: "1", employeeForename: "Marco", employeeSurname: "Ribeiro", rate: 13.00, units: 32, total: 416.00 },
  { id: "2", employeeForename: "Fatima", employeeSurname: "Ashraf", rate: 12.21, units: 80, total: 976.80 },
  { id: "3", employeeForename: "Lissette", employeeSurname: "Paredes", rate: 12.21, units: 40, total: 488.40 },
  { id: "4", employeeForename: "Ada", employeeSurname: "Feliz", rate: 12.21, units: 40, total: 488.40 },
  { id: "5", employeeForename: "Arisnorky", employeeSurname: "Feliz", rate: 12.21, units: 64, total: 781.44 },
  { id: "6", employeeForename: "Molly", employeeSurname: "Booker", rate: 12.21, units: 40, total: 488.40 },
  { id: "7", employeeForename: "Nairobys", employeeSurname: "De los Santos", rate: 12.21, units: 48, total: 586.08 },
  { id: "8", employeeForename: "Iara Maria", employeeSurname: "Moniz Ferreira", rate: 9.00, units: 16, total: 144.00 },
  { id: "9", employeeForename: "Anna Margarida", employeeSurname: "Abreu Ribeiro", rate: 9.50, units: 16, total: 152.00 },
  { id: "10", employeeForename: "Samnath", employeeSurname: "Thembareni", rate: 12.21, units: 96, total: 1172.16 },
  { id: "11", employeeForename: "Jocelyne", employeeSurname: "Chala", rate: 12.21, units: 41.6, total: 507.94 },
  { id: "12", employeeForename: "Afonso", employeeSurname: "Gomes", rate: 10.00, units: 24, total: 240.00 },
  { id: "13", employeeForename: "Wing", employeeSurname: "Wing", rate: 12.21, units: 32, total: 390.72 },
  { id: "14", employeeForename: "Khang", employeeSurname: "Le Vy", rate: 11.00, units: 8, total: 88.00 },
];

// Helper functions
export const formatCurrency = (amount: number, currency: string = "£") => {
  return `${currency}${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatHours = (hours: number): string => {
  return hours.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const getDepartmentStats = () => {
  const stats = {
    FOH: { count: 0, totalPay: 0, totalHours: 0, holidayAccrued: 0 },
    BOH: { count: 0, totalPay: 0, totalHours: 0, holidayAccrued: 0 },
    CPU: { count: 0, totalPay: 0, totalHours: 0, holidayAccrued: 0 },
  };

  employees.forEach((emp) => {
    stats[emp.department].count++;
    stats[emp.department].totalPay += emp.totalPay;
    stats[emp.department].totalHours += emp.timesheetHours;
    stats[emp.department].holidayAccrued += emp.holidayAccruedThisPeriod;
  });

  return stats;
};

export const getActiveEmployees = () => employees.filter((e) => e.status === "active");
export const getLeavers = () => employees.filter((e) => e.status === "leaver");
export const getStarters = () => employees.filter((e) => e.status === "starter");

// Get total holiday accrual for all employees this period
export const getTotalHolidayAccrual = (): number => {
  return employees.reduce((sum, emp) => sum + emp.holidayAccruedThisPeriod, 0);
};

// Round holiday hours per UK law (down if <30 mins, up if >=30 mins)
export const roundHolidayHours = (hours: number): number => {
  const wholeHours = Math.floor(hours);
  const fraction = hours - wholeHours;
  return fraction >= 0.5 ? wholeHours + 1 : wholeHours;
};
