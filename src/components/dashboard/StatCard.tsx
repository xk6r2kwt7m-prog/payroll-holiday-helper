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

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  accent: "bg-accent/12 text-accent",
};

function AnimatedValue({ value }: { value: string | number }) {
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconStyles[variant],
            isClickable && "group-hover:scale-110 transition-transform"
          )}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground leading-none">
          <AnimatedValue value={value} />
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs">
          <span
            className={cn(
              "font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}
          >
            {trend.isPositive ? "+" : ""}{trend.value}%
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  );

  const cardClasses = cn(
    "rounded-xl bg-card border border-border p-4 shadow-card transition-all duration-200 group",
    isClickable && "cursor-pointer hover:shadow-elevated hover:-translate-y-0.5 active:translate-y-0"
  );

  const wrapper = (children: ReactNode) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );

  if (href) {
    return wrapper(<Link to={href} className={cardClasses}>{content}</Link>);
  }

  if (onClick) {
    return wrapper(<button onClick={onClick} className={cn(cardClasses, "w-full text-left")}>{content}</button>);
  }

  return wrapper(<div className={cardClasses}>{content}</div>);
}
