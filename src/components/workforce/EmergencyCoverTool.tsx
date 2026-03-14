import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, MapPin, CheckCircle, XCircle, UserPlus, Loader2 } from "lucide-react";
import { useBranchLocations, useCreateShift } from "@/hooks/useSchedule";
import { useFindCover } from "@/hooks/useFindCover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  trigger?: React.ReactNode;
}

export function EmergencyCoverTool({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const { data: locations = [] } = useBranchLocations();
  const createShift = useCreateShift();

  const [branch, setBranch] = useState("");
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [role, setRole] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  const { candidates } = useFindCover({ branch, shiftDate, startTime, endTime, role: role || undefined });

  // Only show top candidates who are both available and free
  const topCandidates = candidates.filter((c) => c.isAvailableForSlot && c.isNotScheduled).slice(0, 8);

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
        is_published: true,
      });
      toast.success("Emergency cover assigned & published");
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
          <Button variant="destructive" size="sm">
            <AlertTriangle className="h-4 w-4 mr-1.5" /> Emergency Cover
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Emergency Cover
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Where?" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.branch}>{l.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
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
              <Input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-xs font-medium text-card-foreground mb-3">
              {branch ? `${topCandidates.length} available now` : "Select location to find staff"}
            </p>

            <div className="space-y-2">
              {topCandidates.map((c) => (
                <div key={c.employee.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {c.employee.forename[0]}{c.employee.surname[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">
                      {c.employee.forename} {c.employee.surname}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {c.primaryBranch}
                      </span>
                      {c.roles.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] py-0">{c.roles[0]}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={assigning === c.employee.id}
                    onClick={() => handleAssign(c.employee.id, c.employee.department)}
                    className="h-10 rounded-xl px-4"
                  >
                    {assigning === c.employee.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><UserPlus className="h-4 w-4 mr-1" /> Assign</>
                    )}
                  </Button>
                </div>
              ))}

              {branch && topCandidates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No available staff. Try changing the role or time.
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
