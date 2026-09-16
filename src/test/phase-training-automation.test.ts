import { describe, it, expect } from "vitest";
import {
  inductionReminderDue, inductionStage, inductionStageLabel, reissueDecisionLabel,
  reissueDecisionTone, reissueRequiresManagerDecision, shouldAutoAssignInduction,
  staffWhoCompletedPreviousVersion, startersNeedingInduction, suggestSignificance,
  unfinishedInductions,
} from "@/lib/training-automation";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe("induction reminders", () => {
  it("stays quiet in the first two days", () => {
    expect(inductionReminderDue({ id: "1", employee_id: "e", sent_at: daysAgo(1) })).toBe(false);
  });

  it("reminds on day 3, 7 and 14", () => {
    [3, 7, 14].forEach((d) => {
      expect(inductionReminderDue({ id: "1", employee_id: "e", sent_at: daysAgo(d) })).toBe(true);
    });
  });

  it("then reminds weekly while outstanding", () => {
    expect(inductionReminderDue({ id: "1", employee_id: "e", sent_at: daysAgo(21) })).toBe(true);
    expect(inductionReminderDue({ id: "1", employee_id: "e", sent_at: daysAgo(22) })).toBe(false);
  });

  it("never reminds twice on the same day", () => {
    expect(inductionReminderDue({
      id: "1", employee_id: "e", sent_at: daysAgo(7), reminder_sent_at: new Date().toISOString(),
    })).toBe(false);
  });

  it("never chases a completed, test or expired induction", () => {
    expect(inductionReminderDue({ id: "1", employee_id: "e", sent_at: daysAgo(7), completed_at: daysAgo(1) })).toBe(false);
    expect(inductionReminderDue({ id: "1", employee_id: "e", sent_at: daysAgo(7), is_test_send: true })).toBe(false);
    expect(inductionReminderDue({
      id: "1", employee_id: "e", sent_at: daysAgo(7), token_expires_at: daysAgo(1),
    })).toBe(false);
  });

  it("lists unfinished inductions oldest first with a plain stage", () => {
    const list = unfinishedInductions([
      { id: "a", employee_id: "1", sent_at: daysAgo(2) },
      { id: "b", employee_id: "2", sent_at: daysAgo(9), opened_at: daysAgo(8) },
      { id: "c", employee_id: "3", sent_at: daysAgo(5), completed_at: daysAgo(4) },
      { id: "d", employee_id: "4", sent_at: daysAgo(30), is_test_send: true },
    ]);
    expect(list.map((p) => p.id)).toEqual(["b", "a"]);
    expect(inductionStageLabel(list[0].stage)).toBe("Started, not finished");
    expect(inductionStage({ id: "c", employee_id: "3", completed_at: daysAgo(1) })).toBe("completed");
  });
});

describe("new document versions", () => {
  const items = [
    { document_id: "doc", document_version: 1, acknowledged_at: daysAgo(30), pack: { employee_id: "e1", completed_at: daysAgo(30) } },
    { document_id: "doc", document_version: 1, acknowledged_at: daysAgo(20), pack: { employee_id: "e2", completed_at: daysAgo(20) } },
    { document_id: "doc", document_version: 1, acknowledged_at: null, pack: { employee_id: "e3", completed_at: daysAgo(20) } },
    { document_id: "doc", document_version: 1, acknowledged_at: daysAgo(5), pack: { employee_id: "e4", completed_at: daysAgo(5), is_test_send: true } },
    { document_id: "other", document_version: 1, acknowledged_at: daysAgo(5), pack: { employee_id: "e5", completed_at: daysAgo(5) } },
  ];

  it("identifies exactly the staff who completed the previous version", () => {
    expect(staffWhoCompletedPreviousVersion(items, "doc", 1).sort()).toEqual(["e1", "e2"]);
  });

  it("ignores a different version of the same document", () => {
    expect(staffWhoCompletedPreviousVersion(items, "doc", 2)).toEqual([]);
  });

  it("never changes the version stored against an employee", () => {
    const before = JSON.stringify(items);
    staffWhoCompletedPreviousVersion(items, "doc", 1);
    expect(JSON.stringify(items)).toBe(before);
  });

  it("treats a replaced file as significant and detail-only edits as minor", () => {
    expect(suggestSignificance({ fileReplaced: true })).toBe("significant");
    expect(suggestSignificance({ changedFields: ["owner_name", "reference_number"] })).toBe("minor");
    expect(suggestSignificance({ changedFields: ["requires_signature"] })).toBe("significant");
  });

  it("holds a new version until a manager decides", () => {
    expect(reissueRequiresManagerDecision("pending")).toBe(true);
    ["no_action", "acknowledge", "retrain"].forEach((d) => {
      expect(reissueRequiresManagerDecision(d as any)).toBe(false);
      expect(reissueDecisionLabel(d as any).length).toBeGreaterThan(0);
      expect(["amber", "green", "grey"]).toContain(reissueDecisionTone(d as any));
    });
  });
});

describe("automatic induction for new starters", () => {
  it("is off unless switched on", () => {
    expect(shouldAutoAssignInduction(null)).toBe(false);
    expect(shouldAutoAssignInduction({})).toBe(false);
    expect(shouldAutoAssignInduction({ auto_assign_induction: true })).toBe(true);
  });

  it("only picks active staff with an email and no induction yet", () => {
    const packs = new Set(["has-pack"]);
    const result = startersNeedingInduction([
      { id: "new", email: "a@b.com", status: "starter" },
      { id: "has-pack", email: "c@d.com", status: "starter" },
      { id: "no-email", email: null, status: "starter" },
      { id: "leaver", email: "e@f.com", status: "leaver" },
      { id: "archived", email: "g@h.com", archived_at: daysAgo(1) },
      { id: "test", email: "i@j.com", is_test_record: true },
    ], packs);
    expect(result.map((e) => e.id)).toEqual(["new"]);
  });
});
