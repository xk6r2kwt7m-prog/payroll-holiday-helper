import { Link } from "react-router-dom";
import { usePayrollAudit } from "@/hooks/usePayrollAudit";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function AuditHealthWidget() {
  const { tenantId } = useTenant();
  const { data: audit, isLoading } = usePayrollAudit(true, tenantId);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card shadow-card p-5 flex items-center gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Running audit checks...</span>
      </div>
    );
  }

  if (!audit) return null;

  const { healthScore, errors, warnings, totalChecks } = audit.summary;
  const isClean = errors === 0 && warnings === 0;

  const Icon = isClean ? ShieldCheck : errors > 0 ? ShieldX : ShieldAlert;
  const iconColor = isClean ? "text-success" : errors > 0 ? "text-destructive" : "text-warning";
  const bgColor = isClean ? "bg-success/5 border-success/20" : errors > 0 ? "bg-destructive/5 border-destructive/20" : "bg-warning/5 border-warning/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <Link to="/payroll/audit" className="block">
        <div className={`rounded-xl border shadow-card p-5 transition-all hover:shadow-elevated hover:-translate-y-0.5 cursor-pointer ${bgColor}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Icon className={`h-6 w-6 ${iconColor}`} />
              <div>
                <h3 className="font-semibold text-card-foreground text-sm">Payroll Audit</h3>
                <p className="text-xs text-muted-foreground">
                  {isClean ? "All checks passing" : `${errors} error${errors !== 1 ? "s" : ""}, ${warnings} warning${warnings !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold ${iconColor}`}>{healthScore}</span>
              <span className="text-xs text-muted-foreground block">/ 100</span>
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="h-1.5 rounded-full bg-muted flex overflow-hidden">
            <div className="bg-success h-full transition-all" style={{ width: `${(audit.summary.passed / totalChecks) * 100}%` }} />
            <div className="bg-warning h-full transition-all" style={{ width: `${(warnings / totalChecks) * 100}%` }} />
            <div className="bg-destructive h-full transition-all" style={{ width: `${(errors / totalChecks) * 100}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{totalChecks} checks · Click to view details</p>
        </div>
      </Link>
    </motion.div>
  );
}
