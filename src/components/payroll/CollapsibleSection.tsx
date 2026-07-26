import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * Phase B — read-only presentational wrapper.
 * Collapses non-essential Payroll sections by default. It does NOT alter
 * children rendering logic; it only controls visibility of the wrapped block.
 */
export interface CollapsibleSectionProps {
  title: string;
  summary?: string | null;
  count?: number | null;
  badge?: { label: string; tone?: "neutral" | "warning" | "success" | "danger" } | null;
  defaultOpen?: boolean;
  testId?: string;
  children: ReactNode;
}

const toneClass: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
};

export function CollapsibleSection({
  title,
  summary,
  count,
  badge,
  defaultOpen = false,
  testId,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="rounded-xl border border-border/60 bg-card shadow-card"
        data-testid={testId}
        data-open={open ? "true" : "false"}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            aria-expanded={open}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground truncate">
                  {title}
                </span>
                {typeof count === "number" && count > 0 && (
                  <span className="text-xs text-muted-foreground">({count})</span>
                )}
                {badge && (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0", toneClass[badge.tone ?? "neutral"])}
                  >
                    {badge.label}
                  </Badge>
                )}
              </div>
              {summary && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {summary}
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
