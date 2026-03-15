import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Check, X, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Activity, Check, X, Minus, RotateCcw } from "lucide-react";

type SmokeStatus = "pass" | "fail" | "untested";

interface SmokeItem {
  key: string;
  label: string;
}

const SMOKE_ITEMS: SmokeItem[] = [
  { key: "admin_login", label: "Admin login" },
  { key: "worker_login", label: "Worker login" },
  { key: "vacancy_creation", label: "Vacancy creation" },
  { key: "vacancy_application", label: "Vacancy application" },
  { key: "inbox_messaging", label: "Inbox messaging" },
  { key: "talent_visibility", label: "Talent profile visibility" },
  { key: "paid_outbound", label: "Paid outbound contact" },
  { key: "credit_consumption", label: "Credit consumption" },
  { key: "credit_expiry", label: "Credit expiry" },
  { key: "unlock_expiry", label: "Unlock expiry" },
];

interface SmokeTestPanelProps {
  sandboxId: string;
}

function getStorageKey(sandboxId: string) {
  return `smoke-test:${sandboxId}`;
}

export function SmokeTestPanel({ sandboxId }: SmokeTestPanelProps) {
  const [results, setResults] = useState<Record<string, SmokeStatus>>(() => {
    try {
      return JSON.parse(localStorage.getItem(getStorageKey(sandboxId)) || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(getStorageKey(sandboxId), JSON.stringify(results));
  }, [results, sandboxId]);

  const cycle = (key: string) => {
    const order: SmokeStatus[] = ["untested", "pass", "fail"];
    const current = results[key] || "untested";
    const next = order[(order.indexOf(current) + 1) % order.length];
    setResults((prev) => ({ ...prev, [key]: next }));
    // Fire-and-forget timestamp update
    supabase.from("sandbox_tenants").update({ last_smoke_test_at: new Date().toISOString() } as any).eq("id", sandboxId).then();
  };

  const reset = () => {
    setResults({});
    localStorage.removeItem(getStorageKey(sandboxId));
  };

  const passCount = Object.values(results).filter((v) => v === "pass").length;
  const failCount = Object.values(results).filter((v) => v === "fail").length;

  const statusIcon = (s: SmokeStatus) => {
    if (s === "pass") return <Check className="h-3 w-3 text-green-600" />;
    if (s === "fail") return <X className="h-3 w-3 text-destructive" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Smoke Tests
        </h4>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            ✅ {passCount} · ❌ {failCount} · ⏳ {SMOKE_ITEMS.length - passCount - failCount}
          </Badge>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={reset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {SMOKE_ITEMS.map((item) => {
          const status = results[item.key] || "untested";
          return (
            <button
              key={item.key}
              onClick={() => cycle(item.key)}
              className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md border transition-colors text-left ${
                status === "pass"
                  ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
                  : status === "fail"
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {statusIcon(status)}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
