import { useState } from "react";
import { Trash2, UserCheck, UserMinus, X, Loader2 } from "lucide-react";
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
import { useUpdateEmployee, useDeleteEmployee, type Employee } from "@/hooks/useEmployees";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  selectedEmployees: Employee[];
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedEmployees, onClearSelection }: BulkActionsBarProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  
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
  
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(
        selectedEmployees.map(emp => deleteEmployee.mutateAsync(emp.id))
      );
      toast.success(`Deleted ${count} employees`);
      onClearSelection();
    } catch {
      toast.error("Failed to delete some employees");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };
  
  if (count === 0) return null;
  
  return (
    <>
      <div className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-4 py-3 rounded-xl",
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
          variant="destructive" 
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
          Delete
        </Button>
        
        <div className="h-4 w-px bg-border" />
        
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} employees?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected employees and their associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
