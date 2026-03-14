import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployeeSkills, useAddSkill, useRemoveSkill, EmployeeSkill } from "@/hooks/useSkills";
import { Plus, X, Briefcase, Languages, Wrench } from "lucide-react";

interface Props {
  employeeId: string;
}

const SKILL_TYPES = [
  { value: "role", label: "Role", icon: Briefcase, color: "bg-primary/10 text-primary" },
  { value: "skill", label: "Skill", icon: Wrench, color: "bg-accent/10 text-accent" },
  { value: "language", label: "Language", icon: Languages, color: "bg-success/10 text-success" },
];

export function SkillsEditor({ employeeId }: Props) {
  const { data: skills = [] } = useEmployeeSkills(employeeId);
  const addSkill = useAddSkill();
  const removeSkill = useRemoveSkill();

  const [newType, setNewType] = useState("role");
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    if (!newValue.trim()) return;
    addSkill.mutate({
      employeeId,
      skillType: newType,
      skillValue: newValue.trim(),
    });
    setNewValue("");
  };

  const grouped = SKILL_TYPES.map((st) => ({
    ...st,
    items: skills.filter((s) => s.skill_type === st.value),
  }));

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.value}>
          <div className="flex items-center gap-1.5 mb-2">
            <group.icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{group.label}s</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((skill) => (
              <Badge
                key={skill.id}
                variant="secondary"
                className="text-xs gap-1 cursor-pointer hover:bg-destructive/10 transition-colors"
                onClick={() => removeSkill.mutate(skill.id)}
              >
                {skill.skill_value}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            {group.items.length === 0 && (
              <span className="text-[11px] text-muted-foreground italic">None added</span>
            )}
          </div>
        </div>
      ))}

      {/* Add new */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Select value={newType} onValueChange={setNewType}>
          <SelectTrigger className="h-9 rounded-lg w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SKILL_TYPES.map((st) => (
              <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Add..."
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="h-9 rounded-lg text-xs flex-1"
        />
        <Button size="sm" onClick={handleAdd} disabled={!newValue.trim()} className="h-9 rounded-lg">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
