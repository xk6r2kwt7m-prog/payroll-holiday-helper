/**
 * Shared authentication / authorisation gate for edge functions.
 *
 * Rules:
 *  - Requests carrying the service-role key are trusted internal callers
 *    (function-to-function invokes and scheduled jobs).
 *  - Every other request must present a valid user JWT.
 *  - The tenant a caller may act on is resolved SERVER-SIDE from that user's
 *    active tenant_members rows. Body-supplied tenant identifiers are only
 *    ever accepted when they appear in that list.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const guardCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export interface GuardOk {
  ok: true;
  /** true when the caller is an internal service-role / scheduler call. */
  internal: boolean;
  userId: string | null;
  /** Tenant the caller is authorised to act on (null for internal callers). */
  tenantId: string | null;
  role: string | null;
  isPlatformAdmin: boolean;
}

export interface GuardFail {
  ok: false;
  response: Response;
}

export type GuardResult = GuardOk | GuardFail;

export interface GuardOptions {
  /** Tenant the request wants to touch (from the body). Optional. */
  tenantId?: string | null;
  /** Require company_admin (or platform admin) rather than any membership. */
  adminOnly?: boolean;
  /** Allow trusted service-role / scheduler calls. Defaults to true. */
  allowServiceRole?: boolean;
  /** Extra CORS headers to merge into failure responses. */
  cors?: Record<string, string>;
}

const ADMIN_ROLES = new Set(["company_admin", "admin", "owner"]);

function deny(status: number, error: string, cors?: Record<string, string>): GuardFail {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error }), {
      status,
      headers: { ...guardCorsHeaders, ...(cors ?? {}), "Content-Type": "application/json" },
    }),
  };
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : header.trim();
}

/**
 * Authenticate and authorise the caller. Never throws.
 */
export async function guardRequest(req: Request, opts: GuardOptions = {}): Promise<GuardResult> {
  const cors = opts.cors;
  const allowServiceRole = opts.allowServiceRole !== false;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const token = bearerToken(req);
  if (!token) return deny(401, "Sign-in required", cors);

  if (token === serviceKey) {
    if (!allowServiceRole) return deny(401, "Sign-in required", cors);
    return { ok: true, internal: true, userId: null, tenantId: opts.tenantId ?? null, role: null, isPlatformAdmin: true };
  }

  // Reject the publishable/anon key on its own — it identifies no user.
  if (token === anonKey) return deny(401, "Sign-in required", cors);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return deny(401, "Sign-in required", cors);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: platformRow } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isPlatformAdmin = !!platformRow;

  const { data: memberships } = await admin
    .from("tenant_members")
    .select("tenant_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const active = memberships ?? [];

  let resolvedTenant: string | null = null;
  let role: string | null = null;

  if (opts.tenantId) {
    const match = active.find((m) => m.tenant_id === opts.tenantId);
    if (match) {
      resolvedTenant = match.tenant_id;
      role = match.role as string;
    } else if (isPlatformAdmin) {
      resolvedTenant = opts.tenantId;
      role = "platform_admin";
    } else {
      return deny(403, "Not permitted for this company", cors);
    }
  } else if (active.length === 1) {
    resolvedTenant = active[0].tenant_id;
    role = active[0].role as string;
  } else if (active.length > 1) {
    return deny(400, "Company must be specified", cors);
  } else if (!isPlatformAdmin) {
    return deny(403, "No company access", cors);
  }

  if (opts.adminOnly && !isPlatformAdmin && !ADMIN_ROLES.has(String(role))) {
    return deny(403, "Administrator access required", cors);
  }

  return { ok: true, internal: false, userId: user.id, tenantId: resolvedTenant, role, isPlatformAdmin };
}
