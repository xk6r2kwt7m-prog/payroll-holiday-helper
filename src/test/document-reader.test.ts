import { describe, expect, it } from "vitest";
import {
  splitIntoSections, looksLikeHeading, tidyDocumentText,
} from "../../supabase/functions/_shared/document-reader-sections";
import {
  approvedQuestions, canConfirmDocument, estimatedMinutes, isUsableQuestion,
  outstandingSummary, questionsForSection, readerStatusLabel, readingProgressPercent,
  type ReaderQuestion, type ReaderSection,
} from "@/lib/document-reader";
import {
  authorisedListCsv, boardTotals, buildAlcoholBoard, sitesWithNobodyAuthorised,
} from "@/lib/alcohol-board";

const section = (id: string, heading = id): ReaderSection => ({
  id, heading, body: "Some body text for this section.", sort_order: 0,
});
const question = (id: string, sectionId: string, status: ReaderQuestion["approval_status"]): ReaderQuestion => ({
  id, section_id: sectionId, question: "Q?", options: ["a", "b"], correct_index: 0, approval_status: status,
});

describe("splitting a document into reading sections", () => {
  it("removes page furniture", () => {
    expect(tidyDocumentText("Intro\n\nPage 2 of 9\n\n7\nMore")).toBe("Intro\n\nMore");
  });

  it("recognises headings", () => {
    expect(looksLikeHeading("FOOD SAFETY")).toBe(true);
    expect(looksLikeHeading("3.1 Allergen handling")).toBe(true);
    expect(looksLikeHeading("Staff must wash their hands before handling any food at all times.")).toBe(false);
  });

  it("splits on headings and keeps the order", () => {
    const text = [
      "FOOD SAFETY",
      "x".repeat(200),
      "ALLERGENS",
      "y".repeat(200),
    ].join("\n");
    const sections = splitIntoSections(text);
    expect(sections.map((s) => s.heading)).toEqual(["FOOD SAFETY", "ALLERGENS"]);
  });

  it("always returns something readable, even with no headings", () => {
    const sections = splitIntoSections("Just one paragraph of guidance.", "Policy");
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("Policy");
  });

  it("breaks very long sections into parts", () => {
    const long = Array.from({ length: 40 }, () => "sentence ".repeat(20)).join("\n\n");
    const sections = splitIntoSections(`RULES\n${long}`);
    expect(sections.length).toBeGreaterThan(1);
    expect(sections[0].heading).toContain("1 of");
  });
});

describe("what staff must finish before confirming a document", () => {
  const sections = [section("s1"), section("s2")];
  const questions = [question("q1", "s1", "approved"), question("q2", "s2", "suggested")];

  it("only counts approved questions", () => {
    expect(approvedQuestions(questions)).toHaveLength(1);
    expect(questionsForSection(questions, "s2")).toHaveLength(0);
  });

  it("blocks confirmation while a section is unread", () => {
    expect(canConfirmDocument(sections, questions, [
      { section_id: "s1", read: true, answered_correctly: true },
    ])).toBe(false);
  });

  it("blocks confirmation while an approved question is wrong", () => {
    expect(canConfirmDocument(sections, questions, [
      { section_id: "s1", read: true, answered_correctly: false },
      { section_id: "s2", read: true, answered_correctly: null },
    ])).toBe(false);
  });

  it("allows confirmation once read and answered correctly", () => {
    expect(canConfirmDocument(sections, questions, [
      { section_id: "s1", read: true, answered_correctly: true },
      { section_id: "s2", read: true, answered_correctly: null },
    ])).toBe(true);
  });

  it("does not block documents with no on-screen version", () => {
    expect(canConfirmDocument([], [], [])).toBe(true);
  });

  it("explains what is left in plain English", () => {
    expect(outstandingSummary(sections, questions, [])).toBe("2 sections left to read");
    expect(outstandingSummary(sections, questions, [
      { section_id: "s1", read: true, answered_correctly: null },
      { section_id: "s2", read: true, answered_correctly: null },
    ])).toBe("1 question to answer");
    expect(outstandingSummary(sections, questions, [
      { section_id: "s1", read: true, answered_correctly: true },
      { section_id: "s2", read: true, answered_correctly: null },
    ])).toBeNull();
  });

  it("reports reading progress and time", () => {
    expect(readingProgressPercent(sections, [{ section_id: "s1", read: true, answered_correctly: null }])).toBe(50);
    expect(estimatedMinutes(sections)).toBeGreaterThanOrEqual(1);
    expect(readerStatusLabel("ready", 4)).toContain("4 sections");
    expect(readerStatusLabel("failed")).toContain("could not");
  });

  it("rejects unusable draft questions", () => {
    expect(isUsableQuestion({ question: "Q", options: ["a", "b"], correct_index: 1 })).toBe(true);
    expect(isUsableQuestion({ question: "Q", options: ["a"], correct_index: 0 })).toBe(false);
    expect(isUsableQuestion({ question: "Q", options: ["a", "b"], correct_index: 5 })).toBe(false);
    expect(isUsableQuestion({ question: "  ", options: ["a", "b"], correct_index: 0 })).toBe(false);
  });
});

describe("who can sell alcohol board", () => {
  const base = {
    employee_id: "e",
    employees: { forename: "Ana", surname: "Silva", job_title: "Bartender", status: "active", archived_at: null },
  };
  const records = [
    { ...base, id: "1", branch: "Fitzrovia", status: "active", employee_signed_at: "2026-01-05T10:00:00Z", authoriser_confirmed_at: "2026-01-06T10:00:00Z", authoriser_name: "Philipp Chaykin", authoriser_licence_number: "17/05171/LIPERS" },
    { ...base, id: "2", branch: "Fitzrovia", status: "pending", employee_signed_at: null },
    { ...base, id: "3", branch: "Fitzrovia", status: "pending", employee_signed_at: "2026-01-07T10:00:00Z" },
    { ...base, id: "4", branch: "Carnaby", status: "revoked", revoked_at: "2026-02-01T10:00:00Z", revoked_reason: "Left the bar team" },
  ];
  const sites = buildAlcoholBoard(records as any, [
    { branch: "Fitzrovia", dps_name: "Philipp Chaykin", dps_personal_licence_number: "17/05171/LIPERS" },
  ]);

  it("groups by site and stage", () => {
    const fitzrovia = sites.find((s) => s.branch === "Fitzrovia")!;
    expect(fitzrovia.authorised).toHaveLength(1);
    expect(fitzrovia.awaitingSignature).toHaveLength(1);
    expect(fitzrovia.awaitingApproval).toHaveLength(1);
    expect(fitzrovia.dpsName).toBe("Philipp Chaykin");
  });

  it("counts the totals", () => {
    expect(boardTotals(sites)).toEqual({
      authorised: 1, awaitingSignature: 1, awaitingApproval: 1, notAuthorised: 1,
    });
  });

  it("warns about sites where nobody can sell alcohol", () => {
    expect(sitesWithNobodyAuthorised(sites)).toEqual(["Carnaby"]);
  });

  it("exports only authorised staff for an inspector", () => {
    const csv = authorisedListCsv(sites);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Ana Silva");
    expect(lines[1]).toContain("17/05171/LIPERS");
  });
});
