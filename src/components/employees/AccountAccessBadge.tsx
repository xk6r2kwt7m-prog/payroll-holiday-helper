import { User, Send, Link2, AlertTriangle, Copy, Shield, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AccountAccessState } from "@/hooks/useAccountLinkage";
import { cn } from "@/lib/utils";

const stateConfig: Record<AccountAccessState, {
  icon: typeof User;
  label: string;
  className: string;
}> = {
  no_email: {
    icon: UserX,
    label: "Record only",
    className: "border-muted-foreground/40 text-muted-foreground bg-muted/30",
  },
  email_no_invite: {
    icon: Send,
    label: "No invite sent",
    className: "border-amber-400/40 text-amber-600 bg-amber-50 dark:border-amber-500/40 dark:text-amber-400 dark:bg-amber-900/20",
  },
  invite_sent: {
    icon: Send,
    label: "Invite sent",
    className: "border-blue-400/40 text-blue-600 bg-blue-50 dark:border-blue-500/40 dark:text-blue-400 dark:bg-blue-900/20",
  },
  invite_accepted: {
    icon: User,
    label: "Invite accepted",
    className: "border-emerald-400/40 text-emerald-600 bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-400 dark:bg-emerald-900/20",
  },
  linked: {
    icon: Link2,
    label: "Linked",
    className: "border-success/40 text-success bg-success/5",
  },
  linked_verify: {
    icon: AlertTriangle,
    label: "Linked — verify",
    className: "border-destructive/40 text-destructive bg-destructive/5",
  },
  duplicate_email: {
    icon: Copy,
    label: "Duplicate email",
    className: "border-destructive/40 text-destructive bg-destructive/5",
  },
};

interface AccountAccessBadgeProps {
  state: AccountAccessState;
  description?: string;
  size?: "sm" | "md";
}

export function AccountAccessBadge({ state, description, size = "sm" }: AccountAccessBadgeProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-0.5 font-medium",
        size === "sm" ? "text-[10px] h-4.5 px-1.5" : "text-xs px-2 py-0.5",
        config.className,
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {config.label}
    </Badge>
  );

  if (!description) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
