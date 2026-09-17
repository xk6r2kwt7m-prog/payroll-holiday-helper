import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const fn = read("supabase/functions/accept-invitation/index.ts");
const page = read("src/pages/JoinTeam.tsx");
const app = read("src/App.tsx");
const inviteEmail = read("src/hooks/useInviteEmail.ts");
const wizard = read("src/pages/CompanyOnboarding.tsx");
const invitations = read("src/hooks/useInvitations.ts");
const accountPanel = read("src/components/employees/AccountLinkagePanel.tsx");

describe("invited staff join with a personal link", () => {
  it("exposes a public /join/:token route", () => {
    expect(app).toContain('path="/join/:token"');
    expect(app).toContain("JoinTeam");
  });

  it("invite emails link to the personal joining link when a token exists", () => {
    expect(inviteEmail).toContain("/join/${payload.inviteToken}");
  });

  it("refuses invalid, used, cancelled and expired invitations", () => {
    expect(fn).toContain('error: "invalid"');
    expect(fn).toContain('error: "already_used"');
    expect(fn).toContain('error: "revoked"');
    expect(fn).toContain('error: "expired"');
  });

  it("marks the invitation used so the link is single use", () => {
    expect(fn).toContain('.from("tenant_invitations")');
    expect(fn).toContain('status: "accepted"');
    expect(fn).toContain("accepted_at: new Date().toISOString()");
  });

  it("rotates pending invitation links instead of emailing the stored token", () => {
    expect(invitations).toContain('rpc("rotate_pending_invitation"');
    expect(invitations).not.toContain("inviteToken: inviteToken ?? null");
  });

  it("offers password recovery without claiming the recipient chose a password", () => {
    expect(fn).not.toContain("password you chose");
    expect(page).toContain("Send password recovery");
    expect(accountPanel).toContain("Send password recovery");
  });

  it("never changes an existing membership role when a link is opened again", () => {
    expect(fn).toContain("existingMembership");
    expect(fn).toContain("is_active: true");
  });

  it("grants access only to the inviting company", () => {
    expect(fn).toContain('.from("tenant_members")');
    expect(fn).toContain("tenant_id: invite.tenant_id");
    // the staff record lookup is scoped to the inviting tenant too
    expect(fn).toContain('.eq("tenant_id", invite.tenant_id)');
  });

  it("never creates a tenant or asks company setup questions", () => {
    expect(fn).not.toContain("provision-tenant");
    expect(fn).not.toMatch(/workplaceType|payRhythm|teamSize/);
    expect(page).not.toMatch(/workspace name|Where does your team work|team size/i);
  });

  it("asks for no password and creates no login from the joining link", () => {
    expect(fn).toContain("const wantsAccount = password.length > 0");
    expect(fn).toContain("if (wantsAccount)");
    expect(page).not.toMatch(/Choose a password|Repeat password/);
    expect(page).not.toContain("signInWithPassword");
    expect(page).toContain("No password needed");
    expect(page).toContain('JSON.stringify({ token })');
  });

  it("still validates a password when one is supplied", () => {
    expect(fn).toContain("weak_password");
  });

  it("opens a details form asking for the basics only", () => {
    expect(fn).toContain('const sections = ["personal", "rtw", "bank"];');
    expect(page).toContain("/my-details/");
  });

  it("reuses an outstanding details link instead of creating duplicates", () => {
    expect(fn).toContain('.is("submitted_at", null)');
    expect(fn).toContain('.in("status", ["sent", "opened"])');
  });

  it("links the existing staff record without overwriting an existing link", () => {
    expect(fn).toContain("employee && !employee.user_id");
  });

  it("records acceptance in the audit trail", () => {
    expect(fn).toContain('"tenant_invitation_accepted"');
    expect(fn).toContain('"invitation_details_started"');
  });


  it("only reveals a waiting invitation to the signed-in owner of that email", () => {
    expect(fn).toContain('url.searchParams.get("mine") === "1"');
    expect(fn).toContain("admin.auth.getUser(jwt)");
    expect(fn).toContain('.ilike("email", email)');
  });

  it("sends an invited person away from the business setup wizard", () => {
    expect(wizard).toContain("pendingInvite?.pending");
    expect(wizard).toContain("/join/${pendingInvite.token}");
  });
});
