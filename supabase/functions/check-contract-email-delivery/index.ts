import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "npm:zod@3.23.8";
import { guardRequest, guardCorsHeaders } from "../_shared/auth-guard.ts";

const BodySchema = z.object({
  document_id: z.string().uuid(),
});

type DeliveryState = "delivered" | "rejected" | "processing" | "unknown";

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...guardCorsHeaders, "Content-Type": "application/json" },
  });
}

function deliveryState(events: Array<{ Type?: string }> | undefined): DeliveryState {
  const types = new Set((events ?? []).map((event) => String(event.Type ?? "").toLowerCase()));
  if (types.has("bounced") || types.has("spamcomplaint")) return "rejected";
  if (types.has("delivered")) return "delivered";
  if (types.has("transient")) return "processing";
  return "processing";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: guardCorsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "A valid contract is required." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const providerKey = Deno.env.get("POSTMARK_SERVER_TOKEN") ?? "";
    if (!supabaseUrl || !serviceKey) return json({ error: "Delivery checking is unavailable." }, 500);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: document, error: documentError } = await admin
      .from("employee_documents")
      .select("id, tenant_id, contract_sent_at, contract_sent_to")
      .eq("id", parsed.data.document_id)
      .maybeSingle();

    if (documentError) return json({ error: "The contract delivery record could not be checked." }, 500);
    if (!document) return json({ error: "Contract not found." }, 404);

    const guard = await guardRequest(req, { tenantId: document.tenant_id, cors: guardCorsHeaders });
    if (!guard.ok) return guard.response;
    if (!guard.isPlatformAdmin && !["company_admin", "manager"].includes(String(guard.role))) {
      return json({ error: "Management access is required." }, 403);
    }

    const { data: auditRows, error: auditError } = await admin
      .from("audit_log")
      .select("new_data, created_at")
      .eq("tenant_id", document.tenant_id)
      .eq("table_name", "contract_email_sent")
      .contains("new_data", { employee_document_id: document.id })
      .order("created_at", { ascending: false })
      .limit(1);

    if (auditError) return json({ error: "The email audit record could not be checked." }, 500);
    const audit = auditRows?.[0];
    const details = audit?.new_data as Record<string, unknown> | undefined;
    const messageId = typeof details?.message_id === "string" ? details.message_id : null;
    const recipient = typeof details?.recipient_email === "string" ? details.recipient_email : document.contract_sent_to;

    if (!messageId) {
      return json({ state: "unknown", recipient, checked_at: new Date().toISOString() });
    }
    if (!providerKey) return json({ error: "Email delivery checking is not configured." }, 503);

    const providerResponse = await fetch(
      `https://api.postmarkapp.com/messages/outbound/${encodeURIComponent(messageId)}/details`,
      { headers: { "X-Postmark-Server-Token": providerKey, Accept: "application/json" } },
    );
    const providerText = await providerResponse.text();
    if (!providerResponse.ok) {
      console.error(`check-contract-email-delivery: provider failed [${providerResponse.status}]: ${providerText}`);
      return json({ error: "The email provider could not be checked right now." }, providerResponse.status);
    }

    const providerData = JSON.parse(providerText) as {
      MessageEvents?: Array<{
        Type?: string;
        ReceivedAt?: string;
        Details?: { Summary?: string; DeliveryMessage?: string };
      }>;
    };
    const events = providerData.MessageEvents ?? [];
    const state = deliveryState(events);
    const relevantEvent = events.find((event) => {
      const type = String(event.Type ?? "").toLowerCase();
      return state === "rejected" ? type === "bounced" || type === "spamcomplaint" : type === "delivered";
    }) ?? events[0];
    const reason = state === "rejected"
      ? relevantEvent?.Details?.Summary ?? "The recipient's email service rejected this message."
      : null;

    return json({
      state,
      recipient,
      event_at: relevantEvent?.ReceivedAt ?? null,
      reason,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("check-contract-email-delivery:", error instanceof Error ? error.message : String(error));
    return json({ error: "The delivery status could not be checked." }, 500);
  }
});