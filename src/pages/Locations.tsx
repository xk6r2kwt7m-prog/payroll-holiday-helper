import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2, MapPin, ChevronRight, Settings2, Circle, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLocationSettings } from "@/hooks/useLocationSettings";
import { getBranchEmoji, useTenantBranches } from "@/hooks/useBranches";
import { LocationSettingsSheet } from "@/components/locations/LocationSettingsSheet";
import { useLocationPulse, PulseStatus, LocationPulse } from "@/hooks/useLocationPulse";
import type { LocationSettings as LocationSettingsType } from "@/hooks/useLocationSettings";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const statusColors: Record<PulseStatus, { dot: string; bg: string; text: string; border: string }> = {
  green: { dot: "bg-success", bg: "bg-success/10", text: "text-success", border: "border-success/30" },
  amber: { dot: "bg-warning", bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
  red: { dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
};

const statusLabel: Record<PulseStatus, string> = {
  green: "All Clear",
  amber: "Attention",
  red: "Urgent",
};

function PulseCard({ pulse, onSettings }: { pulse: LocationPulse; onSettings: () => void }) {
  const colors = statusColors[pulse.overallStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg bg-card border border-border/70 shadow-card overflow-hidden transition-shadow hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-lg shrink-0">
          {getBranchEmoji(pulse.branch, []) || "📍"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm tracking-tight">{pulse.branch}</h3>
            <Badge variant="outline" className={cn("text-[10px] font-medium", colors.text, colors.border)}>
              <Circle className={cn("h-1.5 w-1.5 mr-1 fill-current", colors.text)} />
              {statusLabel[pulse.overallStatus]}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            <Users className="h-3 w-3 inline mr-1" />{pulse.staffCount} active staff
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/60 hover:text-foreground shrink-0"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSettings(); }}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Sections */}
      <div className="divide-y divide-border/30">
        {pulse.sections.map((section) => {
          const hasIssues = section.items.some(i => i.count > 0 && i.status !== "green");
          const sectionColors = statusColors[section.overallStatus];

          return (
            <div key={section.title} className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
                {section.title}
              </p>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const itemColors = statusColors[item.status];
                  // Hide zero-count green items to reduce noise (except schedule)
                  if (item.count === 0 && item.status === "green" && !item.label.includes("scheduled") && !item.label.includes("payroll ready") && !item.label.includes("cut-off")) {
                    return (
                      <Link
                        key={item.label}
                        to={item.href}
                        className="flex items-center gap-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[32px]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        <span>No {item.label}</span>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      to={item.href}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-all min-h-[40px]",
                        item.status !== "green"
                          ? cn(itemColors.bg, "hover:opacity-80")
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", itemColors.dot)} />
                        <span className={cn(
                          "font-medium",
                          item.status !== "green" ? itemColors.text : "text-foreground"
                        )}>
                          {item.count > 0 ? `${item.count} ${item.label}` : item.label}
                        </span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: tap to open location dashboard */}
      <Link
        to={`/locations/${encodeURIComponent(pulse.branch)}`}
        className="flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-border/30 bg-muted/20 text-xs font-medium text-primary hover:bg-muted/40 transition-colors min-h-[44px]"
      >
        Open Location Dashboard
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
}

const Locations = () => {
  const { data: locations, isLoading: locLoading } = useLocationSettings();
  const { data: pulses, isLoading: pulseLoading } = useLocationPulse();
  const [selectedLocation, setSelectedLocation] = useState<LocationSettingsType | null>(null);

  const isLoading = locLoading || pulseLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Locations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multi-location command centre — monitor each site at a glance
          </p>
        </div>

        {/* Overall status summary */}
        {pulses && pulses.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {pulses.map((p) => {
              const colors = statusColors[p.overallStatus];
              return (
                <Link
                  key={p.branch}
                  to={`/locations/${encodeURIComponent(p.branch)}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm font-medium min-h-[44px]",
                    colors.border, colors.bg, colors.text,
                    "hover:opacity-80"
                  )}
                >
                  <span>{getBranchEmoji(p.branch, [])}</span>
                  <span>{p.branch}</span>
                  <Circle className={cn("h-2.5 w-2.5 fill-current", colors.text)} />
                </Link>
              );
            })}
          </div>
        )}

        {/* Location pulse cards */}
        <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {pulses?.map((pulse) => (
            <PulseCard
              key={pulse.branch}
              pulse={pulse}
              onSettings={() => {
                const loc = locations?.find(l => l.branch === pulse.branch);
                if (loc) setSelectedLocation(loc);
              }}
            />
          ))}
        </div>

        {(!pulses || pulses.length === 0) && (
          <div className="rounded-xl bg-card border border-border p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No locations yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-2">
              Locations represent your physical sites — restaurants, kitchens, or offices. Add your first location to enable scheduling, attendance tracking, and geofence-based clock-in.
            </p>
            <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto mb-5">
              Each location can have its own operating hours, staff assignments, and compliance rules.
            </p>
            <a href="/settings?group=workplaces&section=locations">
              <Button size="sm">
                <MapPin className="h-4 w-4 mr-1.5" />
                Add First Location
              </Button>
            </a>
          </div>
        )}
      </div>

      {selectedLocation && (
        <LocationSettingsSheet
          location={selectedLocation}
          open={!!selectedLocation}
          onOpenChange={(open) => !open && setSelectedLocation(null)}
        />
      )}
    </AppLayout>
  );
};

export default Locations;
