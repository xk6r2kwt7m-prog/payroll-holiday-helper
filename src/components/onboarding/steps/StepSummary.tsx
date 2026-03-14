import { Check, MapPin, Users, CreditCard, Building2 } from "lucide-react";
import { motion } from "framer-motion";

interface StepSummaryProps {
  workspaceName: string;
  workplaceName: string;
  teamSize: string;
  payRhythm: string;
  workStyle: string;
}

const TEAM_LABELS: Record<string, string> = {
  just_me: "Solo",
  "2-10": "2–10 people",
  "11-25": "11–25 people",
  "26-50": "26–50 people",
  "50+": "50+ people",
};

const PAY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every two weeks",
  monthly: "Monthly",
  not_sure: "To be decided",
};

const STYLE_LABELS: Record<string, string> = {
  shift_based: "Shift-based",
  office_hours: "Office hours",
  field_workers: "Field workers",
  mixed: "Mixed styles",
};

export function StepSummary({ workspaceName, workplaceName, teamSize, payRhythm, workStyle }: StepSummaryProps) {
  const items = [
    { icon: Building2, label: "Workspace", value: workspaceName || "—" },
    { icon: MapPin, label: "Workplace", value: workplaceName || "Not set" },
    { icon: Users, label: "Team size", value: TEAM_LABELS[teamSize] || "—" },
    { icon: CreditCard, label: "Pay rhythm", value: PAY_LABELS[payRhythm] || "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, delay: 0.1 }}
          className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
        >
          <Check className="h-8 w-8 text-primary" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground">Your workspace is ready</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Here's a summary of your setup.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="flex items-center gap-3 px-4 py-3.5"
          >
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
              <p className="text-sm font-medium text-card-foreground truncate">{item.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
