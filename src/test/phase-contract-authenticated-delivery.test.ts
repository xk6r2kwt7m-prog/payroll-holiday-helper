import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("completed contract delivery auth invariants", () => {
  it("uses one explicit authenticated request path for email delivery", () => {
    const actions = read("src/components/contracts/ContractSigningActions.tsx");
    expect(actions).toContain('invokeAuthenticatedFunction<{ success: boolean; recipient: string }>(');
    expect(actions).not.toMatch(/functions\.invoke\(["']send-signed-contract["']/);
  });

  it("uses the same fresh-token path for protected document viewing", () => {
    const view = read("src/pages/DocumentView.tsx");
    expect(view).toContain("getFreshAccessToken()");
    expect(view).not.toContain("supabase.auth.getSession()");
  });

  it("sends both the bearer token and publishable key explicitly", () => {
    const helper = read("src/lib/authenticated-function.ts");
    expect(helper).toMatch(/Authorization: `Bearer \$\{accessToken\}`/);
    expect(helper).toMatch(/apikey: publishableKey/);
    expect(helper).toMatch(/supabase\.auth\.refreshSession\(\)/);
  });

  it("keeps server-side signature and tenant checks in place", () => {
    const fn = read("supabase/functions/send-signed-contract/index.ts");
    expect(fn).toMatch(/\["company_admin", "manager"\]\.includes\(membership\.role\)/);
    expect(fn).toMatch(/signer_type === "employee"/);
    expect(fn).toMatch(/signer_type === "employer"/);
    expect(fn).toMatch(/\.is\("invalidated_at", null\)/);
    expect(fn).toContain("This contract is not fully signed yet.");
    expect(fn).toContain("The completed signed contract file is not ready yet.");
  });

  it("keeps recipient downloads token-based and login-free", () => {
    const send = read("supabase/functions/send-signed-contract/index.ts");
    const serve = read("supabase/functions/serve-document/index.ts");
    expect(send).toMatch(/\/document\/view\?token=\$\{token\.token\}&variant=final/);
    expect(serve).toMatch(/if \(signingToken\)/);
    expect(serve).toMatch(/\.eq\("token", signingToken\)/);
  });
});