/**
 * The simplified allergen training panel: one decision screen, review tools
 * collapsed, and nothing sent without an explicit button press.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const workbench = read("src/components/compliance/allergen/AllergenCourseWorkbench.tsx");
const emailCard = read("src/components/compliance/allergen/AllergenCourseEmailCard.tsx");
const emailHook = read("src/hooks/useAllergenCourseEmail.ts");

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* sourceFiles(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

describe("simplified allergen training panel", () => {
  it("shows the decision panel as the main view, not behind a tab", () => {
    const pilotIdx = workbench.indexOf("<AllergenPilotControl />");
    const tabsIdx = workbench.indexOf("<Tabs defaultValue=");
    expect(pilotIdx).toBeGreaterThan(-1);
    expect(tabsIdx).toBeGreaterThan(-1);
    expect(pilotIdx).toBeLessThan(tabsIdx);
    // The pilot view is no longer a tab
    expect(workbench).not.toContain('TabsTrigger value="pilot"');
    expect(workbench).not.toContain('TabsContent value="pilot"');
  });

  it("keeps the review and testing tools behind one collapsed section", () => {
    expect(workbench).toContain("Collapsible");
    expect(workbench).toContain("Review &amp; test the course");
    // All the review tabs still exist inside it
    for (const tab of ["walkthrough", "lessons", "questions", "practical", "comparison", "learner", "acceptance", "checklist", "programme"]) {
      expect(workbench).toContain(`value="${tab}"`);
    }
  });

  it("shows each person as Not sent, Link sent, In progress or Completed", () => {
    expect(emailHook).toContain("recipientState");
    expect(emailCard).toContain("Not sent");
    expect(emailCard).toContain("Link sent");
    expect(emailCard).toContain("In progress");
    expect(emailCard).toContain("Completed");
  });

  it("never sends without an explicit button press and blocks sending until published", () => {
    expect(emailCard).toContain("disabled={!isPublished");
    expect(emailCard).toContain("The course is not published yet");
    // No automatic sending anywhere in the allergen panel components
    for (const file of sourceFiles(join(process.cwd(), "src/components/compliance/allergen"))) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toContain("setInterval");
      expect(src).not.toContain("setTimeout");
    }
  });

  it("still excludes staff without an email address from selection", () => {
    expect(emailCard).toContain("disabled={!r.email}");
    expect(emailCard).toContain("No email address on file");
  });

  it("keeps test records and leavers out of the recipient list", () => {
    expect(emailHook).toContain('.eq("is_test", false)');
    expect(emailHook).toContain('=== "leaver") continue');
  });
});
