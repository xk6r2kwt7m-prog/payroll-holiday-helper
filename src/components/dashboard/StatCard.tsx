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

const iconBgMap: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  accent: "bg-accent/10 text-accent",
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
    <div className="flex items-start gap-3">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBgMap[variant])}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none">
          {title}
        </p>
        <p className="text-xl font-bold tracking-tight tabular-nums text-foreground leading-none mt-1.5">
          <AnimatedValue value={value} />
        </p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground leading-none mt-1.5 truncate">{subtitle}</p>
        )}
        {trend && (
          <p className="text-[11px] mt-1.5 leading-none">
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
    "rounded-xl bg-card border border-border px-4 py-4 shadow-sm transition-all duration-200 group",
    isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
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
