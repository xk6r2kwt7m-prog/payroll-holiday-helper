import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Secondary hint — e.g. "why this matters" */
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  /** Secondary action (e.g. link to settings) */
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  hint,
  actionLabel,
  onAction,
  actionHref,
  secondaryLabel,
  secondaryHref,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center px-4",
      compact ? "py-10" : "py-20",
      className,
    )}>
      <div className={cn(
        "rounded-xl bg-muted/60 flex items-center justify-center mb-4",
        compact ? "h-12 w-12" : "h-14 w-14",
      )}>
        <Icon className={cn("text-muted-foreground/60", compact ? "h-5 w-5" : "h-6 w-6")} />
      </div>
      <h3 className={cn(
        "font-semibold text-foreground mb-1.5",
        compact ? "text-sm" : "text-base",
      )}>
        {title}
      </h3>
      <p className={cn(
        "text-muted-foreground max-w-sm leading-relaxed",
        compact ? "text-xs" : "text-[13px]",
      )}>
        {description}
      </p>
      {hint && (
        <p className="text-xs text-muted-foreground/60 mt-2 max-w-xs leading-relaxed">{hint}</p>
      )}
      <div className="flex items-center gap-2.5 mt-5">
        {actionLabel && (onAction || actionHref) && (
          actionHref ? (
            <a href={actionHref}>
              <Button size="sm">{actionLabel}</Button>
            </a>
          ) : (
            <Button size="sm" onClick={onAction}>{actionLabel}</Button>
          )
        )}
        {secondaryLabel && secondaryHref && (
          <a href={secondaryHref}>
            <Button variant="ghost" size="sm">{secondaryLabel}</Button>
          </a>
        )}
      </div>
    </div>
  );
}
