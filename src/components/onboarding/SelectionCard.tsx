import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface SelectionCardProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  selected?: boolean;
  onClick: () => void;
  className?: string;
}

export function SelectionCard({
  icon,
  emoji,
  title,
  description,
  selected,
  onClick,
  className,
}: SelectionCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "relative w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all min-h-[64px]",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/30 hover:shadow-sm",
        className
      )}
    >
      {(icon || emoji) && (
        <div
          className={cn(
            "flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-xl text-lg",
            selected ? "bg-primary/10" : "bg-muted"
          )}
        >
          {emoji ? <span className="text-xl">{emoji}</span> : icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-sm", selected ? "text-primary" : "text-card-foreground")}>
          {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex-shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center"
        >
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        </motion.div>
      )}
    </motion.button>
  );
}
