import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_holiday_requests",
  title: "List holiday requests",
  description:
    "List holiday requests visible to the signed-in user. Staff see their own; managers/admins see requests in scope. RLS enforces the boundary.",
  inputSchema: {
    status: z
      .enum(["pending", "approved", "rejected", "cancelled"]) 
      .optional()
      .describe("Filter by request status."),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("holiday_requests")
      .select("id, employee_id, start_date, end_date, status, hours, request_type, created_at")
      .order("start_date", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { holiday_requests: data ?? [] },
    };
  },
});
