import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Contract email privacy rules:
 *  1. Contract emails must never disclose stored personal data (home address,
 *     NI number, bank details, date of birth, phone number, emergency contact).
 *     Emails may contain only a name, a contract reference and secure links.
 *  2. The signing page must only ask for details the system does not already
 *     hold — held details are shown as "Already on file" behind the secure
 *     signing link, never requested again and never emailed.
 */

const sendNotificationSrc = readFileSync(
  resolve(__dirname, "../../supabase/functions/send-notification/index.ts"),
  "utf8",
);
const signContractSrc = readFileSync(
  resolve(__dirname, "../pages/SignContract.tsx"),
  "utf8",
);

// Extract the body template of a given notification case block.
function caseBlock(caseName: string): string {
  const start = sendNotificationSrc.indexOf(`case "${caseName}"`);
  expect(start, `case ${caseName} exists`).toBeGreaterThan(-1);
  const next = sendNotificationSrc.indexOf('case "', start + 10);
  return sendNotificationSrc.slice(start, next === -1 ? undefined : next);
}

const CONTRACT_EMAIL_CASES = [
  "contract_signing",
  "contract_signature_received",
  "contract_fully_signed",
  "contract_employer_action_required",
  "contract_employer_sign_now",
  "contract_fully_signed_manager",
  "contract_email_verification",
];

// Personal-data fields that must never appear in a contract email body.
const FORBIDDEN_DATA_KEYS = [
  "address",
  "postcode",
  "ni_number",
  "national_insurance",
  "bank",
  "sort_code",
  "account_number",
  "date_of_birth",
  "dob",
  "phone",
  "emergency_contact",
];

describe("contract emails never disclose stored personal data", () => {
  it("documents the email content rule at the top of the contract templates", () => {
    expect(sendNotificationSrc).toContain("EMAIL CONTENT RULE");
    expect(sendNotificationSrc).toContain("Never include stored personal data");
  });

  for (const caseName of CONTRACT_EMAIL_CASES) {
    it(`${caseName} template references no personal-data fields`, () => {
      const block = caseBlock(caseName);
      for (const key of FORBIDDEN_DATA_KEYS) {
        // data.<key> interpolation would pull a stored personal field into the email
        expect(block.includes(`data.${key}`)).toBe(false);
      }
    });

    it(`${caseName} template contains no personal-data wording`, () => {
      const block = caseBlock(caseName).toLowerCase();
      expect(block).not.toContain("national insurance");
      expect(block).not.toContain("sort code");
      expect(block).not.toContain("account number");
      expect(block).not.toContain("date of birth");
      expect(block).not.toContain("home address");
      expect(block).not.toContain("emergency contact");
    });
  }

  it("contract emails use only name, reference and secure links", () => {
    const signing = caseBlock("contract_signing");
    expect(signing).toContain("signing_url");
    expect(signing).not.toContain("data.address");
    const completed = caseBlock("contract_fully_signed");
    expect(completed).toContain("final_contract_url");
  });
});

describe("signing page only asks for details not already held", () => {
  it("asks only for fields the server flags as missing", () => {
    expect(signContractSrc).toContain("contractInfo.missing_fields");
    expect(signContractSrc).toContain("missingSet.has(f.key)");
  });

  it("shows held details as Already on file instead of asking again", () => {
    expect(signContractSrc).toContain("Already on file");
    expect(signContractSrc).toContain("onFileKeys");
  });

  it("tells the signer we never email personal details", () => {
    // Normalise whitespace/case: the copy wraps across JSX lines.
    const flat = signContractSrc.replace(/\s+/g, " ").toLowerCase();
    expect(flat).toContain("we only ask for details we don't already hold");
    expect(flat).toContain("we never send your personal details by email");
  });

  it("skips the details step entirely when nothing is missing", () => {
    expect(signContractSrc).toContain("We already hold everything we need");
  });

  it("never renders held sensitive values back to the signer", () => {
    expect(signContractSrc).toContain("NON_DISCLOSABLE_KEYS");
    for (const key of [
      "date_of_birth",
      "national_insurance",
      "address",
      "phone",
      "emergency_contact_name",
      "emergency_contact_phone",
    ]) {
      expect(signContractSrc).toContain(`"${key}"`);
    }
    // The already-on-file panel must filter out non-disclosable keys.
    expect(signContractSrc).toContain("!NON_DISCLOSABLE_KEYS.includes");
  });

  it("never asks for a mobile number — a contract does not need one", () => {
    const block = signContractSrc.slice(
      signContractSrc.indexOf("const DETAIL_FIELDS"),
      signContractSrc.indexOf("] as const", signContractSrc.indexOf("const DETAIL_FIELDS")),
    );
    expect(block).not.toContain("Mobile number");
    expect(block).not.toContain('key: "phone"');
  });

  it("treats an address held on the contract record as already known", () => {
    const fn = readFileSync(
      resolve(process.cwd(), "supabase/functions/sign-contract/index.ts"),
      "utf8",
    );
    expect(fn).toContain("terms_snapshot");
    expect(fn).toContain('fromSnapshot("homeAddress"');
    expect(fn).toContain('const requiredKeys = ["full_name", "date_of_birth", "address"]');
  });

  it("asks only for the required contract fields, nothing optional", () => {
    const block = signContractSrc.slice(
      signContractSrc.indexOf("const DETAIL_FIELDS"),
      signContractSrc.indexOf("] as const", signContractSrc.indexOf("const DETAIL_FIELDS")),
    );
    expect(block).not.toContain("required: false");
    expect(block).not.toContain("Emergency contact");
    expect(block).not.toContain("National Insurance");
    // No optional-field escape hatch in what we ask for.
    expect(signContractSrc).not.toContain("!f.required && !onFileKeys.has(f.key)");
  });

  it("the server only discloses non-sensitive held fields", () => {
    expect(sendNotificationSrc.length).toBeGreaterThan(0);
    const fn = readFileSync(
      resolve(__dirname, "../../supabase/functions/sign-contract/index.ts"),
      "utf8",
    );
    expect(fn).toContain("DISCLOSABLE_ON_FILE");
    expect(fn).toContain('DISCLOSABLE_ON_FILE = ["full_name"]');
    expect(fn).toContain("DISCLOSABLE_ON_FILE.includes(k) || missingFields.includes(k)");
  });
});

