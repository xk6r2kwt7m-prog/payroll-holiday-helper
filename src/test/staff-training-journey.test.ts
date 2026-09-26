import { describe, expect, it } from "vitest";
import type { TrainingAssignment } from "@/hooks/useTrainingLibrary";
import { getStaffTrainingStatus, staffTrainingJourney } from "@/lib/staff-training-journey";
import { londonDateKey, trainingReminderDecision } from "../../supabase/functions/_shared/training-reminder-policy";

const now = new Date(2026, 8, 26, 23, 59);
const assignment = (overrides: Partial<TrainingAssignment> = {}) => ({
  id: "one", status: "assigned", due_date: "2026-09-26", is_mandatory: true,
  training_library: { status: "published" }, ...overrides,
} as TrainingAssignment);

describe("staff learning plan", () => {
  it("keeps today's work due today until the day ends", () => {
    expect(getStaffTrainingStatus(assignment(), now)).toBe("due_now");
    expect(getStaffTrainingStatus(assignment({ due_date: "2026-09-25" }), now)).toBe("overdue");
  });
  it("orders by deadline, then mandatory status, without changing the source", () => {
    const rows = [assignment({ id: "later", due_date: "2026-10-04" }), assignment({ id: "late", due_date: "2026-09-20" })];
    expect(staffTrainingJourney(rows, now).next?.id).toBe("late");
    expect(rows[0].id).toBe("later");
  });
  it("excludes cancelled assignments and unpublished lessons from counts and next steps", () => {
    const rows = [assignment({ status: "cancelled" }), assignment({ training_library: { status: "draft" } as any })];
    expect(staffTrainingJourney(rows, now)).toMatchObject({ percent: 0, next: null, visible: [] });
  });
  it("does not call a quiz complete because a policy was acknowledged", () => {
    const row = assignment({ status: "acknowledged", acknowledged_at: "2026-09-26", training_library: { status: "published", requires_quiz: true } as any });
    expect(staffTrainingJourney([row], now).completed).toHaveLength(0);
    expect(staffTrainingJourney([row], now).next).toBe(row);
  });
  it("waits for quiz and acknowledgement before asking for practical sign-off", () => {
    const row = assignment({ signoff_required: true, viewed_at: "2026-09-26", training_library: { status: "published", requires_quiz: true } as any });
    expect(getStaffTrainingStatus(row, now)).not.toBe("awaiting_signoff");
    expect(getStaffTrainingStatus({ ...row, quiz_passed: true }, now)).toBe("awaiting_signoff");
  });
  it("separates manager actions from staff work and never reports them complete", () => {
    const row = assignment({ status: "completed", viewed_at: "2026-09-26", signoff_required: true });
    expect(staffTrainingJourney([row], now)).toMatchObject({ next: null, percent: 0, waiting: [row] });
  });
  it("reports fully evidenced completion", () => {
    const row = assignment({ status: "completed", signed_off_at: "2026-09-26", completed_at: "2026-09-26", acknowledged_at: "2026-09-26", quiz_passed: true, signoff_required: true,
      training_library: { status: "published", requires_quiz: true, requires_acknowledgement: true, requires_completion: true } as any });
    expect(staffTrainingJourney([row], now)).toMatchObject({ percent: 100, next: null });
  });
});

const reminder = (changes: Record<string, unknown> = {}) => ({ status: "viewed", due_date: "2026-09-25", training_library: { status: "published" }, employees: { status: "active" }, ...changes });
describe("training reminder policy", () => {
  it("uses the London calendar day during summer time", () => expect(londonDateKey(new Date("2026-09-25T23:30:00Z"))).toBe("2026-09-26"));
  it("includes viewed work rather than dropping it after opening", () => expect(trainingReminderDecision(reminder(), "2026-09-26")).toEqual({ daysUntil: -1, managerOnly: false }));
  it("continues weekly after seven days overdue", () => expect(trainingReminderDecision(reminder({ due_date: "2026-09-12" }), "2026-09-26")?.daysUntil).toBe(-14));
  it("avoids daily nagging between planned reminders", () => expect(trainingReminderDecision(reminder({ due_date: "2026-09-24" }), "2026-09-26")).toBeNull());
  it.each(["completed", "cancelled"])("does not chase %s work", status => expect(trainingReminderDecision(reminder({ status }), "2026-09-26")).toBeNull());
  it("addresses sign-off reminders to managers only", () => expect(trainingReminderDecision(reminder({ signoff_required: true, viewed_at: "2026-09-25" }), "2026-09-26")?.managerOnly).toBe(true));
  it("excludes leavers even when their raw active status is stale", () => expect(trainingReminderDecision(reminder({ employees: { status: "active", end_date: "2026-09-24" } }), "2026-09-26")).toBeNull());
  it("keeps staff working their notice eligible", () => expect(trainingReminderDecision(reminder({ employees: { status: "leaver", end_date: "2026-10-01" } }), "2026-09-26")).not.toBeNull());
  it("excludes tests, archives and missing profiles", () => {
    for (const employees of [null, { is_test_record: true }, { archived_at: "2026-01-01" }]) expect(trainingReminderDecision(reminder({ employees }), "2026-09-26")).toBeNull();
  });
});
