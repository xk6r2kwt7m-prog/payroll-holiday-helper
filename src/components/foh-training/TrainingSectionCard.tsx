import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CircleAlert, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { TrainingSection } from "@/data/foh-training/allergyTraining";
import type { UpsellingSection } from "@/data/foh-training/upsellingTraining";

interface Props {
  section: TrainingSection | UpsellingSection;
  index: number;
}

const TrainingSectionCard = ({ section, index }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = section.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left group"
      >
        <div
          className={`flex items-center gap-4 p-4 md:p-5 rounded-xl transition-colors duration-200 border ${
            section.highlight
              ? "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
              : "bg-card hover:bg-secondary/60 border-border/50"
          }`}
        >
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              section.highlight ? "bg-destructive/10" : "bg-primary/10"
            }`}
          >
            <Icon className={`w-5 h-5 ${section.highlight ? "text-destructive" : "text-primary"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-muted-foreground">
              SECTION {section.id}
            </span>
            <h3 className="text-lg font-semibold text-foreground">
              {section.title}
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
              {section.content.map((text, i) => (
                <p key={i} className="text-sm text-foreground/90 leading-relaxed">
                  {text}
                </p>
              ))}
              {section.listItems?.map((item, i) => {
                const [bold, ...rest] = item.split(" — ");
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3 items-start"
                  >
                    {section.highlight ? (
                      <CircleAlert className="w-4 h-4 text-destructive mt-1 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-success mt-1 flex-shrink-0" />
                    )}
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      <span className="font-semibold">{bold}</span>
                      {rest.length > 0 && ` — ${rest.join(" — ")}`}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TrainingSectionCard;
