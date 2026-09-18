/**
 * Staff allergen training link — safety checks.
 *
 * The staff page must open only for published course + active assignment,
 * must never send anything, and the share control must copy the canonical
 * link only.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(__dirname, "..", dir))) {
    const rel = join(dir, entry);
    if (statSync(join(__dirname, "..", rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

describe("Staff allergen training page", () => {
  const page = read("pages/AllergenTraining.tsx");
  const access = read("hooks/useAllergenStaffAccess.ts");
  const app = read("App.tsx");

  it("is routed at /training/allergen-safety behind the staff guard", () => {
    expect(app).toContain('path="/training/allergen-safety"');
    expect(app).toContain('requiredRole="staff"');
    expect(app).toContain("AllergenTraining");
  });

  it("requires a published course version", () => {
    expect(access).toContain("allergen_course_versions");
    expect(page).toContain("Allergen training is not open yet");
  });

  it("requires an active assignment and shows a polite message otherwise", () => {
    expect(access).toContain("allergen_assignments");
    expect(page).toContain("This training has not been assigned to you yet");
  });

  it("never returns test assignments to genuine staff access", () => {
    expect(access).toContain('.eq("is_test", false)');
  });

  it("renders the genuine learner reader and assessment, not preview sessions", () => {
    expect(page).toContain("isTest={false}");
    expect(page).toContain("AllergenLessonReader");
    expect(page).toContain("AllergenAssessmentRunner");
    expect(page).not.toContain("previewKey");
  });

  it("sends nothing — no notifications, emails or edge-function calls", () => {
    expect(page).not.toContain("send-notification");
    expect(page).not.toContain("functions.invoke");
    expect(access).not.toContain("functions.invoke");
  });
});

describe("Share training link control", () => {
  const control = read("components/compliance/allergen/AllergenPilotControl.tsx");

  it("uses the canonical origin, never a preview or editor URL", () => {
    expect(control).toContain("getCanonicalOrigin()");
    expect(control).toContain("/training/allergen-safety");
  });

  it("copies the link only — it never sends it", () => {
    expect(control).toContain("navigator.clipboard.writeText");
    expect(control).toContain("nothing was sent by the system");
    expect(control).not.toContain("send-notification");
  });

  it("explains that the link alone grants no access", () => {
    expect(control).toContain("Sharing");
    expect(control).toContain("grants no access");
  });
});

describe("No accidental staff contact anywhere in the new code", () => {
  it("no new file invokes the send-notification function", () => {
    for (const f of ["pages/AllergenTraining.tsx", "hooks/useAllergenStaffAccess.ts"]) {
      expect(read(f)).not.toContain("send-notification");
    }
  });
});
