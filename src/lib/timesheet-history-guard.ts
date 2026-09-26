import { supabase } from "@/integrations/supabase/client";

/** Refuse manager time-entry writes until the atomic server history is installed. */
export async function assertTimesheetHistoryReady() {
  const { data, error } = await supabase.rpc("timesheet_history_ready" as any);
  if (error || data !== true) {
    throw new Error("Secure timesheet history is not available yet. Nothing was changed.");
  }
}
