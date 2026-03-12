import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/useI18n";
import { useTenant } from "@/hooks/useTenant";
import {
  Calendar, DollarSign, Users, FileText, BarChart3, GraduationCap,
  CalendarClock, ClipboardCheck, CreditCard, Sparkles, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingModule {
  id: string;
  name: string;
  icon: any;
  description: string;
  pricePerEmployee: number;
  pricePerMonth: number;
  currency: string;
  included: boolean;
  billingType: "per_employee" | "flat" | "free";
}

const DEFAULT_MODULES: PricingModule[] = [
  {
    id: "core_hr",
    name: "Core HR",
    icon: Users,
    description: "Employee records, profiles, and team management",
    pricePerEmployee: 0,
    pricePerMonth: 0,
    currency: "GBP",
    included: true,
    billingType: "free",
  },
  {
    id: "scheduling",
    name: "Scheduling",
    icon: CalendarClock,
    description: "Shift planning, rotas, and availability",
    pricePerEmployee: 0,
    pricePerMonth: 0,
    currency: "GBP",
    included: true,
    billingType: "free",
  },
  {
    id: "attendance",
    name: "Attendance",
    icon: ClipboardCheck,
    description: "Clock-in/out, geofencing, and timesheets",
    pricePerEmployee: 2,
    pricePerMonth: 0,
    currency: "GBP",
    included: false,
    billingType: "per_employee",
  },
  {
    id: "payroll",
    name: "Payroll",
    icon: DollarSign,
    description: "Pay runs, holiday accrual, and payslips",
    pricePerEmployee: 4,
    pricePerMonth: 0,
    currency: "GBP",
    included: false,
    billingType: "per_employee",
  },
  {
    id: "documents",
    name: "Documents & Compliance",
    icon: FileText,
    description: "Contracts, document uploads, and expiry tracking",
    pricePerEmployee: 1,
    pricePerMonth: 0,
    currency: "GBP",
    included: false,
    billingType: "per_employee",
  },
  {
    id: "training",
    name: "Training",
    icon: GraduationCap,
    description: "Training records, certifications, and compliance",
    pricePerEmployee: 1,
    pricePerMonth: 0,
    currency: "GBP",
    included: false,
    billingType: "per_employee",
  },
  {
    id: "analytics",
    name: "Analytics & Reporting",
    icon: BarChart3,
    description: "Advanced reports, labour cost analysis, and insights",
    pricePerEmployee: 2,
    pricePerMonth: 0,
    currency: "GBP",
    included: false,
    billingType: "per_employee",
  },
  {
    id: "service_charge",
    name: "Service Charge / Tips",
    icon: CreditCard,
    description: "Tronc management, tip pooling, and distribution",
    pricePerEmployee: 1,
    pricePerMonth: 0,
    currency: "GBP",
    included: false,
    billingType: "per_employee",
  },
];

export function ModulePricingConfig() {
  const { fmt } = useI18n();
  const [modules] = useState<PricingModule[]>(DEFAULT_MODULES);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Module pricing is managed at the platform level. Each module can be billed per employee or as a flat monthly fee.
      </p>

      <div className="space-y-2">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                mod.included ? "border-primary/30 bg-primary/5" : "border-border bg-card"
              )}
            >
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                mod.included ? "bg-primary/10" : "bg-muted"
              )}>
                <Icon className={cn("h-4 w-4", mod.included ? "text-primary" : "text-muted-foreground")} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{mod.name}</p>
                  {mod.billingType === "free" && (
                    <Badge variant="secondary" className="text-[9px] px-1.5">Included</Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{mod.description}</p>
              </div>

              <div className="text-right shrink-0">
                {mod.billingType === "free" ? (
                  <span className="text-xs font-semibold text-success">Free</span>
                ) : mod.billingType === "per_employee" ? (
                  <div>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {fmt.formatCurrency(mod.pricePerEmployee)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">/employee/mo</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {fmt.formatCurrency(mod.pricePerMonth)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">/month</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-muted/30 border border-border p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>Module pricing is configured at the platform level and applied via subscription plans.</span>
        </div>
      </div>
    </div>
  );
}
