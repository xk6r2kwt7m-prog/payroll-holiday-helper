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

// Actual data from January 2026 payroll
export const payrollSummary: PayrollSummary = {
  period: "15th Dec - 25th Jan 2026",
  payDate: "Jan 25, 2026",
  timesheet: 73482.87,
  incentives: 1440.00,
  holidays: 6920.34,
  totalPayroll: 81843.21,
};

export const employees: PayrollEntry[] = [
  // FOH Department
  { employeeId: "1", forename: "Lissette", surname: "Paredes", department: "FOH", status: "active", hourlyRate: 12.21, serviceCharge: 4.00, performanceBonus: 150.00, specialBonus: 0, timesheetHours: 196.98, totalPay: 3343.05 },
  { employeeId: "2", forename: "Afonso", surname: "Gomes", department: "FOH", status: "active", hourlyRate: 11.00, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 145.99, totalPay: 1751.88 },
  { employeeId: "3", forename: "Kazumi", surname: "Ortega", department: "FOH", status: "active", hourlyRate: 12.21, serviceCharge: 1.00, performanceBonus: 50.00, specialBonus: 0, timesheetHours: 117.75, totalPay: 1605.48 },
  { employeeId: "4", forename: "Marco", surname: "Ribeiro", department: "FOH", status: "active", hourlyRate: 13.00, serviceCharge: 2.50, performanceBonus: 120.00, specialBonus: 0, timesheetHours: 247.35, totalPay: 3953.92 },
  { employeeId: "5", forename: "Rubem", surname: "Pereira", department: "FOH", status: "active", hourlyRate: 13.00, serviceCharge: 2.00, performanceBonus: 120.00, specialBonus: 0, timesheetHours: 234.68, totalPay: 3640.20 },
  { employeeId: "6", forename: "Daniela Patricia", surname: "Da Costa Almeida", department: "FOH", status: "active", hourlyRate: 11.00, serviceCharge: 1.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 163.59, totalPay: 2044.88 },
  { employeeId: "7", forename: "Viktoriia", surname: "Bastrakova", department: "FOH", status: "active", hourlyRate: 12.21, serviceCharge: 2.00, performanceBonus: 80.00, specialBonus: 0, timesheetHours: 156.23, totalPay: 2300.03 },
  { employeeId: "8", forename: "Iara Maria", surname: "Moniz Ferreira", department: "FOH", status: "active", hourlyRate: 9.00, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 45.62, totalPay: 456.20 },
  { employeeId: "9", forename: "Anna Margarida (Maggie)", surname: "Abreu Ribeiro", department: "FOH", status: "leaver", hourlyRate: 9.50, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 17.43, totalPay: 183.02 },
  { employeeId: "10", forename: "Karl Ted", surname: "Ledesma", department: "FOH", status: "starter", hourlyRate: 12.50, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 18.86, totalPay: 254.61 },
  { employeeId: "11", forename: "Wakako", surname: "Ashida", department: "FOH", status: "active", hourlyRate: 12.50, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 165.20, totalPay: 2230.20 },
  { employeeId: "12", forename: "Khang", surname: "Le Vy", department: "FOH", status: "leaver", hourlyRate: 12.50, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 41.45, totalPay: 559.58 },
  { employeeId: "13", forename: "Steven", surname: "Cumba", department: "FOH", status: "active", hourlyRate: 12.50, serviceCharge: 1.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 219.89, totalPay: 3078.46 },
  { employeeId: "14", forename: "Heidy", surname: "Ramos", department: "FOH", status: "active", hourlyRate: 12.21, serviceCharge: 1.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 107.11, totalPay: 1468.48 },
  
  // BOH Department
  { employeeId: "15", forename: "Ada", surname: "Feliz", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 3.00, performanceBonus: 100.00, specialBonus: 0, timesheetHours: 132.46, totalPay: 2114.72 },
  { employeeId: "16", forename: "Molly", surname: "Booker", department: "BOH", status: "leaver", hourlyRate: 12.21, serviceCharge: 0.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 123.56, totalPay: 1570.45 },
  { employeeId: "17", forename: "Adriana", surname: "Baca", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 2.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 93.35, totalPay: 1326.50 },
  { employeeId: "18", forename: "Arisnorky", surname: "Feliz", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 2.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 114.73, totalPay: 1630.31 },
  { employeeId: "19", forename: "Hafiz", surname: "Rahim", department: "BOH", status: "active", hourlyRate: 14.50, serviceCharge: 0.50, performanceBonus: 120.00, specialBonus: 0, timesheetHours: 242.69, totalPay: 3760.35 },
  { employeeId: "20", forename: "Luisa", surname: "Valenzuela", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 1.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 125.61, totalPay: 1722.11 },
  { employeeId: "21", forename: "Sultan", surname: "Al Mabrur", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 1.50, performanceBonus: 120.00, specialBonus: 0, timesheetHours: 286.88, totalPay: 4053.12 },
  { employeeId: "22", forename: "Sreeja", surname: "Vadlapudi", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 0.50, performanceBonus: 80.00, specialBonus: 0, timesheetHours: 70.63, totalPay: 977.71 },
  { employeeId: "23", forename: "Arun", surname: "Thota", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 223.22, totalPay: 2948.74 },
  { employeeId: "24", forename: "Rithwik", surname: "Godishala", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 0.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 234.96, totalPay: 2986.34 },
  { employeeId: "25", forename: "Nishanth", surname: "Thota", department: "BOH", status: "active", hourlyRate: 12.21, serviceCharge: 0.56, performanceBonus: 0, specialBonus: 0, timesheetHours: 256.89, totalPay: 3280.49 },
  { employeeId: "26", forename: "Saicharan", surname: "Manepalli", department: "BOH", status: "active", hourlyRate: 14.50, serviceCharge: 0, performanceBonus: 150.00, specialBonus: 0, timesheetHours: 248.09, totalPay: 3747.30 },
  
  // CPU Department
  { employeeId: "27", forename: "Fatima", surname: "Ashraf", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 0, performanceBonus: 0, specialBonus: 80.00, timesheetHours: 172.11, totalPay: 2101.46 },
  { employeeId: "28", forename: "Kitty", surname: "Oil Lan", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 0, performanceBonus: 0, specialBonus: 80.00, timesheetHours: 194.70, totalPay: 2377.29 },
  { employeeId: "29", forename: "Rheana", surname: "Rahim", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 0, performanceBonus: 0, specialBonus: 0, timesheetHours: 78.49, totalPay: 958.36 },
  { employeeId: "30", forename: "Ling", surname: "Chak", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 0, performanceBonus: 0, specialBonus: 80.00, timesheetHours: 207.58, totalPay: 2534.55 },
  { employeeId: "31", forename: "Jie En", surname: "Loh", department: "CPU", status: "active", hourlyRate: 9.00, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 0, timesheetHours: 40.24, totalPay: 402.40 },
  { employeeId: "32", forename: "Jocelyne", surname: "Chala", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 1.56, performanceBonus: 0, specialBonus: 0, timesheetHours: 71.97, totalPay: 991.03 },
  { employeeId: "33", forename: "Varsha", surname: "Kumari", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 0.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 160.07, totalPay: 2034.49 },
  { employeeId: "34", forename: "Nairobys", surname: "De los Santos", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 1.00, performanceBonus: 0, specialBonus: 30.00, timesheetHours: 56.85, totalPay: 750.99 },
  { employeeId: "35", forename: "Samnath", surname: "Thembareni", department: "CPU", status: "active", hourlyRate: 12.50, serviceCharge: 0.50, performanceBonus: 0, specialBonus: 0, timesheetHours: 65.96, totalPay: 857.48 },
  { employeeId: "36", forename: "Wing", surname: "Wing", department: "CPU", status: "active", hourlyRate: 12.21, serviceCharge: 2.00, performanceBonus: 80.00, specialBonus: 0, timesheetHours: 239.74, totalPay: 3486.71 },
];

export const holidayPayments: HolidayPayment[] = [
  { id: "1", employeeForename: "Marco", rate: 13.00, units: 32, total: 416.00 },
  { id: "2", employeeForename: "Fatima", rate: 12.21, units: 80, total: 976.80 },
  { id: "3", employeeForename: "Lissette", rate: 12.21, units: 40, total: 488.40 },
  { id: "4", employeeForename: "Ada", rate: 12.21, units: 40, total: 488.40 },
  { id: "5", employeeForename: "Aris", rate: 12.21, units: 64, total: 781.44 },
  { id: "6", employeeForename: "Molly", rate: 12.21, units: 40, total: 488.40 },
  { id: "7", employeeForename: "Nairobys", rate: 12.21, units: 48, total: 586.08 },
  { id: "8", employeeForename: "Maria", rate: 9.00, units: 16, total: 144.00 },
  { id: "9", employeeForename: "Maggie", rate: 9.50, units: 16, total: 152.00 },
  { id: "10", employeeForename: "Sam", rate: 12.21, units: 96, total: 1172.16 },
  { id: "11", employeeForename: "Jocelyn", rate: 12.21, units: 41.6, total: 507.94 },
  { id: "12", employeeForename: "Afonso", rate: 10.00, units: 24, total: 240.00 },
  { id: "13", employeeForename: "Wing", rate: 12.21, units: 32, total: 390.72 },
  { id: "14", employeeForename: "Khang", rate: 11.00, units: 8, total: 88.00 },
];

// Helper functions
export const formatCurrency = (amount: number, currency: string = "£") => {
  return `${currency}${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getDepartmentStats = () => {
  const stats = {
    FOH: { count: 0, totalPay: 0, totalHours: 0 },
    BOH: { count: 0, totalPay: 0, totalHours: 0 },
    CPU: { count: 0, totalPay: 0, totalHours: 0 },
  };

  employees.forEach((emp) => {
    stats[emp.department].count++;
    stats[emp.department].totalPay += emp.totalPay;
    stats[emp.department].totalHours += emp.timesheetHours;
  });

  return stats;
};

export const getActiveEmployees = () => employees.filter((e) => e.status === "active");
export const getLeavers = () => employees.filter((e) => e.status === "leaver");
export const getStarters = () => employees.filter((e) => e.status === "starter");
