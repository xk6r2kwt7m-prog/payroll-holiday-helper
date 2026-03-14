import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, UserPlus, Info } from "lucide-react";

interface TeamMember {
  name: string;
  contact: string;
}

interface StepInviteProps {
  members: TeamMember[];
  onChange: (members: TeamMember[]) => void;
}

export function StepInvite({ members, onChange }: StepInviteProps) {
  const addMember = () => onChange([...members, { name: "", contact: "" }]);
  const removeMember = (i: number) => onChange(members.filter((_, idx) => idx !== i));
  const updateMember = (i: number, field: keyof TeamMember, value: string) => {
    const updated = [...members];
    updated[i] = { ...updated[i], [field]: value };
    onChange(updated);
  };

  const hasAnyInput = members.some((m) => m.name.trim() || m.contact.trim());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Invite your team</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add a manager or key team member now, or skip this and invite people later from the People section.
        </p>
      </div>

      <div className="space-y-4">
        {members.map((member, i) => (
          <div key={i} className="relative space-y-2 rounded-xl border border-border p-4 bg-card">
            {members.length > 1 && (
              <button
                onClick={() => removeMember(i)}
                className="absolute top-3 right-3 h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            <Input
              placeholder="Full name"
              value={member.name}
              onChange={(e) => updateMember(i, "name", e.target.value)}
              className="h-11 rounded-xl"
            />
            <Input
              placeholder="Email address"
              value={member.contact}
              onChange={(e) => updateMember(i, "contact", e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full h-11 rounded-xl border-dashed"
        onClick={addMember}
      >
        <Plus className="h-4 w-4 mr-2" /> Add another person
      </Button>

      {/* Skip reassurance */}
      {!hasAnyInput && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/50 border border-border/50">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">No pressure.</span>{" "}
            You can add employees at any time from People → Add Employee. Most admins set up their workspace first, then invite the team.
          </p>
        </div>
      )}
    </div>
  );
}
