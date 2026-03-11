import { Building2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import ugloIcon from "@/assets/uglo-icon.png";

interface TenantOption {
  tenant_id: string;
  tenant_name: string;
  role: string;
}

interface TenantPickerProps {
  tenants: TenantOption[];
  onSelect: (tenantId: string) => void;
}

export function TenantPicker({ tenants, onSelect }: TenantPickerProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img src={ugloIcon} alt="UGLŌ" className="h-14 w-14 rounded-2xl shadow-lg mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Select Workspace</h1>
          <p className="text-muted-foreground mt-1">
            You belong to multiple companies. Choose one to continue.
          </p>
        </div>

        <div className="space-y-3">
          {tenants.map((t) => (
            <button
              key={t.tenant_id}
              onClick={() => onSelect(t.tenant_id)}
              className="w-full flex items-center gap-4 rounded-xl bg-card shadow-card border border-border p-4 hover:border-primary/50 hover:shadow-md transition-all text-left"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-card-foreground truncate">{t.tenant_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{t.role.replace("_", " ")}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
