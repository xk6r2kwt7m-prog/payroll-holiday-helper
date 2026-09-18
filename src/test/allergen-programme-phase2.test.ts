import { describe, it, expect } from "vitest";
import {
  assignmentStatus,
  certificateStanding,
  certificationGate,
  certificateNumber,
  daysBetween,
  expiryFor,
  markObservation,
  observationItemsFor,
  reminderSchedule,
  newVersionEffect,
  DEFAULT_RENEWAL_SETTINGS,
  ASSIGNMENT_STATUS_LABELS,
} from "@/lib/allergen-certification";
import { PRACTICAL_SIGNOFF_TEMPLATE } from "@/data/allergen/allergen-practical-signoff";
import { EXCLUDED_FLAVOUR_NAMES, selectQuestionBank } from "@/lib/allergen-course";
import { ALLERGEN_QUESTION_BANK } from "@/data/allergen/allergen-safety-questions";
import { ALLERGEN_SAFETY_LESSONS } from "@/data/allergen/allergen-safety-lessons";

const REQUIRED = ALLERGEN_SAFETY_LESSONS.filter((l) => l.mandatory).length;

const passedAssessment = { passed: true, scorePercent: 92, criticalMissed: [] as string[] };
const signedObservation = {
  outcome: "passed",
  signedAt: "2026-09-18T10:00:00Z",
  signedByName: "A Manager",
  signerIsAuthorisedManager: true,
};

function allSeen(audience: "foh" | "kitchen" | "both") {
  const items = observationItemsFor(audience);
  return Object.fromEntries(items.map((i) => [i.ref, { seen: true }]));
}

describe("practical observation marking", () => {
  it("splits the template by role and always includes shared lines", () => {
    const foh = observationItemsFor("foh");
    const kitchen = observationItemsFor("kitchen");
    expect(foh.length).toBeGreaterThan(0);
    expect(kitchen.length).toBeGreaterThan(0);
    expect(foh.every((i) => i.audience === "foh" || i.audience === "both")).toBe(true);
    expect(kitchen.every((i) => i.audience === "kitchen" || i.audience === "both")).toBe(true);
    expect(observationItemsFor("both").length).toBe(PRACTICAL_SIGNOFF_TEMPLATE.items.length);
  });

  it("stays in progress until every line is marked", () => {
    const items = observationItemsFor("foh");
    const partial = markObservation(items, { [items[0].ref]: { seen: true } });
    expect(partial.outcome).toBe("in_progress");
    expect(partial.outstanding.length).toBe(items.length - 1);
  });

  it("passes only when every line was seen", () => {
    const items = observationItemsFor("foh");
    const marked = markObservation(items, allSeen("foh"));
    expect(marked.outcome).toBe("passed");
    expect(marked.itemsSeen).toBe(marked.itemsTotal);
    expect(marked.criticalMissed).toEqual([]);
  });

  it("fails as not yet competent when a critical line was not seen", () => {
    const items = observationItemsFor("foh");
    const results = { ...allSeen("foh") } as Record<string, { seen: boolean }>;
    const critical = items.find((i) => i.critical)!;
    results[critical.ref] = { seen: false };
    const marked = markObservation(items, results);
    expect(marked.outcome).toBe("not_yet_competent");
    expect(marked.criticalMissed).toContain(critical.ref);
  });
});

describe("certification gate — all three approved gates", () => {
  it("issues only when lessons, assessment and a signed practical pass are all in place", () => {
    const gate = certificationGate({
      lessonsComplete: REQUIRED,
      lessonsRequired: REQUIRED,
      mandatoryOutstanding: [],
      assessment: passedAssessment,
      observation: signedObservation,
    });
    expect(gate.eligible).toBe(true);
    expect(gate.blockers).toEqual([]);
    expect(gate.status).toBe("Ready to certify");
  });

  it("blocks when a required lesson is outstanding", () => {
    const gate = certificationGate({
      lessonsComplete: REQUIRED - 1,
      lessonsRequired: REQUIRED,
      mandatoryOutstanding: ["Suspected anaphylaxis"],
      assessment: passedAssessment,
      observation: signedObservation,
    });
    expect(gate.eligible).toBe(false);
    expect(gate.blockers.join(" ")).toMatch(/lessons not finished/i);
  });

  it("blocks when the assessment was not passed", () => {
    const gate = certificationGate({
      lessonsComplete: REQUIRED,
      lessonsRequired: REQUIRED,
      mandatoryOutstanding: [],
      assessment: { passed: false, scorePercent: 70, criticalMissed: ["q-crit-03"] },
      observation: signedObservation,
    });
    expect(gate.eligible).toBe(false);
    expect(gate.blockers.join(" ")).toMatch(/assessment has not been passed/i);
  });

  it("blocks when a critical-safety question was missed even at a high score", () => {
    const gate = certificationGate({
      lessonsComplete: REQUIRED,
      lessonsRequired: REQUIRED,
      mandatoryOutstanding: [],
      assessment: { passed: true, scorePercent: 95, criticalMissed: ["q-crit-01"] },
      observation: signedObservation,
    });
    expect(gate.eligible).toBe(false);
    expect(gate.blockers.join(" ")).toMatch(/critical-safety question/i);
  });

  it("blocks when the practical observation is missing, unsigned, unpassed or unauthorised", () => {
    const base = {
      lessonsComplete: REQUIRED,
      lessonsRequired: REQUIRED,
      mandatoryOutstanding: [] as string[],
      assessment: passedAssessment,
    };
    expect(certificationGate({ ...base, observation: null }).eligible).toBe(false);
    expect(
      certificationGate({ ...base, observation: { ...signedObservation, outcome: "in_progress" } }).eligible,
    ).toBe(false);
    expect(
      certificationGate({ ...base, observation: { ...signedObservation, signedAt: null } }).eligible,
    ).toBe(false);
    expect(
      certificationGate({
        ...base,
        observation: { ...signedObservation, signerIsAuthorisedManager: false },
      }).eligible,
    ).toBe(false);
  });

  it("shows the awaiting-practical status once the assessment is passed but the practical is not", () => {
    const gate = certificationGate({
      lessonsComplete: REQUIRED,
      lessonsRequired: REQUIRED,
      mandatoryOutstanding: [],
      assessment: passedAssessment,
      observation: null,
    });
    expect(gate.status).toBe("Assessment passed — awaiting practical sign-off");
  });

  it("refuses a second certificate while a valid one exists", () => {
    const gate = certificationGate({
      lessonsComplete: REQUIRED,
      lessonsRequired: REQUIRED,
      mandatoryOutstanding: [],
      assessment: passedAssessment,
      observation: signedObservation,
      existingValidCertificate: true,
    });
    expect(gate.eligible).toBe(false);
    expect(gate.blockers.join(" ")).toMatch(/already exists/i);
  });
});

describe("assignment tracking", () => {
  const base = {
    mandatoryOutstanding: [] as string[],
    sectionsComplete: 0,
    attempts: [] as { status: string; outcome: string | null; passed: boolean | null }[],
    coachingRecorded: false,
    observation: null,
    certificateIssued: false,
  };

  it("reports each stage in turn", () => {
    expect(assignmentStatus({ ...base, mandatoryOutstanding: ["x"] })).toBe("not_started");
    expect(assignmentStatus({ ...base, mandatoryOutstanding: ["x"], sectionsComplete: 3 })).toBe("lessons_in_progress");
    expect(assignmentStatus({ ...base, sectionsComplete: 40 })).toBe("lessons_complete");
    expect(
      assignmentStatus({ ...base, sectionsComplete: 40, attempts: [{ status: "in_progress", outcome: null, passed: null }] }),
    ).toBe("assessment_in_progress");
  });

  it("requires manager coaching after two failed attempts and clears once recorded", () => {
    const two = [
      { status: "submitted", outcome: "failed", passed: false },
      { status: "submitted", outcome: "manager_coaching_required", passed: false },
    ];
    expect(assignmentStatus({ ...base, sectionsComplete: 40, attempts: two })).toBe("manager_coaching_required");
    expect(
      assignmentStatus({ ...base, sectionsComplete: 40, attempts: two, coachingRecorded: true }),
    ).toBe("assessment_in_progress");
  });

  it("stops at awaiting practical sign-off after a pass, and only completes with a certificate", () => {
    const passedAttempt = [{ status: "submitted", outcome: "passed_awaiting_practical", passed: true }];
    expect(assignmentStatus({ ...base, sectionsComplete: 40, attempts: passedAttempt })).toBe(
      "passed_awaiting_practical",
    );
    expect(
      assignmentStatus({ ...base, sectionsComplete: 40, attempts: passedAttempt, certificateIssued: true }),
    ).toBe("complete");
    expect(ASSIGNMENT_STATUS_LABELS.passed_awaiting_practical).toBe(
      "Assessment passed — awaiting practical sign-off",
    );
  });
});

describe("validity, expiry and reminders", () => {
  it("works out the expiry date from the validity period", () => {
    expect(expiryFor("2026-09-18", 12)).toBe("2027-09-18");
    expect(expiryFor("2026-01-31", 1)).toBe("2026-02-28");
    expect(daysBetween("2026-09-18", "2026-09-28")).toBe(10);
  });

  it("plans reminders before and after expiry without sending anything", () => {
    const plan = reminderSchedule("2027-09-18", DEFAULT_RENEWAL_SETTINGS, "2026-09-18");
    expect(plan.length).toBe(
      DEFAULT_RENEWAL_SETTINGS.reminder_days_before.length + DEFAULT_RENEWAL_SETTINGS.overdue_reminder_days.length,
    );
    expect(plan.every((p) => p.automatic === false)).toBe(true);
    expect(plan[0].date).toBe("2027-07-20");
    expect(plan.some((p) => p.kind === "after_expiry")).toBe(true);
  });

  it("marks reminders as automatic only when management switches sending on", () => {
    const plan = reminderSchedule("2027-09-18", { ...DEFAULT_RENEWAL_SETTINGS, automatic_sending_enabled: true }, "2026-09-18");
    expect(plan.every((p) => p.automatic === true)).toBe(true);
  });

  it("reports certificate standing against today", () => {
    expect(certificateStanding({ status: "valid", expires_on: "2028-01-01" }, "2026-09-18")).toBe("valid");
    expect(certificateStanding({ status: "valid", expires_on: "2026-10-01" }, "2026-09-18")).toBe("expiring_soon");
    expect(certificateStanding({ status: "valid", expires_on: "2026-08-01" }, "2026-09-18")).toBe("expired");
    expect(certificateStanding({ status: "revoked", expires_on: "2028-01-01" }, "2026-09-18")).toBe("revoked");
    expect(certificateStanding({ status: "superseded", expires_on: "2028-01-01" }, "2026-09-18")).toBe("superseded");
  });

  it("defaults automatic sending to off and leaves new-version handling to a manager", () => {
    expect(DEFAULT_RENEWAL_SETTINGS.automatic_sending_enabled).toBe(false);
    expect(newVersionEffect(DEFAULT_RENEWAL_SETTINGS).action).toBe("manager_decides");
  });

  it("labels test certificate numbers apart from genuine ones", () => {
    expect(certificateNumber(1, 2026, false)).toBe("UD-ALL-2026-0001");
    expect(certificateNumber(1, 2026, true)).toBe("TEST-UD-ALL-2026-0001");
  });
});

describe("scoring exclusions remain in force", () => {
  it("keeps Tempura Aubergine and Corn Fritters out of scored questions", () => {
    expect(EXCLUDED_FLAVOUR_NAMES).toContain("Tempura Aubergine");
    expect(EXCLUDED_FLAVOUR_NAMES).toContain("Corn Fritters");
    const selection = selectQuestionBank({
      bank: ALLERGEN_QUESTION_BANK,
      dishes: [
        { dish_name: "Tempura Aubergine", is_confirmed: true, management_decision: "confirm", active_branch_ids: ["b1"] },
        { dish_name: "Corn Fritters", is_confirmed: true, management_decision: "confirm", active_branch_ids: ["b1"] },
      ],
      conflicts: [],
      branchId: "b1",
      seed: "phase2",
    });
    const used = selection.questions.map((q) => q.flavour).filter(Boolean);
    expect(used).not.toContain("Tempura Aubergine");
    expect(used).not.toContain("Corn Fritters");
  });
});
