import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  UserPlus,
  UserX,
  Megaphone,
  DollarSign,
  Calendar,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  { icon: Search, label: "Search", action: "search", color: "bg-primary text-primary-foreground" },
  { icon: UserPlus, label: "Add Employee", path: "/employees?action=add", color: "bg-success text-success-foreground" },
  { icon: UserX, label: "Record Absence", path: "/absences?action=add", color: "bg-destructive text-destructive-foreground" },
  { icon: Calendar, label: "Holidays", path: "/holidays", color: "bg-accent text-accent-foreground" },
  { icon: Megaphone, label: "Announcement", path: "/announcements?action=add", color: "bg-warning text-warning-foreground" },
  { icon: DollarSign, label: "Payroll", path: "/payroll", color: "bg-primary text-primary-foreground" },
];

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (action: typeof quickActions[0]) => {
    setIsOpen(false);
    if (action.action === "search") {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    } else if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action items */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-24 right-4 z-50 flex flex-col-reverse items-end gap-3">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
                onClick={() => handleAction(action)}
                className="flex items-center gap-3 min-h-[48px]"
              >
                <span className="bg-card text-foreground text-sm font-medium px-3 py-2 rounded-lg shadow-md border border-border whitespace-nowrap">
                  {action.label}
                </span>
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-full shadow-lg", action.color)}>
                  <action.icon className="h-5 w-5" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors",
          isOpen
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        )}
        whileTap={{ scale: 0.9 }}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.15 }}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </motion.div>
      </motion.button>
    </>
  );
}
