import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

/**
 * Email automation categories.
 * Each maps to a toggle in the Email Automation settings.
 *
 * "disabled"        – email is blocked; blocked attempt is logged
 * "manual"          – system prepares email but admin must click Send
 * "auto"            – system sends automatically
 */
export type EmailMode = "disabled" | "manual" | "auto";

export interface EmailAutomationSettings {
  contracts: EmailMode;
  contract_signing: EmailMode;
  hr_documents: EmailMode;
  payroll: EmailMode;
  onboarding: EmailMode;
  policies: EmailMode;
  scheduling: EmailMode;
  general: EmailMode;
}

/** Safe defaults – everything OFF except scheduling (manual). */
export const EMAIL_AUTOMATION_DEFAULTS: EmailAutomationSettings = {
  contracts: "manual",
  contract_signing: "manual",
  hr_documents: "disabled",
  payroll: "manual",
  onboarding: "disabled",
  policies: "disabled",
  scheduling: "manual",
  general: "disabled",
};

export type EmailCategory = keyof EmailAutomationSettings;

export function useEmailPolicy() {
  const { tenantId } = useTenant();

  const { data: settings } = useQuery({
    queryKey: ["tenant_preferences", tenantId, "email_automation"],
    queryFn: async (): Promise<EmailAutomationSettings> => {
      if (!tenantId) return EMAIL_AUTOMATION_DEFAULTS;

      const { data, error } = await supabase
        .from("tenant_preferences")
        .select("preferences")
        .eq("tenant_id", tenantId)
        .eq("category", "email_automation")
        .maybeSingle();

      if (error) throw error;
      if (!data) return EMAIL_AUTOMATION_DEFAULTS;

      return { ...EMAIL_AUTOMATION_DEFAULTS, ...(data.preferences as unknown as EmailAutomationSettings) };
    },
    enabled: !!tenantId,
  });

  const policy = settings ?? EMAIL_AUTOMATION_DEFAULTS;

  /** Check whether a category allows automatic sending */
  const isAutoAllowed = (category: EmailCategory): boolean => policy[category] === "auto";

  /** Check whether a category allows any sending (manual or auto) */
  const isSendAllowed = (category: EmailCategory): boolean => policy[category] !== "disabled";

  /** Check whether a category requires manual confirmation */
  const isManualOnly = (category: EmailCategory): boolean => policy[category] === "manual";

  /** Get the mode for a category */
  const getMode = (category: EmailCategory): EmailMode => policy[category];

  return { policy, isAutoAllowed, isSendAllowed, isManualOnly, getMode };
}

/**
 * Server-side helper: loads email automation settings for a tenant.
 * Used inside edge functions.
 */
export async function loadEmailPolicy(
  supabaseClient: any,
  tenantId: string
): Promise<EmailAutomationSettings> {
  const { data } = await supabaseClient
    .from("tenant_preferences")
    .select("preferences")
    .eq("tenant_id", tenantId)
    .eq("category", "email_automation")
    .maybeSingle();

  if (!data) return EMAIL_AUTOMATION_DEFAULTS;
  return { ...EMAIL_AUTOMATION_DEFAULTS, ...(data.preferences as EmailAutomationSettings) };
}
