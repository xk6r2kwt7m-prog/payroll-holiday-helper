import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, MapPin, CheckCircle, XCircle, Clock, UserPlus, Loader2 } from "lucide-react";
import { useBranchLocations, useCreateShift } from "@/hooks/useSchedule";
import { useFindCover } from "@/hooks/useFindCover";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { cn } from "@/lib/utils";

interface Props {
  trigger?: React.ReactNode;
  preselectedBranch?: string;
  preselectedDate?: string;
  preselectedStart?: string;
  preselectedEnd?: string;
}

export function FindCoverSheet({ trigger, preselectedBranch, preselectedDate, preselectedStart, preselectedEnd }: Props) {
  const [open, setOpen] = useState(false);
  const { data: locations = [] } = useBranchLocations();
  const createShift = useCreateShift();
  const { tenantId } = useTenant();

  const [branch, setBranch] = useState(preselectedBranch || "");
  const [shiftDate, setShiftDate] = useState(preselectedDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(preselectedStart || "09:00");
  const [endTime, setEndTime] = useState(preselectedEnd || "17:00");
  const [role, setRole] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  const { candidates } = useFindCover({ branch, shiftDate, startTime, endTime, role: role || undefined });

  const handleAssign = async (employeeId: string, department: string) => {
    setAssigning(employeeId);
    try {
      await createShift.mutateAsync({
        employee_id: employeeId,
        branch: branch as any,
        department: department as any,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        status: "scheduled" as any,
        is_published: false,
      });
      toast.success("Shift assigned successfully");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-1.5" /> Find Cover
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" /> Find Shift Cover
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.branch}>{l.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role (optional)</Label>
              <Input
                placeholder="e.g. Server"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Results */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">
              {branch ? `${candidates.length} available staff` : "Select a location to search"}
            </p>

            <div className="space-y-2">
              {candidates.map((c) => (
                <div
                  key={c.employee.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {c.employee.forename[0]}{c.employee.surname[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">
                      {c.employee.forename} {c.employee.surname}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {c.primaryBranch || "—"}
                      </span>
                      {c.roles.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {c.roles[0]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("flex items-center gap-0.5 text-[10px]", c.isAvailableForSlot ? "text-success" : "text-destructive")}>
                        {c.isAvailableForSlot ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {c.isAvailableForSlot ? "Available" : "Unavailable"}
                      </span>
                      <span className={cn("flex items-center gap-0.5 text-[10px]", c.isNotScheduled ? "text-success" : "text-destructive")}>
                        {c.isNotScheduled ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {c.isNotScheduled ? "Free" : "Conflict"}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={!c.isNotScheduled || assigning === c.employee.id}
                    onClick={() => handleAssign(c.employee.id, c.employee.department)}
                    className="h-9 rounded-lg text-xs"
                  >
                    {assigning === c.employee.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <><UserPlus className="h-3.5 w-3.5 mr-1" /> Assign</>
                    )}
                  </Button>
                </div>
              ))}

              {branch && candidates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No available staff found for this shift.
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
