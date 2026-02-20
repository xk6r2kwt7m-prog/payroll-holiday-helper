import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2, MapPin, ChevronRight } from "lucide-react";
import { useLocationSettings } from "@/hooks/useLocationSettings";
import { BRANCH_EMOJI } from "@/hooks/useBranches";
import { LocationSettingsSheet } from "@/components/locations/LocationSettingsSheet";
import type { LocationSettings } from "@/hooks/useLocationSettings";

const Locations = () => {
  const { data: locations, isLoading } = useLocationSettings();
  const [selectedLocation, setSelectedLocation] = useState<LocationSettings | null>(null);

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
      <div className="max-w-3xl space-y-6">
        <div className="animate-slide-in-left">
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
          <p className="text-muted-foreground">
            Manage branch settings, operating hours, and clock-in rules
          </p>
        </div>

        <div className="space-y-3">
          {locations?.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc)}
              className="w-full rounded-xl bg-card shadow-card p-5 flex items-center gap-4 hover:shadow-elevated transition-shadow text-left animate-fade-in"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl flex-shrink-0">
                {BRANCH_EMOJI[loc.branch as keyof typeof BRANCH_EMOJI] || "📍"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-card-foreground">{loc.display_name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {loc.address || "No address set"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Edit Settings</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
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
