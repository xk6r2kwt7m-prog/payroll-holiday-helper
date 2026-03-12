import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtectedBadgeProps {
  label?: string;
  className?: string;
}

export function ProtectedBadge({ label = "Protected", className }: ProtectedBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
      "bg-destructive/5 text-destructive border border-destructive/10",
      className
    )}>
      <ShieldCheck className="h-3 w-3" />
      {label}
    </span>
  );
}
