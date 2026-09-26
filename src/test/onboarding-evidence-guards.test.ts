import { describe, expect, it } from "vitest";
import { londonDateKey } from "../../supabase/functions/_shared/training-reminder-policy";
import { effectiveRtwStatus } from "@/lib/right-to-work-review";
import { evaluateContractAutoDraft } from "@/lib/contract-auto-draft";
import { inductionReminderDue } from "../../supabase/functions/_shared/induction-reminder-policy";

describe("right-to-work expiry", () => {
 it("keeps an unexpired review valid through its expiry day", () => {
  expect(effectiveRtwStatus("verified", "2026-09-26", "2026-09-26")).toBe("verified");
 });
 it("blocks contract readiness after permission expired", () => {
  expect(evaluateContractAutoDraft({changes:[],rtwStatus:"verified",rtwExpiresOn:"2026-09-25",today:"2026-09-26"}).ready).toBe(false);
 });
 it("uses the London date at the summer-time midnight boundary", () => {
  const today = londonDateKey(new Date("2026-09-25T23:30:00Z"));
  expect(effectiveRtwStatus("verified", "2026-09-25", today)).toBe("expired");
 });
 it("requires review of malformed dates", () => {
  expect(effectiveRtwStatus("verified", "2026-02-31", "2026-01-01")).toBe("pending_review");
 });
 it("never upgrades a submitted record just because its expiry is future", () => {
  expect(effectiveRtwStatus("submitted", "2099-01-01")).toBe("submitted");
 });
});
describe("induction reminder catch-up", () => {
 const pack={sent_at:"2026-09-01T09:00:00Z"};
 it("catches a missed third-day run once on day four", () => {
  expect(inductionReminderDue(pack,new Date("2026-09-05T09:00:00Z"))).toBe(true);
  expect(inductionReminderDue({...pack,reminder_sent_at:"2026-09-05T09:00:00Z"},new Date("2026-09-06T09:00:00Z"))).toBe(false);
 });
 it("coalesces a backlog into one latest reminder", () => {
  expect(inductionReminderDue({...pack,reminder_sent_at:"2026-09-04T09:00:00Z"},new Date("2026-09-25T09:00:00Z"))).toBe(true);
  expect(inductionReminderDue({...pack,reminder_sent_at:"2026-09-25T09:00:00Z"},new Date("2026-09-26T09:00:00Z"))).toBe(false);
 });
 it("does not chase cancelled packs or expired links", () => {
  expect(inductionReminderDue({...pack,status:"cancelled"},new Date("2026-09-25"))).toBe(false);
  expect(inductionReminderDue({...pack,token_expires_at:"2026-09-10"},new Date("2026-09-25"))).toBe(false);
 });
 it("refuses malformed/future timing evidence", () => {
  expect(inductionReminderDue({...pack,reminder_sent_at:"bad"},new Date("2026-09-25"))).toBe(false);
  expect(inductionReminderDue({sent_at:"2099-01-01"},new Date("2026-09-25"))).toBe(false);
 });
});
