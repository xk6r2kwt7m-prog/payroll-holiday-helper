import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

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
  index?: number;
}

const variantStyles = {
  default: "glass-card",
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

function AnimatedValue({ value, variant }: { value: string | number; variant: string }) {
  // Try to extract numeric value for animation
  const numericMatch = typeof value === "string" ? value.match(/^[£$]?([\d,.]+)/) : null;
  const numericValue = typeof value === "number" ? value : numericMatch ? parseFloat(numericMatch[1].replace(/,/g, "")) : null;
  const prefix = typeof value === "string" && numericMatch ? value.slice(0, value.indexOf(numericMatch[1])) : "";
  const suffix = typeof value === "string" && numericMatch ? value.slice(value.indexOf(numericMatch[1]) + numericMatch[1].length) : "";
  
  const animated = useAnimatedCounter(numericValue ?? 0);
  
  if (numericValue === null) {
    return <span>{value}</span>;
  }
  
  const formatted = numericValue >= 100
    ? Math.round(animated).toLocaleString()
    : animated.toFixed(animated % 1 === 0 && numericValue % 1 === 0 ? 0 : 1);
  
  return <span>{prefix}{formatted}{suffix}</span>;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  href,
  onClick,
  index = 0,
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
        <p className="text-3xl font-bold tracking-tight tabular-nums">
          <AnimatedValue value={value} variant={variant} />
        </p>
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
    "rounded-xl p-6 shadow-card transition-all duration-300 group",
    variantStyles[variant],
    isClickable && "cursor-pointer hover:shadow-elevated hover:-translate-y-1"
  );
  
  const wrapper = (children: ReactNode) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
  
  if (href) {
    return wrapper(
      <Link to={href} className={cardClasses}>
        {content}
      </Link>
    );
  }
  
  if (onClick) {
    return wrapper(
      <button onClick={onClick} className={cn(cardClasses, "w-full text-left")}>
        {content}
      </button>
    );
  }
  
  return wrapper(
    <div className={cn(cardClasses, "hover:shadow-elevated")}>
      {content}
    </div>
  );
}
