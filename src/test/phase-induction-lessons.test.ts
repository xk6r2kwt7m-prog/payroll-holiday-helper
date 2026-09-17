import { describe, it, expect } from "vitest";
import {
  INDUCTION_PACKS, allInductionLessons, approvalStatusLabel, completedAnOlderVersion,
  estimatedPackMinutes, getInductionPack, isLessonApproved, isLessonComplete,
  lessonContentFor, lessonRefByKey, lessonVersion, nextLesson, packIsComplete,
  packProgressPercent, packStatusSummary, releasedLessons, lessonsAwaitingApproval,
  suggestPackForJobTitle,
  type LessonApprovalRow, type LessonProgressRow,
} from "@/lib/induction-packs";
import { getLessonContent } from "@/data/training-standards/lessons";

const approved = (key: string, version: string): LessonApprovalRow => ({
  lesson_key: key, lesson_version: version, status: "approved",
});

describe("induction pack definitions", () => {
  it("has a pack for front of house, kitchen and managers", () => {
    expect(INDUCTION_PACKS.map((p) => p.role)).toEqual(["foh", "kitchen", "manager"]);
  });

  it("keeps manager material out of the staff packs", () => {
    const managerOnlyKeys = ["ud-manager-operations", "ud-quality-control"];
    for (const role of ["foh", "kitchen"] as const) {
      const keys = getInductionPack(role).lessons.map((l) => l.key);
      managerOnlyKeys.forEach((k) => expect(keys).not.toContain(k));
    }
    expect(getInductionPack("manager").restricted_to_managers).toBe(true);
  });

  it("every lesson in every pack has written content behind it", () => {
    for (const lesson of allInductionLessons()) {
      const content = lessonContentFor(lesson);
      expect(content, `missing content for ${lesson.key}`).not.toBeNull();
      expect(content!.module_title).toBe(lesson.title);
      expect(content!.sections.length).toBeGreaterThan(2);
      expect(content!.sources.length).toBeGreaterThan(0);
    }
  });

  it("every teaching point names a source that exists", () => {
    for (const lesson of allInductionLessons()) {
      const content = lessonContentFor(lesson)!;
      const ids = new Set(content.sources.map((s) => s.id));
      for (const section of content.sections) {
        for (const point of section.points ?? []) {
          expect(ids.has(point.source_id), `${lesson.key}: ${point.source_id}`).toBe(true);
        }
      }
    }
  });

  it("records what was deliberately left out and what still needs confirming", () => {
    for (const lesson of allInductionLessons()) {
      const content = lessonContentFor(lesson)!;
      expect(content.excluded_points.length).toBeGreaterThan(0);
      expect(content.quiz_support_notes.length).toBeGreaterThan(0);
    }
  });

  it("keeps manager-only lessons hidden from the staff-visible sections", () => {
    for (const key of ["ud-manager-operations", "ud-quality-control"]) {
      const content = getLessonContent(lessonRefByKey(key)!.title)!;
      expect(content.sections.every((s) => s.staff_visible === false)).toBe(true);
    }
  });
});

describe("choosing a pack", () => {
  it("sends kitchen roles to the kitchen pack", () => {
    ["Chef", "Sous Chef", "Kitchen Porter", "CPU prep", "Commis"].forEach((t) => {
      expect(suggestPackForJobTitle(t)).toBe("kitchen");
    });
  });

  it("sends managers and supervisors to the manager pack, even in the kitchen", () => {
    ["General Manager", "Supervisor", "Kitchen Manager", "Operations"].forEach((t) => {
      expect(suggestPackForJobTitle(t)).toBe("manager");
    });
  });

  it("defaults to front of house when the role is unknown", () => {
    expect(suggestPackForJobTitle(null)).toBe("foh");
    expect(suggestPackForJobTitle("")).toBe("foh");
    expect(suggestPackForJobTitle("Waiter")).toBe("foh");
  });
});

describe("nothing reaches staff before a manager releases it", () => {
  it("shows no lessons at all with no approvals", () => {
    expect(releasedLessons("foh", [])).toEqual([]);
    expect(nextLesson("foh", [], [])).toBeNull();
    expect(packProgressPercent("foh", [], [])).toBe(0);
    expect(estimatedPackMinutes("foh", [])).toBe(0);
    expect(packStatusSummary("foh", [], [])).toBe(
      "Your induction is being prepared — nothing to read yet"
    );
    expect(lessonsAwaitingApproval("foh", []).length).toBe(getInductionPack("foh").lessons.length);
  });

  it("only releases the exact version that was approved", () => {
    const welcome = lessonRefByKey("ud-welcome")!;
    const current = lessonVersion(welcome);
    expect(isLessonApproved([approved("ud-welcome", current)], welcome)).toBe(true);
    expect(isLessonApproved([approved("ud-welcome", "0.9")], welcome)).toBe(false);
  });

  it("ignores a held-back or draft decision", () => {
    const welcome = lessonRefByKey("ud-welcome")!;
    const v = lessonVersion(welcome);
    expect(isLessonApproved([{ lesson_key: "ud-welcome", lesson_version: v, status: "rejected" }], welcome)).toBe(false);
    expect(isLessonApproved([{ lesson_key: "ud-welcome", lesson_version: v, status: "draft" }], welcome)).toBe(false);
  });

  it("describes the decision in plain English", () => {
    expect(approvalStatusLabel("approved")).toBe("Released to staff");
    expect(approvalStatusLabel("rejected")).toBe("Held back");
    expect(approvalStatusLabel(null)).toBe("Awaiting your approval");
  });
});

describe("progress and versions", () => {
  const pack = getInductionPack("foh");
  const allApproved: LessonApprovalRow[] = pack.lessons.map((l) => approved(l.key, lessonVersion(l)));
  const completed = (l: typeof pack.lessons[number], version = lessonVersion(l)): LessonProgressRow => ({
    lesson_key: l.key, lesson_version: version, completed_at: "2026-09-17T10:00:00Z",
  });

  it("walks the pack in order", () => {
    expect(nextLesson("foh", allApproved, [])!.key).toBe(pack.lessons[0].key);
    expect(nextLesson("foh", allApproved, [completed(pack.lessons[0])])!.key).toBe(pack.lessons[1].key);
  });

  it("reports progress and completion", () => {
    const done = pack.lessons.map((l) => completed(l));
    expect(packProgressPercent("foh", allApproved, done)).toBe(100);
    expect(packIsComplete("foh", allApproved, done)).toBe(true);
    expect(packStatusSummary("foh", allApproved, done)).toBe("Induction complete — thank you");
    expect(nextLesson("foh", allApproved, done)).toBeNull();
  });

  it("does not count an unfinished lesson as read", () => {
    const started: LessonProgressRow[] = [
      { lesson_key: pack.lessons[0].key, lesson_version: lessonVersion(pack.lessons[0]), completed_at: null },
    ];
    expect(isLessonComplete(started, pack.lessons[0])).toBe(false);
  });

  it("keeps an older completion on the record but asks for the new version", () => {
    const old = [completed(pack.lessons[0], "0.9")];
    expect(isLessonComplete(old, pack.lessons[0])).toBe(false);
    expect(completedAnOlderVersion(old, pack.lessons[0])).toBe(true);
    expect(nextLesson("foh", allApproved, old)!.key).toBe(pack.lessons[0].key);
  });

  it("never reports an older-version warning once the current version is read", () => {
    expect(completedAnOlderVersion([completed(pack.lessons[0])], pack.lessons[0])).toBe(false);
  });

  it("only counts lessons the manager has released when reporting progress", () => {
    const oneApproved = [approved(pack.lessons[0].key, lessonVersion(pack.lessons[0]))];
    const done = [completed(pack.lessons[0])];
    expect(packProgressPercent("foh", oneApproved, done)).toBe(100);
    expect(packIsComplete("foh", oneApproved, done)).toBe(false);
    expect(packStatusSummary("foh", oneApproved, done)).toBe("1 of 1 done — more to follow");
  });

  it("never mutates the rows it is given", () => {
    const rows = [completed(pack.lessons[0])];
    const before = JSON.stringify(rows);
    packProgressPercent("foh", allApproved, rows);
    nextLesson("foh", allApproved, rows);
    expect(JSON.stringify(rows)).toBe(before);
  });
});
