import { useState } from "react";
import { Archive, UserCheck, UserMinus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUpdateEmployee, useArchiveEmployee, type Employee } from "@/hooks/useEmployees";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  selectedEmployees: Employee[];
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedEmployees, onClearSelection }: BulkActionsBarProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  const updateEmployee = useUpdateEmployee();
  const archiveEmployee = useArchiveEmployee();
  
  const count = selectedEmployees.length;
  
  const handleBulkStatusChange = async (status: "active" | "leaver" | "starter") => {
    setIsUpdating(true);
    try {
      await Promise.all(
        selectedEmployees.map(emp => 
          updateEmployee.mutateAsync({ id: emp.id, updates: { status } })
        )
      );
      toast.success(`Updated ${count} employees to ${status}`);
      onClearSelection();
    } catch {
      toast.error("Failed to update some employees");
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleBulkArchive = async () => {
    setIsArchiving(true);
    try {
      await Promise.all(
        selectedEmployees.map(emp => archiveEmployee.mutateAsync(emp.id))
      );
      toast.success(`Archived ${count} employees`);
      onClearSelection();
    } catch {
      toast.error("Failed to archive some employees");
    } finally {
      setIsArchiving(false);
      setShowArchiveDialog(false);
    }
  };
  
  if (count === 0) return null;
  
  return (
    <>
      <div className={cn(
        "fixed bottom-20 md:bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50",
        "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-xl",
        "bg-card border border-border shadow-elevated",
        "animate-slide-in-bottom"
      )}>
        <span className="text-sm font-medium text-card-foreground">
          {count} selected
        </span>
        
        <div className="h-4 w-px bg-border" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
              Change Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleBulkStatusChange("active")}>
              ✅ Set as Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkStatusChange("starter")}>
              🆕 Set as Starter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkStatusChange("leaver")}>
              👋 Set as Leaver
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowArchiveDialog(true)}
          disabled={isArchiving}
        >
          {isArchiving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
          Archive
        </Button>
        
        <div className="h-4 w-px bg-border" />
        
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {count} employees?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived employees will be hidden from active views but all their records
              (timesheets, payroll, documents, etc.) will be preserved for compliance and audit purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkArchive}
            >
              {isArchiving ? "Archiving..." : "Archive All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
