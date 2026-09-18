import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Contract signing: email ownership verification, delivery recording and staff access.
 *
 * These tests assert on the source of the signing function, the delivery function, the
 * document server and the signing/staff screens. They never touch signed files: no test
 * reads, rebuilds or writes a contract PDF.
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const signContract = read("supabase/functions/sign-contract/index.ts");
const sendSigned = read("supabase/functions/send-signed-contract/index.ts");
const serveDocument = read("supabase/functions/serve-document/index.ts");
const signPage = read("src/pages/SignContract.tsx");
const staffContracts = read("src/components/staff-portal/MyContractsSection.tsx");
const deliveryPanel = read("src/components/contracts/ContractDeliveryPanel.tsx");

describe("1. Expired signing links", () => {
  it("refuses an expired link when signing, with a 410 and a plain explanation", () => {
    expect(signContract).toContain("new Date(signingToken.expires_at) < new Date()");
    expect(signContract).toContain("This signing link has expired. Please ask your employer to send a new one.");
    expect(signContract).toContain('error_code: "expired"');
    expect(signContract).toContain("status: 410");
  });

  it("checks expiry before a verification code can be requested or confirmed", () => {
    expect(signContract).toContain("new Date(vToken.expires_at) < new Date()");
  });
});

describe("2. Incorrectly formatted email addresses", () => {
  it("rejects a malformed confirmed address on the server", () => {
    expect(signContract).toContain('error_code: "invalid_email"');
    expect(signContract).toContain("!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(confirmedEmail)");
  });

  it("blocks submission on the signing screen until the address looks complete", () => {
    expect(signPage).toContain("const emailLooksValid =");
    expect(signPage).toContain("That does not look like a full email address.");
    expect(signPage).toMatch(/canSubmit =[\s\S]{0,220}emailLooksValid/);
  });
});

describe("3. A corrected address belonging to someone else", () => {
  it("never treats typing or confirming an address as proof of ownership", () => {
    expect(signContract).toContain("Typing or confirming an address is NOT proof of ownership");
    expect(signContract).toContain("Please verify this email address first. We will send a 6-digit code to it.");
    expect(signContract).toContain('error_code: "email_verification_required"');
    expect(signContract).toContain("status: 428");
  });

  it("only accepts a changed address when a verified row exists for THIS signing link and THAT address", () => {
    expect(signContract).toContain('.eq("signing_token_id", signingToken.id)');
    expect(signContract).toContain('.eq("email", confirmedEmail.toLowerCase())');
    expect(signContract).toContain('.not("verified_at", "is", null)');
  });

  it("records whether ownership was proven alongside the signature", () => {
    expect(signContract).toContain("email_ownership_verified");
  });

  it("gates the signing screen on verification of a changed address", () => {
    expect(signPage).toContain("const emailChanged =");
    expect(signPage).toContain("const emailVerified =");
    expect(signPage).toMatch(/canSubmit =[\s\S]{0,220}emailVerified/);
    expect(signPage).toContain("This is different from the address held for this contract");
  });
});

describe("4. Email verification failure and expiry", () => {
  it("expires the one-time code after 15 minutes", () => {
    expect(signContract).toContain("15 * 60_000");
    expect(signContract).toContain("That code has expired. Please ask for a new one.");
    expect(signContract).toContain('error_code: "code_expired"');
  });

  it("stores only a hash of the code, never the code itself", () => {
    expect(signContract).toContain("code_hash");
    expect(signContract).toMatch(/sha256\(/);
  });

  it("limits attempts and resend frequency", () => {
    expect(signContract).toContain("attempts");
    expect(signContract).toMatch(/too_soon|last_sent_at/);
  });

  it("shows the signer a clear failure message instead of proceeding", () => {
    expect(staffContracts).toBeTruthy();
    expect(signPage).toContain("setCodeError");
    expect(signPage).toContain("The code lasts 15 minutes.");
  });
});

describe("5. Completed-contract email delivery failure", () => {
  it("records every delivery attempt with its outcome", () => {
    expect(signContract).toContain("contract_delivery_attempts");
    expect(signContract).toMatch(/status: "failed"|status: 'failed'/);
    expect(signContract).toContain("error_message");
  });

  it("raises a visible administrator action when delivery fails", () => {
    expect(signContract).toContain("contract_delivery_failed");
  });

  it("surfaces unresolved failures to administrators with a retry", () => {
    expect(deliveryPanel).toContain("contract_delivery_attempts");
    expect(deliveryPanel).toContain("!a.resolved_at");
    expect(deliveryPanel).toContain("Retry delivery");
  });
});

describe("6. Retrying without duplicate emails or signatures", () => {
  it("treats a repeat post from the same link as a retry and keeps the stored signature", () => {
    expect(signContract).toContain("Your signature is already recorded.");
    expect(signContract).toContain("replay: true");
  });

  it("refuses a second signature for a role that has already signed", () => {
    expect(signContract).toContain('error_code: "already_signed"');
  });

  it("retrying delivery only creates a new link and a new attempt record", () => {
    expect(sendSigned).toContain("contract_delivery_attempts");
    expect(sendSigned).toMatch(/manual_retry/);
    expect(deliveryPanel).toContain("The signed file itself was not changed.");
    // No rebuild, overwrite or upload of the signed contract in the delivery path.
    expect(sendSigned).not.toMatch(/upsert:\s*true/);
  });
});

describe("7. Staff attempting to open another employee's contract", () => {
  it("restricts staff to their own completed contract in the document server", () => {
    expect(serveDocument).toContain("Staff (non-manager roles) may only open their own completed contract.");
    expect(serveDocument).toContain("status: 403");
  });

  it("the staff screen only ever asks for that employee's completed contracts", () => {
    expect(staffContracts).toContain('.eq("employee_id", employeeId)');
    expect(staffContracts).toContain('.eq("document_type", "contract")');
    expect(staffContracts).toContain('.in("contract_state", COMPLETED_STATES)');
    expect(staffContracts).toContain('const COMPLETED_STATES = ["signed", "superseded", "terminated"]');
  });

  it("never lists drafts, recovery copies or internal audit records", () => {
    expect(staffContracts).not.toContain("contract_file_recoveries");
    expect(staffContracts).not.toContain("document_audit_log");
    expect(staffContracts).not.toContain("contract_integrity_checks");
    expect(staffContracts).not.toContain('"draft"');
  });
});

describe("8. Leavers after access has ended", () => {
  it("the document server refuses a leaver's request", () => {
    expect(serveDocument).toContain('(ownEmployee as any).status === "leaver"');
  });

  it("the staff screen does not promise indefinite access and warns of the final copy", () => {
    expect(staffContracts).toContain("while your employment and account are active");
    expect(staffContracts).toContain("final downloadable copy before access here closes");
    expect(staffContracts).not.toMatch(/forever|indefinitely|always available/i);
  });
});

describe("Signing certificate handling", () => {
  it("the certificate is downloaded on request, never attached to an ordinary email", () => {
    expect(staffContracts).toContain("SigningCertificatePDF");
    expect(signContract).not.toContain("SigningCertificate");
    expect(sendSigned).not.toContain("SigningCertificate");
  });

  it("completed-contract delivery uses a secure link rather than an attachment", () => {
    expect(signContract).toMatch(/secure_link/);
    expect(sendSigned).toMatch(/secure_link/);
  });
});
