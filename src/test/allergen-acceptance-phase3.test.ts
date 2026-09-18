/**
 * Pre-publication management acceptance checks.
 *
 * Verifies the condensed course keeps every critical control, that the proposed
 * certificate and reminder policies stay inactive, that assignment previews
 * never contact staff, and that the excluded flavours remain excluded.
 */

import { describe, expect, it } from "vitest";
import {
  ALLERGEN_SAFETY_LESSONS,
  ALLERGEN_COURSE_TOTAL_MINUTES,
  ALLERGEN_COURSE_ORIGINAL_MINUTES,
} from "@/data/allergen/allergen-safety-lessons";
import { ALLERGEN_QUESTION_BANK } from "@/data/allergen/allergen-safety-questions";
import { selectQuestionBank, EXCLUDED_FLAVOUR_NAMES } from "@/lib/allergen-course";
import { buildAssignmentPreview, DEFAULT_RENEWAL_SETTINGS, reminderSchedule } from "@/lib/allergen-certification";
import {
  OUTSTANDING_EVIDENCE_REQUESTS,
  PROPOSED_CERTIFICATE_POLICY,
  PROPOSED_REMINDERS,
} from "@/data/allergen/allergen-acceptance-policy";

const allText = ALLERGEN_SAFETY_LESSONS.flatMap((l) =>
  l.sections.flatMap((s) => [s.heading, ...s.paragraphs, s.example ?? ""]),
).join(" \n ");

describe("condensed course duration", () => {
  it("lands inside the 45–60 minute target", () => {
    expect(ALLERGEN_COURSE_TOTAL_MINUTES).toBeGreaterThanOrEqual(45);
    expect(ALLERGEN_COURSE_TOTAL_MINUTES).toBeLessThanOrEqual(60);
  });

  it("is shorter than the original and records the original time per lesson", () => {
    expect(ALLERGEN_COURSE_TOTAL_MINUTES).toBeLessThan(ALLERGEN_COURSE_ORIGINAL_MINUTES);
    for (const l of ALLERGEN_SAFETY_LESSONS) {
      expect(l.original_minutes).toBeGreaterThanOrEqual(l.estimated_minutes);
      expect(l.condensed && l.condensed.length).toBeTruthy();
    }
  });

  it("still has all 16 lessons, each mandatory with at least one required section", () => {
    expect(ALLERGEN_SAFETY_LESSONS).toHaveLength(16);
    for (const l of ALLERGEN_SAFETY_LESSONS) {
      expect(l.mandatory).toBe(true);
      expect(l.sections.some((s) => s.mandatory)).toBe(true);
      for (const s of l.sections) expect(s.sources.length).toBeGreaterThan(0);
    }
  });
});

describe("no critical control was removed", () => {
  const controls: [string, RegExp][] = [
    ["peanut/tree-nut separation", /two separate entries|Peanuts are a legume/i],
    ["clarify a nut allergy", /peanuts, tree nuts or both/i],
    ["Satay Chicken peanuts, no tree nuts", /Satay Chicken contains peanuts .*does not contain tree nuts/i],
    ["ask every table", /Ask whether anybody at the table/i],
    ["record guest, allergen and dishes", /which guest is affected/i],
    ["repeat for later orders", /repeats for desserts, sides/i],
    ["POS allergy tag", /tagged against the affected guest's dishes/i],
    ["fresh printed ticket", /fresh kitchen ticket is printed/i],
    ["no handwritten additions", /Handwritten allergen additions are prohibited/i],
    ["three-way acknowledgement", /acknowledged back verbally/i],
    ["cross-contact routes", /Shared utensils, shared oil/i],
    ["discard and remake", /discarded and remade/i],
    ["gluten-free equipment", /gluten-free equipment/i],
    ["black plate is identification only", /does not make the food safe/i],
    ["tempura garnish only before preparation", /omitted only when the allergy is declared before the dish is prepared/i],
    ["Nutella hazelnut and added mixed nuts", /Nutella contains hazelnut.*mixed nuts/i],
    ["shared dessert fryer", /fryer/i],
    ["non-14 ingredients", /Garlic, onion, mushrooms/i],
    ["takeaway and delivery", /delivery or collection order is tagged/i],
    ["call 999", /Call 999 straight away/i],
    ["near-miss reporting", /reported to the manager the same shift/i],
  ];

  for (const [name, re] of controls) {
    it(`retains: ${name}`, () => {
      expect(allText).toMatch(re);
    });
  }

  it("keeps a restaurant example in every third of the course", () => {
    const withExample = ALLERGEN_SAFETY_LESSONS.filter((l) => l.sections.some((s) => s.example));
    expect(withExample.length).toBeGreaterThanOrEqual(6);
  });

  it("never claims a dish is allergen-free or that removing an allergen makes it safe", () => {
    // "nut-free" only ever appears as something staff must NOT say.
    const sentences = allText.split(/(?<=[.?!])\s+/);
    for (const s of sentences) {
      if (/nut[- ]free|allergen[- ]free/i.test(s)) {
        expect(s).toMatch(/must not|do not|never|not describ/i);
      }
    }
    expect(allText).toMatch(/never pick an ingredient off and serve the same plate/i);
    expect(allText).toMatch(/never pick the peanuts off and serve the same dish/i);
    expect(allText).toMatch(/does not make the food safe/i);
  });
});

describe("scored flavour exclusions hold after condensing", () => {
  it("excludes the unconfirmed and reference-only flavours", () => {
    for (const f of ["Tempura Aubergine", "Corn Fritters", "Laksa Soup", "Homemade Chilli Sauce"]) {
      expect(EXCLUDED_FLAVOUR_NAMES).toContain(f);
    }
    const bank = selectQuestionBank({
      bank: ALLERGEN_QUESTION_BANK,
      dishes: [],
      conflicts: [],
      branchId: null,
      seed: "acceptance",
    });
    for (const q of bank.questions) {
      expect(EXCLUDED_FLAVOUR_NAMES).not.toContain(q.flavour ?? "");
    }
  });

  it("keeps both batter evidence requests open with their required documents", () => {
    expect(OUTSTANDING_EVIDENCE_REQUESTS).toHaveLength(2);
    for (const r of OUTSTANDING_EVIDENCE_REQUESTS) {
      expect(r.status).toBe("open");
      expect(r.required.length).toBeGreaterThanOrEqual(5);
      expect(r.effect).toMatch(/not confirmed/i);
    }
  });
});

describe("question quality", () => {
  const active = ALLERGEN_QUESTION_BANK.filter((q) => q.active);

  it("single-answer questions have exactly one defensible answer", () => {
    for (const q of active.filter((q) => q.type !== "multi")) {
      expect(q.correct).toHaveLength(1);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("multiple-answer questions ask the learner to choose all that apply", () => {
    for (const q of active.filter((q) => q.type === "multi")) {
      expect(q.correct.length).toBeGreaterThan(1);
      expect(q.prompt.toLowerCase()).toMatch(/all that apply/);
    }
  });

  it("every active question carries an explanation and an approved source", () => {
    for (const q of active) {
      expect(q.explanation.length).toBeGreaterThan(10);
      expect(q.sources.length).toBeGreaterThan(0);
    }
  });

  it("randomising the option order does not change the meaning", () => {
    const a = selectQuestionBank({ bank: ALLERGEN_QUESTION_BANK, dishes: [], conflicts: [], seed: "s1" });
    const b = selectQuestionBank({ bank: ALLERGEN_QUESTION_BANK, dishes: [], conflicts: [], seed: "s2" });
    expect(a.questions.map((q) => q.correct.join("|"))).toEqual(b.questions.map((q) => q.correct.join("|")));
    for (const q of a.questions) {
      expect([...a.optionOrder[q.id]].sort()).toEqual([...b.optionOrder[q.id]].sort());
    }
  });
});

describe("assignment control review", () => {
  const candidates = [
    { id: "p1", name: "FOH Carnaby", branch_id: "carnaby", audience: "foh" as const, eligible: true, completedVersions: [], certificateStanding: "none" as const },
    { id: "p2", name: "Kitchen Carnaby", branch_id: "carnaby", audience: "kitchen" as const, eligible: true, completedVersions: [], certificateStanding: "none" as const },
    { id: "p3", name: "FOH Brixton", branch_id: "brixton", audience: "foh" as const, eligible: true, completedVersions: [2], certificateStanding: "valid" as const },
    { id: "p4", name: "Leaver", branch_id: "brixton", audience: "foh" as const, eligible: false, ineligibleReason: "Left the business — not assignable.", completedVersions: [], certificateStanding: "none" as const },
    { id: "p5", name: "Expired", branch_id: "fitzrovia", audience: "kitchen" as const, eligible: true, completedVersions: [2], certificateStanding: "expired" as const },
  ];

  it("selects one person, several people, a site, a role and all eligible staff", () => {
    expect(buildAssignmentPreview({ candidates, mode: "people", selectedIds: ["p1"], courseVersion: 2 }).recipients).toHaveLength(1);
    expect(buildAssignmentPreview({ candidates, mode: "people", selectedIds: ["p1", "p2"], courseVersion: 2 }).recipients).toHaveLength(2);
    expect(buildAssignmentPreview({ candidates, mode: "branch", branchId: "carnaby", courseVersion: 2 }).recipients).toHaveLength(2);
    expect(buildAssignmentPreview({ candidates, mode: "role", role: "kitchen", courseVersion: 2 }).recipients.map((r) => r.id)).toEqual(["p2", "p5"]);
    const all = buildAssignmentPreview({ candidates, mode: "all", courseVersion: 2 });
    expect(all.recipients.map((r) => r.id)).toEqual(["p1", "p2", "p5"]);
    expect(all.alreadyCompleted.map((p) => p.id)).toEqual(["p3"]);
    expect(all.excluded.map((p) => p.id)).toEqual(["p4"]);
  });

  it("honours administrator exclusions and offers reassignment for expired training", () => {
    const out = buildAssignmentPreview({ candidates, mode: "all", excludedIds: ["p1"], courseVersion: 2 });
    expect(out.recipients.map((r) => r.id)).not.toContain("p1");
    expect(out.excluded.find((e) => e.id === "p1")?.reason).toMatch(/administrator/i);
    expect(out.recipients.find((r) => r.id === "p5")?.note).toMatch(/expired/i);
  });

  it("can reassign the same version only when the administrator allows it", () => {
    const out = buildAssignmentPreview({ candidates, mode: "all", courseVersion: 2, allowReassign: true });
    expect(out.recipients.map((r) => r.id)).toContain("p3");
    expect(out.alreadyCompleted).toHaveLength(0);
  });

  it("never marks an assignment as sent", () => {
    expect(buildAssignmentPreview({ candidates, mode: "all", courseVersion: 2 }).deliveryState).toBe("not_sent");
  });
});

describe("policies stay proposals only", () => {
  it("proposes twelve-month validity and all ten certificate clauses", () => {
    expect(DEFAULT_RENEWAL_SETTINGS.validity_months).toBe(12);
    expect(PROPOSED_CERTIFICATE_POLICY).toHaveLength(10);
    expect(PROPOSED_CERTIFICATE_POLICY.map((c) => c.label)).toContain("Superseding");
  });

  it("prepares eight reminders, each with wording, recipient and channel, and sends none", () => {
    expect(PROPOSED_REMINDERS).toHaveLength(8);
    for (const r of PROPOSED_REMINDERS) {
      expect(r.wording.length).toBeGreaterThan(20);
      expect(r.recipient.length).toBeGreaterThan(3);
      expect(r.channel.length).toBeGreaterThan(3);
    }
    expect(DEFAULT_RENEWAL_SETTINGS.automatic_sending_enabled).toBe(false);
    const plan = reminderSchedule("2027-01-31", DEFAULT_RENEWAL_SETTINGS, "2026-09-18");
    expect(plan.every((p) => p.automatic === false)).toBe(true);
  });
});
