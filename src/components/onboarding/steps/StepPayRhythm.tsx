import { SelectionCard } from "../SelectionCard";
import { Label } from "@/components/ui/label";

interface StepPayRhythmProps {
  payRhythm: string;
  payDay: string;
  onChange: (field: string, value: string) => void;
}

const PAY_OPTIONS = [
  { value: "weekly", emoji: "📅", title: "Weekly", description: "Paid every week" },
  { value: "biweekly", emoji: "📆", title: "Every two weeks", description: "Paid fortnightly" },
  { value: "monthly", emoji: "🗓️", title: "Monthly", description: "Paid once a month" },
  { value: "not_sure", emoji: "🤷", title: "Not sure yet", description: "Decide later" },
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function StepPayRhythm({ payRhythm, payDay, onChange }: StepPayRhythmProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Pay rhythm</h2>
        <p className="text-sm text-muted-foreground mt-1">
          How does your business pay employees?
        </p>
      </div>

      <div className="space-y-3">
        {PAY_OPTIONS.map((opt) => (
          <SelectionCard
            key={opt.value}
            emoji={opt.emoji}
            title={opt.title}
            description={opt.description}
            selected={payRhythm === opt.value}
            onClick={() => onChange("payRhythm", opt.value)}
          />
        ))}
      </div>

      {(payRhythm === "weekly" || payRhythm === "biweekly") && (
        <div className="space-y-2 pt-3 border-t border-border">
          <Label className="text-xs font-medium text-muted-foreground">
            What day do you close payroll?
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                onClick={() => onChange("payDay", day)}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  payDay === day
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
