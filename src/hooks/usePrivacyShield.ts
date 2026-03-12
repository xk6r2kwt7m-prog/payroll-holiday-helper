import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// ── Sensitivity categories ──
export type SensitivityCategory =
  | "compensation"      // hourly rate, salary, service charge, bonuses, totals, holiday pay
  | "personal_id"       // NI number, passport, bank details, tax IDs
  | "private_hr"        // disciplinary, grievance, confidential notes
  | "payroll_summary";  // aggregate payroll totals, avg rates

// ── Role-based reveal permissions ──
const REVEAL_PERMISSIONS: Record<string, SensitivityCategory[]> = {
  admin:      ["compensation", "personal_id", "private_hr", "payroll_summary"],
  manager:    ["compensation", "payroll_summary"],
  supervisor: [],
  staff:      [],
  viewer:     [],
};

// Categories that require re-auth (high risk)
const REAUTH_CATEGORIES: SensitivityCategory[] = ["personal_id"];

// Auto-hide timeout in ms
const AUTO_HIDE_TIMEOUT = 30_000; // 30 seconds

export function usePrivacyShield() {
  const { role, isAdmin, user } = useAuth();
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Check if user can reveal a category ──
  const canReveal = useCallback(
    (category: SensitivityCategory): boolean => {
      if (!role) return false;
      const perms = REVEAL_PERMISSIONS[role] || [];
      return perms.includes(category);
    },
    [role]
  );

  // ── Check if category requires re-auth ──
  const requiresReauth = useCallback(
    (category: SensitivityCategory): boolean => {
      return REAUTH_CATEGORIES.includes(category);
    },
    []
  );

  // ── Reveal a specific field ──
  const revealField = useCallback(
    (fieldKey: string, category: SensitivityCategory, employeeId?: string) => {
      if (!canReveal(category)) return false;

      setRevealedFields((prev) => {
        const next = new Set(prev);
        next.add(fieldKey);
        return next;
      });

      // Auto-hide after timeout
      const existingTimer = timersRef.current.get(fieldKey);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        setRevealedFields((prev) => {
          const next = new Set(prev);
          next.delete(fieldKey);
          return next;
        });
        timersRef.current.delete(fieldKey);
      }, AUTO_HIDE_TIMEOUT);
      timersRef.current.set(fieldKey, timer);

      // Audit log for high-risk reveals
      if (REAUTH_CATEGORIES.includes(category) || category === "compensation") {
        logReveal(category, fieldKey, employeeId);
      }

      return true;
    },
    [canReveal]
  );

  // ── Hide a specific field ──
  const hideField = useCallback((fieldKey: string) => {
    setRevealedFields((prev) => {
      const next = new Set(prev);
      next.delete(fieldKey);
      return next;
    });
    const timer = timersRef.current.get(fieldKey);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(fieldKey);
    }
  }, []);

  // ── Check if a field is revealed ──
  const isRevealed = useCallback(
    (fieldKey: string) => revealedFields.has(fieldKey),
    [revealedFields]
  );

  // ── Hide all fields ──
  const hideAll = useCallback(() => {
    setRevealedFields(new Set());
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  // ── Audit logging ──
  const logReveal = async (
    category: SensitivityCategory,
    fieldKey: string,
    employeeId?: string
  ) => {
    try {
      await supabase.from("audit_log").insert({
        user_id: user?.id || null,
        action: "view" as const,
        table_name: "privacy_shield",
        record_id: employeeId || null,
        new_data: {
          operation: "sensitive_data_reveal",
          category,
          field_key: fieldKey,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // Silently fail audit — don't block the reveal
    }
  };

  // ── Focus/visibility change: hide all ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hideAll();
      }
    };

    const handleBlur = () => {
      hideAll();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      // Clean up timers
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, [hideAll]);

  // ── Route change: hide all ──
  useEffect(() => {
    return () => {
      hideAll();
    };
  }, [hideAll]);

  return {
    canReveal,
    requiresReauth,
    revealField,
    hideField,
    isRevealed,
    hideAll,
    revealedFields,
  };
}

// ── Context for app-wide privacy shield ──
import { createContext, useContext, ReactNode } from "react";

interface PrivacyShieldContextType {
  canReveal: (category: SensitivityCategory) => boolean;
  requiresReauth: (category: SensitivityCategory) => boolean;
  revealField: (fieldKey: string, category: SensitivityCategory, employeeId?: string) => boolean;
  hideField: (fieldKey: string) => void;
  isRevealed: (fieldKey: string) => boolean;
  hideAll: () => void;
}

const PrivacyShieldContext = createContext<PrivacyShieldContextType | undefined>(undefined);

export function PrivacyShieldProvider({ children }: { children: ReactNode }) {
  const shield = usePrivacyShield();

  return (
    <PrivacyShieldContext.Provider value={shield}>
      {children}
    </PrivacyShieldContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyShieldContext);
  if (!ctx) {
    throw new Error("usePrivacy must be used within PrivacyShieldProvider");
  }
  return ctx;
}
