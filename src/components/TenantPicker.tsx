import { Building2, ChevronRight, FlaskConical, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import ugloIcon from "@/assets/uglo-icon.png";

interface TenantOption {
  tenant_id: string;
  tenant_name: string;
  role: string;
}

interface TenantPickerProps {
  tenants: TenantOption[];
  onSelect: (tenantId: string) => void;
  lastUsedTenantId?: string | null;
}

const SANDBOX_PATTERNS = /sandbox|test|demo|staging|dev/i;

function isSandbox(name: string): boolean {
  return SANDBOX_PATTERNS.test(name);
}

function sortTenants(tenants: TenantOption[]): TenantOption[] {
  return [...tenants].sort((a, b) => {
    const aIsSandbox = isSandbox(a.tenant_name);
    const bIsSandbox = isSandbox(b.tenant_name);
    if (aIsSandbox !== bIsSandbox) return aIsSandbox ? 1 : -1;
    return a.tenant_name.localeCompare(b.tenant_name);
  });
}

export function TenantPicker({ tenants, onSelect, lastUsedTenantId }: TenantPickerProps) {
  const sorted = sortTenants(tenants);

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
          {sorted.map((t) => {
            const sandbox = isSandbox(t.tenant_name);
            const lastUsed = lastUsedTenantId === t.tenant_id;

            return (
              <button
                key={t.tenant_id}
                onClick={() => onSelect(t.tenant_id)}
                className="w-full flex items-center gap-4 rounded-xl bg-card shadow-card border border-border p-4 hover:border-primary/50 hover:shadow-md transition-all text-left"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg shrink-0 ${sandbox ? "bg-amber-500/10" : "bg-primary/10"}`}>
                  {sandbox
                    ? <FlaskConical className="h-5 w-5 text-amber-600" />
                    : <Building2 className="h-5 w-5 text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-card-foreground truncate">{t.tenant_name}</p>
                    {sandbox && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600 shrink-0">
                        Sandbox
                      </Badge>
                    )}
                    {lastUsed && !sandbox && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary shrink-0">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        Last used
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{t.role.replace("_", " ")}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
