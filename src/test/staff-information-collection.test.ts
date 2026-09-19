import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { allocateStaffDetails, STAFF_FIELD_RULES } from "@/lib/staff-details-allocation";
import { INFO_PRESETS } from "@/lib/info-request-items";
import { EMPLOYEE_COLUMNS, SENSITIVE_EMPLOYEE_COLUMNS, maskTail } from "@/lib/employee-columns";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(process.cwd(), dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(process.cwd(), rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
  }
  return out;
}

describe("what may be saved automatically", () => {
  const existing = {
    forename: "Rehana",
    surname: "Raman",
    email: "rehana@example.com",
    date_of_birth: "1996-04-02",
    ni_number: "AB123456C",
    bank_account_no: "12345678",
    sort_code: "112233",
  };

  it("fills a blank field from what the staff member sent", () => {
    const r = allocateStaffDetails({ preferred_name: "Rhe" }, { ...existing, preferred_name: "" });
    expect(r.updates.preferred_name).toBe("Rhe");
    expect(r.conflicts).toHaveLength(0);
  });

  it("never changes a legal name, date of birth, National Insurance number or email on its own", () => {
    const r = allocateStaffDetails(
      { forename: "Rheana", date_of_birth: "1996-04-03", ni_number: "ZZ999999Z", email: "new@example.com" },
      existing,
    );
    expect(Object.keys(r.updates)).toHaveLength(0);
    expect(r.conflicts.map((c) => c.field).sort()).toEqual(
      ["date_of_birth", "email", "forename", "ni_number"],
    );
  });

  it("holds new bank details for review rather than using them for pay", () => {
    const r = allocateStaffDetails(
      { bank_account_no: "87654321", sort_code: "998877" },
      { ...existing, bank_account_no: "", sort_code: "" },
    );
    expect(r.updates.bank_account_no).toBeUndefined();
    expect(r.updates.sort_code).toBeUndefined();
    expect(r.held.map((h) => h.field).sort()).toEqual(["bank_account_no", "sort_code"]);
  });

  it("holds a change of bank account for review too", () => {
    const r = allocateStaffDetails({ bank_account_no: "87654321" }, existing);
    expect(r.updates.bank_account_no).toBeUndefined();
    expect(r.held[0].current).toBe("12345678");
    expect(r.held[0].submitted).toBe("87654321");
  });

  it("marks bank fields as always needing review", () => {
    for (const field of ["bank_account_no", "sort_code"]) {
      expect(STAFF_FIELD_RULES.find((r) => r.column === field)?.alwaysReview).toBe(true);
    }
  });

  it("uses the same rules in the staff-facing service", () => {
    expect(read("supabase/functions/staff-details-portal/allocation.ts")).toBe(
      read("src/lib/staff-details-allocation.ts"),
    );
  });
});

describe("what a manager can ask for", () => {
  it("offers exactly the five agreed choices", () => {
    expect(INFO_PRESETS.map((p) => p.key)).toEqual([
      "new_starter",
      "payroll",
      "right_to_work",
      "emergency",
      "correction",
    ]);
  });

  it("asks for a telephone number only as part of new starter details", () => {
    for (const preset of INFO_PRESETS) {
      if (preset.key === "new_starter") expect(preset.items).toContain("phone");
      else expect(preset.items).not.toContain("phone");
    }
  });
});

describe("protected values", () => {
  it("keeps bank, National Insurance and identity numbers out of ordinary staff queries", () => {
    for (const column of SENSITIVE_EMPLOYEE_COLUMNS) {
      expect(EMPLOYEE_COLUMNS.split(", ")).not.toContain(column);
    }
  });

  it("still reports whether each protected value is held", () => {
    for (const flag of ["has_ni_number", "has_bank_details", "has_passport", "has_share_code"]) {
      expect(EMPLOYEE_COLUMNS).toContain(flag);
    }
  });

  it("shows only the last couple of characters when masked", () => {
    expect(maskTail("12345678")).toBe("••••••78");
  });

  it("reads protected values only through the administrator-only route", () => {
    const hook = read("src/hooks/useSensitiveEmployeeFields.ts");
    expect(hook).toContain("employee_sensitive_fields");
    expect(hook).toContain("tenant_sensitive_fields");
    expect(hook).toContain("isAdmin");
  });

  it("no screen selects a protected column with an ordinary query", () => {
    const offenders: string[] = [];
    for (const file of [...sourceFiles("src/components"), ...sourceFiles("src/pages"), ...sourceFiles("src/hooks")]) {
      const src = read(file);
      if (!src.includes('from("employees")')) continue;
      for (const column of SENSITIVE_EMPLOYEE_COLUMNS) {
        if (new RegExp(`select\\([^)]*(?<!has_)${column}`).test(src)) offenders.push(`${file}:${column}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the staff page", () => {
  const page = read("src/pages/StaffDetailsPortal.tsx");

  it("says who is asking and why before any question", () => {
    expect(page).toContain("Ugly Dumpling needs a few details");
    expect(page).toContain("What we will ask for");
    expect(page).toContain("the link works until");
  });

  it("promises never to ask for banking passwords or codes", () => {
    expect(page).toContain(
      "Ugly Dumpling will never ask for your online-banking password, PIN, card security code or verification code.",
    );
  });

  it("saves answers on its own so the form can be picked up again", () => {
    expect(page).toContain('action: "save"');
    expect(page).toMatch(/setTimeout\(\(\) => \{ void saveProgress\(\); \}, 2000\)/);
  });

  it("lets someone say they do not have a National Insurance number yet", () => {
    expect(page).toContain("I do not have a National Insurance number yet");
  });

  it("becomes read-only once sent, and carries on to the contract when there is one", () => {
    expect(page).toContain("This link is now read-only");
    expect(page).toContain("Continue to your contract");
  });
});

describe("the manager's controls", () => {
  const dialog = read("src/components/employees/RequestStaffDetailsDialog.tsx");

  it("shows the person, the request, the expiry and the email before sending", () => {
    expect(dialog).toContain("confirm-request-name");
    expect(dialog).toContain("confirm-request-items");
    expect(dialog).toContain("confirm-request-expiry");
    expect(dialog).toContain("confirm-request-email-preview");
  });

  it("requires a final confirmation step", () => {
    expect(dialog).toContain("Check before sending");
    expect(dialog).toContain("Send request");
  });
});

describe("reviewing what came back", () => {
  const panel = read("src/components/employees/StaffChangesReview.tsx");
  const hooks = read("src/hooks/useStaffDetailChanges.ts");

  it("shows what is held beside what was sent", () => {
    expect(panel).toContain("Already held");
    expect(panel).toContain("They sent");
  });

  it("hides protected values from anyone who is not authorised", () => {
    expect(panel).toContain("maskTail");
    expect(panel).toContain("isAdmin");
  });

  it("records who decided and when", () => {
    expect(hooks).toContain("decided_by_name");
    expect(hooks).toContain("decided_at");
    expect(hooks).toContain("audit_log");
  });

  it("does not use a changed bank account until it is confirmed with the employee", () => {
    expect(hooks).toContain("bank_detail_verifications");
    expect(hooks).toContain("confirmed_directly");
    expect(hooks).toMatch(/accept && !isBankField/);
  });

  it("gives right to work the five agreed states and records the checker", () => {
    expect(hooks).toContain('"requested", "submitted", "verified", "rejected", "expired"');
    expect(hooks).toContain("rtw_reviewed_by_name");
  });

  it("warns when right to work has not been checked, and cancels nothing", () => {
    expect(panel).toContain("has not been checked yet");
    expect(panel).toContain("Nothing has been cancelled");
  });
});

describe("how links are shared", () => {
  it("no longer suggests sending a signing link through WhatsApp", () => {
    for (const file of [
      "src/components/contracts/ContractFormDialog.tsx",
      "src/components/contracts/ContractSigningActions.tsx",
    ]) {
      expect(read(file)).not.toContain("WhatsApp");
    }
  });
});

describe("the staff-facing service", () => {
  const fn = read("supabase/functions/staff-details-portal/index.ts");

  it("records every submitted value for review", () => {
    expect(fn).toContain("staff_detail_changes");
    expect(fn).toContain("allocation.held");
  });

  it("refuses an expired, cancelled or already-sent link", () => {
    expect(fn).toContain('"expired"');
    expect(fn).toContain('"revoked"');
    expect(fn).toContain('"already_submitted"');
  });

  it("stamps each automatic save", () => {
    expect(fn).toContain("last_saved_at");
  });

  it("carries on to the contract in the same session", () => {
    expect(fn).toContain("contract_sign_path");
    expect(fn).toContain('signer_type", "employee"');
  });

  it("never lets the staff page write pay, hours, role, branch or start date", () => {
    for (const column of ["hourly_rate", "pay_amount", "department", "start_date"]) {
      expect(fn).not.toContain(`candidates.${column}`);
    }
  });
});

describe("telephone number", () => {
  it("asks for it as an ordinary question with an opt-out", () => {
    const step = buildPortalSteps(["phone"]).find((s) => s.fields.some((f) => f.key === "phone"))!;
    const field = step.fields.find((f) => f.key === "phone")!;
    expect(field.required).toBeUndefined();
    expect(step.noPhoneOption).toBe(true);
    expect(field.hint).toMatch(/work contact/i);
  });

  it("accepts UK and international numbers and refuses nonsense", () => {
    expect(isValidPhoneNumber("07700 900123")).toBe(true);
    expect(isValidPhoneNumber("+351 912 345 678")).toBe(true);
    expect(isValidPhoneNumber("(020) 7946-0018")).toBe(true);
    expect(isValidPhoneNumber("12345")).toBe(false);
    expect(isValidPhoneNumber("not a number")).toBe(false);
  });
});

describe("requests prepared but not sent", () => {
  const fn = readFileSync("supabase/functions/send-info-request/index.ts", "utf8");
  const portal = readFileSync("supabase/functions/staff-details-portal/index.ts", "utf8");

  it("saves the request without sending an email", () => {
    expect(fn).toContain('status: prepareOnly ? "prepared" : "sent"');
    expect(fn).toContain("if (prepareOnly) {");
    expect(fn).toContain("employee_info_request_prepared");
  });

  it("keeps a prepared link closed until an administrator sends it", () => {
    expect(portal).toContain('request.status === "prepared"');
    expect(fn).toContain('action === "send_prepared"');
  });

  it("reads as Not sent while it waits", () => {
    expect(INFO_REQUEST_STATE_LABELS.prepared).toBe("Not sent");
    expect(
      infoRequestState({
        submitted_at: null,
        status: "prepared",
        cancelled_at: null,
        token_expires_at: new Date(Date.now() + 86400000).toISOString(),
        opened_at: null,
      } as never),
    ).toBe("prepared");
  });
});
