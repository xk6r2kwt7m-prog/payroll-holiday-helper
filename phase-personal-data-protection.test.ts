import { describe, it, expect, vi } from "vitest";
import fs from "node:fs/promises";
import ts from "typescript";

const GUARDED = [
  "extract-document",
  "send-notification",
  "merge-duplicate-employees",
  "resolve-orphan-payments",
  "import-historical-payroll",
  "backfill-holiday-ledger",
  "rebuild-holiday-carryover",
  "archive-leavers",
  "talent-ai-match",
];

async function read(p: string) {
  return fs.readFile(p, "utf8");
}

describe("edge function auth gate", () => {
  it("shared guard requires a token and rejects the anon key on its own", async () => {
    const src = await read("supabase/functions/_shared/auth-guard.ts");
    // Execute the actual guard with a mocked SDK/environment. Formatting and
    // logging are irrelevant; unauthenticated input must return before any SDK call.
    const createClient = vi.fn(() => { throw new Error("Unexpected SDK access"); });
    const output = ts.transpileModule(src, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
    const exports: Record<string, any> = {};
    new Function("exports", "require", "Deno", "console", output)(exports,
      () => ({createClient}), {env: {get: (name: string) => ({SUPABASE_URL:"https://example.test", SUPABASE_SERVICE_ROLE_KEY:"server-secret", SUPABASE_ANON_KEY:"public-key"}[name])}}, {log: () => {}});
    for (const headers of [{}, {Authorization: "Bearer public-key"}]) {
      const result = await exports.guardRequest(new Request("https://example.test", {headers}));
      expect(result.ok).toBe(false);
      expect(result.response.status).toBe(401);
    }
    expect(createClient).not.toHaveBeenCalled();
    expect(src).toMatch(/auth\.getUser\(\)/);
    expect(src).toMatch(/tenant_members/);
    expect(src).toMatch(/platform_admins/);
  });

  it("resolves the tenant from membership, never blindly from the body", async () => {
    const src = await read("supabase/functions/_shared/auth-guard.ts");
    expect(src).toMatch(/const match = active\.find\(\(m\) => m\.tenant_id === opts\.tenantId\)/);
    expect(src).toMatch(/return deny\(403, "Not permitted for this company"/);
  });

  it.each(GUARDED)("%s calls the guard before doing work", async (fn) => {
    const src = await read(`supabase/functions/${fn}/index.ts`);
    expect(src).toMatch(/from "\.\.\/_shared\/auth-guard\.ts"/);
    expect(src).toMatch(/guardRequest\(req/);
    expect(src).toMatch(/if \(!guard\.ok\) return guard\.response/);
  });

  it.each([
    "merge-duplicate-employees",
    "resolve-orphan-payments",
    "import-historical-payroll",
    "backfill-holiday-ledger",
    "rebuild-holiday-carryover",
    "archive-leavers",
  ])("%s requires an administrator", async (fn) => {
    const src = await read(`supabase/functions/${fn}/index.ts`);
    expect(src).toMatch(/adminOnly: true/);
  });

  it("merge tool can never run across every company", async () => {
    const src = await read("supabase/functions/merge-duplicate-employees/index.ts");
    expect(src).toMatch(/\.eq\("tenant_id", tenantId\)/);
    expect(src).toMatch(/this tool is scoped to one company/);
  });

  it("maintenance tools use the membership-resolved tenant for signed-in callers", async () => {
    for (const fn of ["resolve-orphan-payments", "backfill-holiday-ledger", "rebuild-holiday-carryover"]) {
      const src = await read(`supabase/functions/${fn}/index.ts`);
      expect(src).toMatch(/const tenant_id = guard\.internal \? requestedTenant : guard\.tenantId!/);
    }
  });
});

describe("staff details link", () => {
  it("is refused once submitted, and when cancelled or expired", async () => {
    const src = await read("supabase/functions/staff-details-portal/index.ts");
    expect(src).toMatch(/error: "already_submitted"/);
    expect(src).toMatch(/error: "revoked"/);
    expect(src).toMatch(/error: "expired"/);
    expect(src).toMatch(/request\.status === "submitted" \|\| request\.submitted_at/);
  });

  it("defaults to a 7 day life, capped at 30", async () => {
    const src = await read("supabase/functions/send-info-request/index.ts");
    expect(src).toMatch(/Number\(body\?\.expiryDays\) \|\| 7, 1\), 30\)/);
  });

  it("managers can cancel an outstanding link without touching submitted data", async () => {
    const src = await read("src/hooks/useInfoRequests.ts");
    expect(src).toMatch(/useRevokeInfoRequest/);
    expect(src).toMatch(/status: "revoked"/);
    expect(src).not.toMatch(/\.delete\(\)/);
  });
});

describe("privacy record", () => {
  it("reads both audit trails and is scoped to the tenant and employee", async () => {
    const src = await read("src/components/employees/EmployeePrivacyLog.tsx");
    expect(src).toMatch(/from\("audit_log"\)/);
    expect(src).toMatch(/from\("document_audit_log"\)/);
    expect(src).toMatch(/\.eq\("tenant_id", tenantId\)/);
    expect(src).toMatch(/\.eq\("employee_id", employeeId\)/);
  });

  it("clearing raw answers empties the submission only and is audit logged", async () => {
    const src = await read("src/components/employees/EmployeePrivacyLog.tsx");
    expect(src).toMatch(/submitted_data: \{\}/);
    expect(src).toMatch(/table_name: "employee_info_request_raw_answers"/);
    expect(src).not.toMatch(/from\("employees"\)[\s\S]{0,80}\.update/);
  });

  it("is only shown to administrators", async () => {
    const src = await read("src/components/employees/EmployeeDetailSheet.tsx");
    expect(src).toMatch(/isAdmin && \(\s*<EmployeePrivacyLog/);
  });
});
