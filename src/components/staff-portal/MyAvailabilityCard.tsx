import { useMemo, useState } from "react";
import { ChevronDown, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEmployeeAvailability, useUpsertAvailability } from "@/hooks/useAvailability";
import { AvailabilityPicker } from "@/components/staff-portal/AvailabilityPicker";

type DaySlot = {
  day_of_week: number;
  is_available: boolean;
  available_from: string;
  available_to: string;
};

const DEFAULT_SLOTS: DaySlot[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  is_available: i >= 1 && i <= 5,
  available_from: "09:00",
  available_to: "22:00",
}));

export function MyAvailabilityCard({ employeeId }: { employeeId: string }) {
  const { data: saved = [] } = useEmployeeAvailability(employeeId);
  const upsert = useUpsertAvailability();

  // Build the 7-day state: saved days use saved values, unsaved days use the
  // same defaults as the onboarding form (Mon–Fri available, 09:00–22:00).
  const initialSlots = useMemo<DaySlot[]>(() => {
    return DEFAULT_SLOTS.map((d) => {
      const ex = saved.find((s) => s.day_of_week === d.day_of_week);
      if (!ex) return d;
      return {
        day_of_week: ex.day_of_week,
        is_available: ex.is_available,
        available_from: ex.available_from || "09:00",
        available_to: ex.available_to || "22:00",
      };
    });
  }, [saved]);

  const [slots, setSlots] = useState<DaySlot[]>(initialSlots);
  const [expanded, setExpanded] = useState(false);

  // Re-sync local state when saved data loads/changes.
  useMemo(() => {
    setSlots(initialSlots);
  }, [initialSlots]);

  const availableDays = slots.filter((s) => s.is_available).length;

  const hasChanges = useMemo(() => {
    return slots.some((s, i) => {
      const base = initialSlots[i];
      return (
        s.is_available !== base.is_available ||
        s.available_from !== base.available_from ||
        s.available_to !== base.available_to
      );
    });
  }, [slots, initialSlots]);

  const handleSave = () => {
    upsert.mutate({
      employeeId,
      slots: slots.map((s) => ({
        day_of_week: s.day_of_week,
        is_available: s.is_available,
        available_from: s.available_from,
        available_to: s.available_to,
      })),
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 active:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">My availability</p>
            <p className="text-xs text-muted-foreground">
              Available {availableDays} {availableDays === 1 ? "day" : "days"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground/60 shrink-0 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border">
          <AvailabilityPicker availability={slots} setAvailability={setSlots} />
          <Button
            onClick={handleSave}
            disabled={upsert.isPending || !hasChanges}
            className="w-full h-11 rounded-xl"
          >
            {upsert.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save availability
          </Button>
        </div>
      )}
    </div>
  );
}

import { Clock } from "lucide-react";
