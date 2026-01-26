import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "accent";
  href?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  accent: "bg-accent text-accent-foreground",
};

const iconBgStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-foreground/20 text-primary-foreground",
  success: "bg-success-foreground/20 text-success-foreground",
  warning: "bg-warning-foreground/20 text-warning-foreground",
  accent: "bg-accent-foreground/20 text-accent-foreground",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  href,
  onClick,
}: StatCardProps) {
  const isClickable = href || onClick;
  
  const content = (
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p
          className={cn(
            "text-sm font-medium",
            variant === "default" ? "text-muted-foreground" : "opacity-80"
          )}
        >
          {title}
        </p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && (
          <p
            className={cn(
              "text-sm",
              variant === "default" ? "text-muted-foreground" : "opacity-70"
            )}
          >
            {subtitle}
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-1 text-sm">
            <span
              className={cn(
                "font-medium",
                trend.isPositive ? "text-success" : "text-destructive",
                variant !== "default" && "opacity-90"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className={variant === "default" ? "text-muted-foreground" : "opacity-70"}>
              vs last month
            </span>
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-transform",
          iconBgStyles[variant],
          isClickable && "group-hover:scale-110"
        )}
      >
        {icon}
      </div>
    </div>
  );
  
  const cardClasses = cn(
    "rounded-xl p-6 shadow-card transition-all duration-200 animate-fade-in group",
    variantStyles[variant],
    isClickable && "cursor-pointer hover:shadow-elevated hover:-translate-y-1"
  );
  
  if (href) {
    return (
      <Link to={href} className={cardClasses}>
        {content}
      </Link>
    );
  }
  
  if (onClick) {
    return (
      <button onClick={onClick} className={cn(cardClasses, "w-full text-left")}>
        {content}
      </button>
    );
  }
  
  return (
    <div className={cn(cardClasses, "hover:shadow-elevated")}>
      {content}
    </div>
  );
}
