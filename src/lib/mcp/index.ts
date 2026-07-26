import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listEmployees from "./tools/list-employees";
import getEmployee from "./tools/get-employee";
import listHolidayRequests from "./tools/list-holiday-requests";
import listPayrollPeriods from "./tools/list-payroll-periods";

// The OAuth issuer must be the direct supabase.co host, built from the project
// ref (never from SUPABASE_URL, which may be a proxy). VITE_SUPABASE_PROJECT_ID
// is inlined at build time, keeping this module import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "uglyops-mcp",
  title: "UglyOps",
  version: "0.1.0",
  instructions:
    "Read-only tools for UglyOps: employees, holiday requests, and payroll periods. All access is scoped to the signed-in user by row-level security (tenant, branch, and role).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listEmployees, getEmployee, listHolidayRequests, listPayrollPeriods],
});
