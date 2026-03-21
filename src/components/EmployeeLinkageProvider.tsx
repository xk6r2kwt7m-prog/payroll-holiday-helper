import { useEmployeeLinkage } from "@/hooks/useEmployeeLinkage";

/**
 * Invisible component that runs employee-user linkage on sign-in.
 * Place inside AuthProvider tree.
 */
export function EmployeeLinkageProvider({ children }: { children: React.ReactNode }) {
  useEmployeeLinkage();
  return <>{children}</>;
}
