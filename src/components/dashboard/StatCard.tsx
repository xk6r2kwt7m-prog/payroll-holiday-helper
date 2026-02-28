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

const accentBar: Record<string, string> = {
  default: "bg-muted-foreground/30",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  accent: "bg-accent",
};

const iconBg: Record<string, string> = {
  default: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  accent: "text-accent",
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
    <div className="flex items-center gap-3">
      {/* Accent bar */}
      <div className={cn("w-1 self-stretch rounded-full shrink-0", accentBar[variant])} />
      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
            {title}
          </p>
          <span className={cn("shrink-0", iconBg[variant])}>
            {icon}
          </span>
        </div>
        <p className="text-xl font-bold tracking-tight tabular-nums text-foreground leading-tight mt-0.5">
          <AnimatedValue value={value} />
        </p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{subtitle}</p>
        )}
        {trend && (
          <p className="text-[11px] mt-0.5">
            <span className={cn("font-medium", trend.isPositive ? "text-success" : "text-destructive")}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">vs last</span>
          </p>
        )}
      </div>
    </div>
  );

  const cardClasses = cn(
    "rounded-xl bg-card border border-border px-3 py-3 shadow-card transition-all duration-200 group h-full",
    isClickable && "cursor-pointer hover:shadow-elevated hover:-translate-y-0.5 active:translate-y-0"
  );

  const wrapper = (children: ReactNode) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );

  if (href) return wrapper(<Link to={href} className={cardClasses}>{content}</Link>);
  if (onClick) return wrapper(<button onClick={onClick} className={cn(cardClasses, "w-full text-left")}>{content}</button>);
  return wrapper(<div className={cardClasses}>{content}</div>);
}
