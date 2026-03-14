import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmployeeAvailability, useUpsertAvailability, DAY_NAMES } from "@/hooks/useAvailability";
import { Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  employeeId: string;
}

interface DaySlot {
  day_of_week: number;
  is_available: boolean;
  available_from: string;
  available_to: string;
  notes: string;
}

export function AvailabilityEditor({ employeeId }: Props) {
  const { data: existing = [] } = useEmployeeAvailability(employeeId);
  const upsert = useUpsertAvailability();

  const [slots, setSlots] = useState<DaySlot[]>(() =>
    DAY_NAMES.map((_, i) => {
      const ex = existing.find((e) => e.day_of_week === i);
      return {
        day_of_week: i,
        is_available: ex?.is_available ?? true,
        available_from: ex?.available_from || "09:00",
        available_to: ex?.available_to || "23:00",
        notes: ex?.notes || "",
      };
    })
  );

  const updateSlot = (idx: number, field: keyof DaySlot, value: any) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const handleSave = () => {
    upsert.mutate({
      employeeId,
      slots: slots.map((s) => ({
        day_of_week: s.day_of_week,
        is_available: s.is_available,
        available_from: s.is_available ? s.available_from : undefined,
        available_to: s.is_available ? s.available_to : undefined,
        notes: s.notes || undefined,
      })),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-card-foreground">Weekly Availability</h4>
      </div>

      {slots.map((slot, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-colors",
            slot.is_available ? "border-border bg-card" : "border-border bg-muted/50"
          )}
        >
          <div className="w-12 text-xs font-medium text-muted-foreground">{DAY_NAMES[i].slice(0, 3)}</div>
          <Switch
            checked={slot.is_available}
            onCheckedChange={(v) => updateSlot(i, "is_available", v)}
          />
          {slot.is_available && (
            <div className="flex items-center gap-1.5 flex-1">
              <Input
                type="time"
                value={slot.available_from}
                onChange={(e) => updateSlot(i, "available_from", e.target.value)}
                className="h-8 rounded-lg text-xs w-20"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="time"
                value={slot.available_to}
                onChange={(e) => updateSlot(i, "available_to", e.target.value)}
                className="h-8 rounded-lg text-xs w-20"
              />
            </div>
          )}
          {!slot.is_available && (
            <span className="text-xs text-muted-foreground">Unavailable</span>
          )}
        </div>
      ))}

      <Button
        onClick={handleSave}
        disabled={upsert.isPending}
        className="w-full h-11 rounded-xl"
      >
        {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Availability
      </Button>
    </div>
  );
}
