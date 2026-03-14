import { SelectionCard } from "../SelectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, Wifi } from "lucide-react";

interface StepWorkplaceProps {
  workplaceType: string;
  workplaceName: string;
  workplaceAddress: string;
  onChange: (field: string, value: string) => void;
}

const WORKPLACE_OPTIONS = [
  {
    value: "single",
    emoji: "🏢",
    title: "Single workplace",
    description: "One location where your team works",
  },
  {
    value: "multiple",
    emoji: "📍",
    title: "Multiple locations",
    description: "Your team works across different sites",
  },
  {
    value: "remote",
    emoji: "🌐",
    title: "Remote or mixed teams",
    description: "A blend of in-person and remote work",
  },
];

export function StepWorkplace({ workplaceType, workplaceName, workplaceAddress, onChange }: StepWorkplaceProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Where does your team work?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You can always add more locations later.
        </p>
      </div>

      <div className="space-y-3">
        {WORKPLACE_OPTIONS.map((opt) => (
          <SelectionCard
            key={opt.value}
            emoji={opt.emoji}
            title={opt.title}
            description={opt.description}
            selected={workplaceType === opt.value}
            onClick={() => onChange("workplaceType", opt.value)}
          />
        ))}
      </div>

      {(workplaceType === "single" || workplaceType === "multiple") && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {workplaceType === "multiple" ? "First workplace name" : "Workplace name"}
            </Label>
            <Input
              placeholder="e.g. Main Kitchen, Downtown Branch"
              value={workplaceName}
              onChange={(e) => onChange("workplaceName", e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Address (optional)</Label>
            <Input
              placeholder="Street address"
              value={workplaceAddress}
              onChange={(e) => onChange("workplaceAddress", e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
