import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

// Lazy per-call Supabase client that forwards the caller's OAuth access token
// so RLS runs as that user. Never use SUPABASE_SERVICE_ROLE_KEY here.
export function supabaseForUser(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase URL / publishable key not configured");
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
