import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  ClipboardCheck,
  BarChart3,
  DollarSign,
  CalendarDays,
  Calendar,
  FileText,
  MapPin,
  Settings,
  Search,
  AlertTriangle,
  UserX,
  GraduationCap,
  ShieldAlert,
  UserPlus,
  Megaphone,
  Scale,
  ClipboardList,
  PieChart,
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useAbsenceRecords } from "@/hooks/useAbsences";
import { useTrainingRecords } from "@/hooks/useTrainingRecords";
import { cn } from "@/lib/utils";

const pages = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Employees", path: "/employees" },
  { icon: CalendarClock, label: "Schedule", path: "/schedule" },
  { icon: ClipboardCheck, label: "Timesheets", path: "/timesheets" },
  { icon: ClipboardList, label: "Schedule Report", path: "/schedule/report" },
  { icon: BarChart3, label: "Schedule Analytics", path: "/schedule/analytics" },
  { icon: DollarSign, label: "Payroll", path: "/payroll" },
  { icon: CalendarDays, label: "Payroll Calendar", path: "/payroll/calendar" },
  { icon: PieChart, label: "Payroll Analytics", path: "/payroll/analytics" },
  { icon: AlertTriangle, label: "Overpayments", path: "/payroll/overpayments" },
  { icon: Calendar, label: "Holidays", path: "/holidays" },
  { icon: Scale, label: "Holiday Audit", path: "/holidays/audit" },
  { icon: UserX, label: "Absences", path: "/absences" },
  { icon: UserPlus, label: "Onboarding", path: "/onboarding" },
  { icon: GraduationCap, label: "Training", path: "/training" },
  { icon: ShieldAlert, label: "Disciplinary", path: "/disciplinary" },
  { icon: Megaphone, label: "Announcements", path: "/announcements" },
  { icon: FileText, label: "Contracts", path: "/contracts" },
  { icon: MapPin, label: "Locations", path: "/locations" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: employees = [] } = useEmployees();
  const { data: absences = [] } = useAbsenceRecords();
  const { data: trainingRecords = [] } = useTrainingRecords();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const employeeItems = useMemo(
    () =>
      employees
        .filter((e) => !e.archived_at)
        .slice(0, 20)
        .map((e) => ({
          label: `${e.forename} ${e.surname}`,
          subtitle: `${e.department} · ${e.status}`,
          id: e.id,
        })),
    [employees]
  );

  const absenceItems = useMemo(
    () =>
      absences
        .slice(0, 10)
        .map((a) => ({
          label: a.employees
            ? `${a.employees.forename} ${a.employees.surname}`
            : "Unknown",
          subtitle: `${a.absence_type} · ${a.start_date} → ${a.end_date}`,
          id: a.id,
        })),
    [absences]
  );

  const trainingItems = useMemo(
    () =>
      trainingRecords
        .slice(0, 10)
        .map((t) => ({
          label: t.certification_name,
          subtitle: t.employees
            ? `${t.employees.forename} ${t.employees.surname} · ${t.expiry_date ? `Exp: ${t.expiry_date}` : "No expiry"}`
            : t.expiry_date ? `Exp: ${t.expiry_date}` : "No expiry",
          id: t.id,
        })),
    [trainingRecords]
  );

  const runAction = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search employees, pages, records…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No results found.</CommandEmpty>

        {employeeItems.length > 0 && (
          <CommandGroup heading="Employees">
            {employeeItems.map((e) => (
              <CommandItem
                key={e.id}
                onSelect={() => runAction(`/employees?search=${encodeURIComponent(e.label)}`)}
                className="min-h-[44px]"
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{e.label}</span>
                  <span className="text-xs text-muted-foreground truncate">{e.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.path} onSelect={() => runAction(p.path)} className="min-h-[44px]">
              <p.icon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {absenceItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Absence Records">
              {absenceItems.map((a) => (
                <CommandItem
                  key={a.id}
                  onSelect={() => runAction("/absences")}
                  className="min-h-[44px]"
                >
                  <UserX className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{a.label}</span>
                    <span className="text-xs text-muted-foreground truncate">{a.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {trainingItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Training Records">
              {trainingItems.map((t) => (
                <CommandItem
                  key={t.id}
                  onSelect={() => runAction("/training")}
                  className="min-h-[44px]"
                >
                  <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{t.label}</span>
                    <span className="text-xs text-muted-foreground truncate">{t.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
