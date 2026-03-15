import { useEffect, useRef, useCallback } from "react";
import { useTenant } from "@/hooks/useTenant";

/**
 * Tenant-switch guard hook.
 * 
 * 1. Returns `tenantReady` — false while tenant is loading/switching.
 *    Use this to gate rendering of tenant-scoped pages.
 * 
 * 2. Calls `onTenantChange` callback when tenantId changes,
 *    allowing pages to reset local state (selected period, branch, filters).
 * 
 * 3. In development, provides `assertTenantMatch(rows)` to check
 *    returned data for tenant_id mismatches.
 */
export function useTenantGuard(onTenantChange?: () => void) {
  const { tenantId, loading, tenantResolved } = useTenant();
  const prevTenantId = useRef<string | null>(null);

  // Detect tenant switches and fire reset callback
  useEffect(() => {
    if (!tenantId) return;
    if (prevTenantId.current !== null && prevTenantId.current !== tenantId) {
      onTenantChange?.();
    }
    prevTenantId.current = tenantId;
  }, [tenantId, onTenantChange]);

  const tenantReady = !!tenantId && !loading && tenantResolved;

  /**
   * DEV-only: assert that all rows in an array belong to the active tenant.
   * Logs a warning and returns false if any mismatch is found.
   */
  const assertTenantMatch = useCallback(
    (rows: any[] | null | undefined, label = "query"): boolean => {
      if (process.env.NODE_ENV !== "development") return true;
      if (!rows || !tenantId) return true;
      const mismatched = rows.filter(
        (r) => r.tenant_id && r.tenant_id !== tenantId
      );
      if (mismatched.length > 0) {
        console.error(
          `[TENANT GUARD] ❌ ${label}: ${mismatched.length} row(s) have tenant_id mismatch! Expected ${tenantId}, got:`,
          mismatched.map((r) => r.tenant_id)
        );
        return false;
      }
      return true;
    },
    [tenantId]
  );

  return { tenantReady, tenantId, assertTenantMatch };
}
