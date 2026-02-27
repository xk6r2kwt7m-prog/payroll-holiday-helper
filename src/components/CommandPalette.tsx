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
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";

const pages = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", group: "Pages" },
  { icon: Users, label: "Employees", path: "/employees", group: "Pages" },
  { icon: CalendarClock, label: "Schedule", path: "/schedule", group: "Pages" },
  { icon: ClipboardCheck, label: "Timesheets", path: "/timesheets", group: "Pages" },
  { icon: BarChart3, label: "Schedule Report", path: "/schedule/report", group: "Pages" },
  { icon: BarChart3, label: "Schedule Analytics", path: "/schedule/analytics", group: "Pages" },
  { icon: DollarSign, label: "Payroll", path: "/payroll", group: "Pages" },
  { icon: CalendarDays, label: "Payroll Calendar", path: "/payroll/calendar", group: "Pages" },
  { icon: BarChart3, label: "Payroll Analytics", path: "/payroll/analytics", group: "Pages" },
  { icon: AlertTriangle, label: "Overpayments", path: "/payroll/overpayments", group: "Pages" },
  { icon: Calendar, label: "Holidays", path: "/holidays", group: "Pages" },
  { icon: ClipboardCheck, label: "Holiday Audit", path: "/holidays/audit", group: "Pages" },
  { icon: FileText, label: "Contracts", path: "/contracts", group: "Pages" },
  { icon: MapPin, label: "Locations", path: "/locations", group: "Pages" },
  { icon: Settings, label: "Settings", path: "/settings", group: "Pages" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: employees = [] } = useEmployees();

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

  const runAction = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, employees, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.path} onSelect={() => runAction(p.path)}>
              <p.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {employeeItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Employees">
              {employeeItems.map((e) => (
                <CommandItem key={e.id} onSelect={() => runAction(`/employees?search=${encodeURIComponent(e.label)}`)}>
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{e.label}</span>
                    <span className="text-xs text-muted-foreground">{e.subtitle}</span>
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
