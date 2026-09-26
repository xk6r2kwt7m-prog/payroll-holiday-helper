import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LocationMapPreviewProps {
  lat?: number | null;
  lng?: number | null;
  label: string;
  withinGeofence?: boolean | null;
  /** Show coordinate detail inline (default: false — shows a detail button) */
  showInlineMap?: boolean;
}

function PrivateLocationDetail({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/50 rounded">
      <MapPin className="h-3 w-3" />
      <span>{label} coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
    </div>
  );
}

export function LocationMapPreview({ lat, lng, label, withinGeofence, showInlineMap = false }: LocationMapPreviewProps) {
  const [showModal, setShowModal] = useState(false);
  const hasLocation = lat != null && lng != null;

  if (!hasLocation) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
        <MapPin className="h-3 w-3" />
        No location data for {label.toLowerCase()}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{label}</span>
          {withinGeofence != null && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                withinGeofence
                  ? "text-success border-success/30"
                  : "text-destructive border-destructive/30"
              )}
            >
              {withinGeofence ? "In geofence" : "Outside geofence"}
            </Badge>
          )}
        </div>

        {showInlineMap && <PrivateLocationDetail lat={lat} lng={lng} label={label} />}

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 w-full p-2 bg-muted/50 rounded text-xs text-primary hover:bg-muted transition-colors text-left"
        >
          <Navigation className="h-3 w-3 flex-shrink-0" />
          <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          <span className="text-muted-foreground ml-auto">View details →</span>
        </button>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {label} Location
              {withinGeofence != null && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] ml-auto",
                    withinGeofence
                      ? "text-success border-success/30"
                      : "text-destructive border-destructive/30"
                  )}
                >
                  {withinGeofence ? "In geofence" : "Outside geofence"}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">Recorded location for manager review.</DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-2">
            <PrivateLocationDetail lat={lat} lng={lng} label={label} />
          </div>
          <div className="px-4 pb-4 text-xs text-muted-foreground">
            <span>Exact coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}</span>
            <p className="mt-1">Coordinates are shown here without opening a map provider.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Compact dual-location display for clock-in and clock-out */
export function ClockEventLocations({
  clockInLat,
  clockInLng,
  clockInGeofence,
  clockOutLat,
  clockOutLng,
  clockOutGeofence,
  showInlineMap = false,
}: {
  clockInLat?: number | null;
  clockInLng?: number | null;
  clockInGeofence?: boolean | null;
  clockOutLat?: number | null;
  clockOutLng?: number | null;
  clockOutGeofence?: boolean | null;
  showInlineMap?: boolean;
}) {
  return (
    <div className="space-y-2">
      <LocationMapPreview
        lat={clockInLat}
        lng={clockInLng}
        label="Clock-in"
        withinGeofence={clockInGeofence}
        showInlineMap={showInlineMap}
      />
      <LocationMapPreview
        lat={clockOutLat}
        lng={clockOutLng}
        label="Clock-out"
        withinGeofence={clockOutGeofence}
        showInlineMap={showInlineMap}
      />
    </div>
  );
}
