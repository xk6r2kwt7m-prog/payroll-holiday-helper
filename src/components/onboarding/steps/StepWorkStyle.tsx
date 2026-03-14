import { SelectionCard } from "../SelectionCard";

interface StepWorkStyleProps {
  workStyle: string;
  onChange: (value: string) => void;
}

const WORK_STYLES = [
  {
    value: "shift_based",
    emoji: "⏰",
    title: "Shift-based teams",
    description: "Rotas, rotating shifts, early/late patterns",
  },
  {
    value: "office_hours",
    emoji: "🏢",
    title: "Office hours teams",
    description: "Fixed 9-to-5 or standard business hours",
  },
  {
    value: "field_workers",
    emoji: "🚚",
    title: "Field workers",
    description: "Mobile teams, deliveries, on-site visits",
  },
  {
    value: "mixed",
    emoji: "🔀",
    title: "Mixed work styles",
    description: "A combination of the above",
  },
];

export function StepWorkStyle({ workStyle, onChange }: StepWorkStyleProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">How does your team operate?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This helps us set up the right tools for you.
        </p>
      </div>

      <div className="space-y-3">
        {WORK_STYLES.map((style) => (
          <SelectionCard
            key={style.value}
            emoji={style.emoji}
            title={style.title}
            description={style.description}
            selected={workStyle === style.value}
            onClick={() => onChange(style.value)}
          />
        ))}
      </div>
    </div>
  );
}
