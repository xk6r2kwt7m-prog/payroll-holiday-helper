import { Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivacy, type SensitivityCategory } from "@/hooks/usePrivacyShield";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SensitiveFieldProps {
  /** Unique key for this field instance, e.g. `emp-123-hourly_rate` */
  fieldKey: string;
  /** The actual value to display when revealed */
  value: React.ReactNode;
  /** The sensitivity category */
  category: SensitivityCategory;
  /** Optional employee ID for audit */
  employeeId?: string;
  /** Masked placeholder text */
  mask?: string;
  /** Additional className */
  className?: string;
  /** Inline mode (no button, just icon) */
  inline?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

export function SensitiveField({
  fieldKey,
  value,
  category,
  employeeId,
  mask = "•••••",
  className,
  inline = false,
  size = "md",
}: SensitiveFieldProps) {
  const { canReveal, isRevealed, revealField, hideField } = usePrivacy();

  const revealed = isRevealed(fieldKey);
  const hasAccess = canReveal(category);

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  if (!hasAccess) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 text-muted-foreground", sizeClasses[size], className)}>
            <Shield className={cn(iconSizes[size], "text-muted-foreground/50")} />
            <span className="font-mono tracking-wider">Protected</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>You don't have permission to view this data</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (revealed) {
    return (
      <span className={cn("inline-flex items-center gap-1 animate-fade-in", sizeClasses[size], className)}>
        <span>{value}</span>
        {inline ? (
          <button
            onClick={(e) => { e.stopPropagation(); hideField(fieldKey); }}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          >
            <EyeOff className={iconSizes[size]} />
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-0.5"
            onClick={(e) => { e.stopPropagation(); hideField(fieldKey); }}
          >
            <EyeOff className={iconSizes[size]} />
          </Button>
        )}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1", sizeClasses[size], className)}>
      <span className="font-mono tracking-wider text-muted-foreground select-none">{mask}</span>
      {inline ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            revealField(fieldKey, category, employeeId);
          }}
          className="text-muted-foreground hover:text-primary transition-colors p-0.5"
          title="Reveal"
        >
          <Eye className={iconSizes[size]} />
        </button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 ml-0.5 text-muted-foreground hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            revealField(fieldKey, category, employeeId);
          }}
        >
          <Eye className={iconSizes[size]} />
        </Button>
      )}
    </span>
  );
}

/** Section-level sensitive wrapper */
interface SensitiveSectionProps {
  sectionKey: string;
  category: SensitivityCategory;
  employeeId?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function SensitiveSection({
  sectionKey,
  category,
  employeeId,
  title,
  children,
  className,
}: SensitiveSectionProps) {
  const { canReveal, isRevealed, revealField, hideField } = usePrivacy();

  const revealed = isRevealed(sectionKey);
  const hasAccess = canReveal(category);

  if (!hasAccess) {
    return (
      <div className={cn("rounded-lg border border-border bg-muted/30 p-4 flex items-center gap-3", className)}>
        <Shield className="h-5 w-5 text-muted-foreground/50" />
        <div>
          {title && <p className="text-sm font-medium text-muted-foreground">{title}</p>}
          <p className="text-xs text-muted-foreground">Restricted — insufficient permissions</p>
        </div>
      </div>
    );
  }

  if (!revealed) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border bg-muted/20 p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {title && <span className="text-sm font-medium text-muted-foreground">{title}</span>}
            <span className="text-xs text-muted-foreground">— hidden for privacy</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => revealField(sectionKey, category, employeeId)}
          >
            <Eye className="h-3.5 w-3.5" />
            Reveal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative animate-fade-in", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1 right-1 h-6 text-[10px] gap-1 text-muted-foreground z-10"
        onClick={() => hideField(sectionKey)}
      >
        <EyeOff className="h-3 w-3" />
        Hide
      </Button>
      {children}
    </div>
  );
}
