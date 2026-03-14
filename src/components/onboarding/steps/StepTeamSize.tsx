import { SelectionCard } from "../SelectionCard";

interface StepTeamSizeProps {
  teamSize: string;
  onChange: (value: string) => void;
}

const TEAM_SIZES = [
  { value: "just_me", emoji: "👤", title: "Just me", description: "Setting up for yourself" },
  { value: "2-10", emoji: "👥", title: "Small team (2–10)", description: "A tight-knit crew" },
  { value: "11-25", emoji: "👨‍👩‍👧‍👦", title: "Growing team (11–25)", description: "Scaling up operations" },
  { value: "26-50", emoji: "🏬", title: "Larger team (26–50)", description: "Multi-department setup" },
  { value: "50+", emoji: "🏢", title: "50+ employees", description: "Enterprise-level workforce" },
];

export function StepTeamSize({ teamSize, onChange }: StepTeamSizeProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">How big is your team?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This helps us configure the right defaults.
        </p>
      </div>

      <div className="space-y-3">
        {TEAM_SIZES.map((size) => (
          <SelectionCard
            key={size.value}
            emoji={size.emoji}
            title={size.title}
            description={size.description}
            selected={teamSize === size.value}
            onClick={() => onChange(size.value)}
          />
        ))}
      </div>
    </div>
  );
}
