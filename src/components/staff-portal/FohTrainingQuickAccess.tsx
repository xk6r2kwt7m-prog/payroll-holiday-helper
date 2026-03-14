import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SmilePlus, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const fohModules = [
  {
    title: "Service Steps",
    description: "8-step guest service guide",
    path: "/foh/service",
    icon: SmilePlus,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    title: "Allergy Safety",
    description: "Critical allergen protocols",
    path: "/foh/allergy",
    icon: ShieldAlert,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    title: "Upselling & Comfort",
    description: "Guest experience skills",
    path: "/foh/upselling",
    icon: Sparkles,
    color: "text-accent",
    bg: "bg-accent/10",
  },
];

interface FohTrainingQuickAccessProps {
  department?: string;
}

export function FohTrainingQuickAccess({ department }: FohTrainingQuickAccessProps) {
  // Only show for FOH staff or when department is not set
  if (department && department !== "FOH") return null;

  return (
    <motion.div {...anim} transition={{ duration: 0.25, delay: 0.08 }}>
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          FOH Training Guides
        </h3>
        <div className="space-y-1.5">
          {fohModules.map((mod) => (
            <Link
              key={mod.path}
              to={mod.path}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm",
                "transition-all active:bg-muted hover:border-primary/20"
              )}
            >
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", mod.bg)}>
                <mod.icon className={cn("h-4.5 w-4.5", mod.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                <p className="text-[11px] text-muted-foreground">{mod.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
