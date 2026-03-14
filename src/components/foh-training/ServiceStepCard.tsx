import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertTriangle, Lightbulb as TipIcon, Check } from "lucide-react";
import { useState } from "react";
import type { ServiceStep } from "@/data/foh-training/serviceSteps";

interface Props {
  step: ServiceStep;
  index: number;
}

const ServiceStepCard = ({ step, index }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="relative"
    >
      {index < 7 && (
        <div className="absolute left-6 top-[4.5rem] w-0.5 h-8 bg-border hidden md:block" />
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left group"
      >
        <div className="flex items-center gap-4 p-4 md:p-5 rounded-xl bg-card hover:bg-secondary/60 transition-colors duration-200 border border-border/50">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                STEP {step.id}
              </span>
              {step.timing && (
                <span className="text-xs text-accent hidden sm:inline">
                  • {step.timing}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {step.title}
            </h3>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pl-6 md:pl-20 pr-4 py-4 space-y-3">
              {step.substeps.map((sub, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3 items-start"
                >
                  <Check className="w-4 h-4 text-success mt-1 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {sub.text}
                    </p>
                    {sub.allergenNote && (
                      <div className="flex items-center gap-1.5 text-xs text-accent font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Allergen awareness required
                      </div>
                    )}
                    {sub.tip && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                        <TipIcon className="w-3 h-3" />
                        {sub.tip}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ServiceStepCard;
