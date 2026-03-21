import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Automatically links the current authenticated user to their employee record
 * by matching email address. Runs once per session on sign-in.
 *
 * Safety: refuses to auto-link when multiple unlinked employees share the same
 * email (ambiguous case). Requires manual admin linking in that scenario.
 */
export function useEmployeeLinkage() {
  const { user } = useAuth();
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !user.email) return;
    if (attemptedRef.current === user.id) return;
    attemptedRef.current = user.id;

    (async () => {
      try {
        // Check if this user already has a linked employee
        const { data: existing } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) return; // Already linked

        // Attempt to link via the DB function
        const { data, error } = await supabase.rpc("link_user_to_employee", {
          _user_id: user.id,
          _email: user.email,
        });

        if (error) {
          console.warn("[EMPLOYEE_LINKAGE] RPC error:", error.message);
          return;
        }

        const result = data as { linked: boolean; reason?: string; employee_id?: string; employee_name?: string; match_count?: number };

        if (result?.linked) {
          console.log("[EMPLOYEE_LINKAGE] Linked user to employee:", result.employee_name);
        } else if (result?.reason === "ambiguous_multiple_matches") {
          console.warn(
            `[EMPLOYEE_LINKAGE] Auto-link refused: ${result.match_count} unlinked employees share email ${user.email}. Manager must link manually via Admin Centre > People > Employee-User Linking.`
          );
        } else if (result?.reason === "no_matching_employee") {
          console.info("[EMPLOYEE_LINKAGE] No unlinked employee record matches this email.");
        }
      } catch (err) {
        console.warn("[EMPLOYEE_LINKAGE] Exception:", err);
      }
    })();
  }, [user?.id, user?.email]);
}
