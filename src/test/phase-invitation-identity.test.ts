import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  findPossibleDuplicates,
  blockingDuplicates,
  blockingMessage,
  type ExistingRecord,
} from "@/lib/duplicate-check";
import { invitationState, invitationPersonName, type InvitationRow } from "@/hooks/useInvitations";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const fn = read("supabase/functions/accept-invitation/index.ts");
const hook = read("src/hooks/useInvitations.ts");
const dialog = read("src/components/employees/InviteEmployeeDialog.tsx");
const panel = read("src/components/employees/InvitationsPanel.tsx");

const inv = (over: Partial<InvitationRow> = {}): InvitationRow => ({
  id: "i1",
  tenant_id: "t1",
  email: "a@b.com",
  role: "employee",
  token: "tok",
  status: "pending",
  created_at: "2026-09-18T12:00:00Z",
  expires_at: "2026-09-25T12:00:00Z",
  accepted_at: null,
  opened_at: null,
  last_reminder_at: null,
  reminder_count: 0,
  employee_id: "e1",
  employees: { id: "e1", forename: "Lotanna", surname: "Moore-Okoli", status: "onboarding" },
  ...over,
});

describe("an invitation belongs to one named staff record", () => {
  it("resolves the person from the attached record, not the email address", () => {
    expect(fn).toContain("if (invite.employee_id)");
    expect(fn).toContain('.eq("id", invite.employee_id)');
  });

  it("refuses to guess when two current records share the email address", () => {
    expect(fn).toContain('error: "ambiguous_record"');
    expect(fn).toContain("current.length > 1");
  });

  it("never falls back to a leaver, archived or test record", () => {
    expect(fn).toContain('e.status !== "leaver"');
    expect(fn).toContain("!e.archived_at");
    expect(fn).toContain("!e.is_test_record");
  });

  it("records when the link was first opened", () => {
    expect(fn).toContain("opened_at: new Date().toISOString()");
  });

  it("ties new invitations to the staff record that was just created", () => {
    expect(dialog).toContain("employee_id: employee.id");
    expect(hook).toContain("employee_id: employeeId ?? null");
  });

  it("shows the name and email for confirmation before sending", () => {
    expect(dialog).toContain('id="confirm-name"');
    expect(dialog).toContain('id="confirm-email"');
    expect(dialog).toContain("Review invite");
  });
});

describe("one email address cannot serve two current staff records", () => {
  const existing: ExistingRecord[] = [
    { id: "old", forename: "Lautasha", surname: "Chipindu", email: "lotannamoore1@gmail.com", status: "leaver" },
    { id: "cur", forename: "Someone", surname: "Else", email: "taken@ud.com", status: "active" },
  ];

  it("blocks a current record sharing the address", () => {
    const m = findPossibleDuplicates({ forename: "New", surname: "Person", email: "taken@ud.com" }, existing);
    expect(blockingDuplicates(m)).toHaveLength(1);
    expect(blockingMessage(m)).toContain("Someone Else");
  });

  it("only warns when the address sits on a leaver record", () => {
    const m = findPossibleDuplicates({ forename: "Lotanna", surname: "Moore-Okoli", email: "lotannamoore1@gmail.com" }, existing);
    expect(m.length).toBeGreaterThan(0);
    expect(blockingDuplicates(m)).toHaveLength(0);
    expect(blockingMessage(m)).toBeNull();
  });

  it("treats an archived record as not current", () => {
    const m = findPossibleDuplicates({ email: "x@ud.com" }, [
      { id: "a", forename: "Arch", surname: "Ived", email: "x@ud.com", status: "active", archived_at: "2026-01-01" },
    ]);
    expect(blockingDuplicates(m)).toHaveLength(0);
  });
});

describe("management view of invitations", () => {
  it("reports a truthful state for each invitation", () => {
    expect(invitationState(inv())).toBe("waiting");
    expect(invitationState(inv({ opened_at: "2026-09-18T13:00:00Z" }))).toBe("opened");
    expect(invitationState(inv({ accepted_at: "2026-09-18T13:00:00Z", status: "accepted" }))).toBe("joined");
    expect(invitationState(inv({ status: "cancelled" }))).toBe("cancelled");
    expect(invitationState(inv({ expires_at: "2026-09-01T12:00:00Z" }))).toBe("expired");
  });

  it("shows the attached staff name and flags invitations without one", () => {
    expect(invitationPersonName(inv())).toBe("Lotanna Moore-Okoli");
    expect(invitationPersonName(inv({ employees: null }))).toBe("No staff record attached");
    expect(panel).toContain("No staff record is attached");
  });

  it("sends a reminder on the same link without replacing it", () => {
    expect(hook).toContain("useSendInvitationReminder");
    expect(hook).toContain("inviteToken: inv.token");
    expect(hook).not.toMatch(/useSendInvitationReminder[\s\S]{0,1200}rotate_pending_invitation/);
  });

  it("refuses reminders for joined, cancelled or expired invitations", () => {
    expect(hook).toContain("already joined");
    expect(hook).toContain("was cancelled");
    expect(hook).toContain("has expired");
  });

  it("offers reminder, new link and cancel, and never sends automatically", () => {
    expect(panel).toContain("Send reminder");
    expect(panel).toContain("Send new link");
    expect(panel).toContain("Cancel");
    expect(hook).toContain("no reminder is ever sent automatically");
  });
});
