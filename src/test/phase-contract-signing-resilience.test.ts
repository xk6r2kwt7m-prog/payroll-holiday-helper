import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const fn = read("supabase/functions/sign-contract/index.ts");
const page = read("src/pages/SignContract.tsx");

describe("contract signing resilience", () => {
  it("retries transient storage reads instead of failing the signer", () => {
    expect(fn).toContain("async function withRetry");
    expect(fn).toMatch(/withRetry\(\s*\n?\s*"download original contract"/);
  });

  it("treats a repeat of the same link and signer as success, never a duplicate signature", () => {
    expect(fn).toMatch(/s\.signing_token_id === signingToken\.id/);
    expect(fn).toContain("Your signature is already recorded.");
    // Role locking still blocks a different attempt on an already-signed role
    expect(fn).toMatch(/section has already been signed\. This signing link can no longer be used\./);
  });

  it("never discards a stored signature when the combined file cannot be built", () => {
    expect(fn).toContain("final_signed_contract_file_pending");
    expect(fn).toContain("Signed contract file needs rebuilding");
    // The unsigned original is never promoted to the final file
    expect(fn).not.toMatch(/final_signed_pdf_url:\s*originalFilePath/);
  });

  it("records a traceable reference for any unhandled signing failure", () => {
    expect(fn).toContain("function makeReference()");
    expect(fn).toContain("contract_signing_failed");
    expect(fn).toMatch(/stage: failureStage/);
    expect(fn).toContain("quote reference ${reference}");
  });

  it("distinguishes a connection problem from a server problem for the signer", () => {
    expect(page).toContain('setErrorCode("network_error")');
    expect(page).toContain('case "network_error":');
    expect(page).toContain('case "internal_error":');
    expect(page).toMatch(/response = await post\(\);/);
  });
});
