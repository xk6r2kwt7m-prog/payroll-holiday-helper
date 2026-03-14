import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRightLeft, Calendar, MapPin, Loader2 } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useAllEmployeeBranches } from "@/hooks/useBranches";
import { useBranchLocations } from "@/hooks/useSchedule";
import { useCreateTransfer } from "@/hooks/useTransfers";

interface Props {
  trigger?: React.ReactNode;
  preselectedEmployee?: string;
}

export function StaffTransferDialog({ trigger, preselectedEmployee }: Props) {
  const [open, setOpen] = useState(false);
  const { data: employees = [] } = useEmployees();
  const { data: allBranches = [] } = useAllEmployeeBranches();
  const { data: locations = [] } = useBranchLocations();
  const createTransfer = useCreateTransfer();

  const [employeeId, setEmployeeId] = useState(preselectedEmployee || "");
  const [toBranch, setToBranch] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [isTemporary, setIsTemporary] = useState(false);
  const [reason, setReason] = useState("");

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const empBranches = allBranches.filter((b) => b.employee_id === employeeId);
  const primaryBranch = empBranches.find((b) => b.is_primary)?.branch || empBranches[0]?.branch || "";

  const handleSubmit = async () => {
    if (!employeeId || !toBranch || !transferDate) return;
    await createTransfer.mutateAsync({
      employeeId,
      fromBranch: primaryBranch,
      toBranch,
      transferDate,
      endDate: isTemporary ? endDate : undefined,
      isTemporary,
      reason,
    });
    setOpen(false);
    setEmployeeId("");
    setToBranch("");
    setReason("");
    setIsTemporary(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" /> Transfer Employee
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Employee */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter((e) => e.status === "active")
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.forename} {e.surname}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployee && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {selectedEmployee.forename[0]}{selectedEmployee.surname[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-card-foreground">
                  {selectedEmployee.forename} {selectedEmployee.surname}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {primaryBranch || "No primary branch"}
                </div>
              </div>
            </div>
          )}

          {/* Destination */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Transfer to</Label>
            <Select value={toBranch} onValueChange={setToBranch}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select workplace..." />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((l) => l.branch !== primaryBranch)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.branch}>
                      {l.display_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start date</Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 flex flex-col justify-between">
              <Label className="text-xs text-muted-foreground">Temporary?</Label>
              <div className="flex items-center gap-2 h-12 px-3 rounded-xl border border-input bg-background">
                <Switch checked={isTemporary} onCheckedChange={setIsTemporary} />
                <span className="text-sm text-muted-foreground">{isTemporary ? "Yes" : "Permanent"}</span>
              </div>
            </div>
          </div>

          {isTemporary && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Reason (optional)</Label>
            <Input
              placeholder="e.g. Cover for sickness"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!employeeId || !toBranch || createTransfer.isPending}
            className="w-full h-12 rounded-xl text-sm font-semibold"
          >
            {createTransfer.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Transferring...</>
            ) : (
              <><ArrowRightLeft className="h-4 w-4 mr-2" /> Confirm Transfer</>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
