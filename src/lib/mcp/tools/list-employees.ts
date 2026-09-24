import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_employees",
  title: "List employees",
  description:
    "List employees visible to the signed-in user. Tenant isolation, manager scoping, and role permissions are enforced by the database via RLS. Never returns personal identifiers such as National Insurance number or bank details.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).default(50).describe("Max rows to return."),
    search: z.string().optional().describe("Case-insensitive match on forename or surname."),
    include_archived: z
      .boolean()
      .default(false)
      .describe("Include archived (former) employees. Off by default."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search, include_archived }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("employees")
      .select(
        "id, employee_ref, forename, surname, preferred_name, email, status, department, start_date, end_date, archived_at",
      )
      .order("surname", { ascending: true })
      .limit(limit);
    if (!include_archived) q = q.is("archived_at", null);
    if (search) {
      q = q.or(`forename.ilike.%${search}%,surname.ilike.%${search}%`);
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
