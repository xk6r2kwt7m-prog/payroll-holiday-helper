import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_employees",
  title: "List employees",
  description:
    "List employees visible to the signed-in user. Tenant isolation, manager scoping, and role permissions are enforced by the database via RLS.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).default(50).describe("Max rows to return."),
    search: z.string().optional().describe("Case-insensitive match on first or last name."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("employees")
      .select("id, first_name, last_name, email, employee_status, branch_id, role")
      .limit(limit);
    if (search) {
      q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { employees: data ?? [] },
    };
  },
});
