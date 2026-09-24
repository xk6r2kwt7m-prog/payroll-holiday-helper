import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_employee",
  title: "Get employee",
  description:
    "Return a single employee record by id. RLS enforces tenant, branch, and role visibility. Never returns personal identifiers such as National Insurance number, passport number or bank details.",
  inputSchema: {
    employee_id: z.string().uuid().describe("Employee UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ employee_id }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, employee_ref, forename, surname, preferred_name, email, status, department, start_date, end_date, archived_at, employing_entity, contract_country, work_country",
      )
      .eq("id", employee_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "Employee not found or not visible to this user" }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { employee: data },
    };
  },
});
