import { AlertTriangle, Archive, Loader2, ShieldAlert } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useEmployeeDependencies, type Employee } from "@/hooks/useEmployees";

interface EmployeeDeleteDialogProps {
  employee: Employee | null;
  onClose: () => void;
  onConfirmDelete: () => void;
  onArchiveInstead: (employee: Employee) => void;
  isDeleting: boolean;
}

export function EmployeeDeleteDialog({
  employee,
  onClose,
  onConfirmDelete,
  onArchiveInstead,
  isDeleting,
}: EmployeeDeleteDialogProps) {
  const { data: deps, isLoading: checkingDeps } = useEmployeeDependencies(
    employee?.id
  );

  if (!employee) return null;

  const fullName = `${employee.forename} ${employee.surname}`;
  const canDelete = deps?.canDelete ?? false;
  const hasLinkedRecords = (deps?.linkedRecords?.length ?? 0) > 0;

  return (
    <AlertDialog open={!!employee} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          {checkingDeps ? (
            <>
              <AlertDialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                Checking employee records…
              </AlertDialogTitle>
              <AlertDialogDescription>
                Verifying whether {fullName} can be safely deleted.
              </AlertDialogDescription>
            </>
          ) : hasLinkedRecords ? (
            <>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                Cannot delete {fullName}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This employee has operational history and cannot be permanently deleted.
                  Linked records include:
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-0.5">
                  {deps?.linkedRecords.map((r) => (
                    <li key={r.table}>
                      {r.count} {r.label}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium text-foreground">
                  Use <strong>Archive</strong> to safely remove them from active views
                  while preserving all records for compliance and audit.
                </p>
              </AlertDialogDescription>
            </>
          ) : (
            <>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Permanently delete {fullName}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This employee has no linked records. Deletion is permanent and cannot be undone.
              </AlertDialogDescription>
            </>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>

          {hasLinkedRecords && !checkingDeps ? (
            <Button
              onClick={() => {
                onArchiveInstead(employee);
                onClose();
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Instead
            </Button>
          ) : canDelete && !checkingDeps ? (
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
