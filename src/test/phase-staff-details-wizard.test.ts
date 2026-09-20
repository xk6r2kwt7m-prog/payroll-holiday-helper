import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const portal = readFileSync(resolve(process.cwd(), "src/pages/StaffDetailsPortal.tsx"), "utf8");

describe("staff details form asks a little at a time and ends with a check screen", () => {
  it("drives the screens from a step definition, not one screen per section", () => {
    // Screens are now built from the exact items that were requested.
    expect(portal).toContain("function buildSteps");
    expect(portal).toContain("interface StepDef");
    expect(portal).toContain("buildSteps(items");
  });

  it("keeps each screen to a small group of questions", () => {
    const counts: number[] = [];
    let from = 0;
    for (;;) {
      const start = portal.indexOf("fields: [", from);
      if (start === -1) break;
      let depth = 0;
      let i = start + "fields: ".length;
      for (; i < portal.length; i++) {
        if (portal[i] === "[") depth++;
        else if (portal[i] === "]") { depth--; if (depth === 0) break; }
      }
      counts.push((portal.slice(start, i).match(/key: "/g) ?? []).length);
      from = i + 1;
    }
    expect(counts.length).toBeGreaterThan(4);
    for (const count of counts) {
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(4);
    }
  });


  it("finishes with a review screen where answers can be corrected in place", () => {
    expect(portal).toContain("const isReview = steps.length > 0 && step >= steps.length");
    expect(portal).toContain("Check your answers");
    expect(portal).toContain("editingRow");
    expect(portal).toContain("Send my details");
  });

  it("only submits from the review screen", () => {
    expect(portal).toContain("onClick={isReview ? submit : next}");
    expect(portal).toContain("if (reviewProblems.length > 0)");
  });

  it("keeps National Insurance optional but checks the UK format when given", () => {
    expect(portal).toContain('key: "ni_number", label: "National Insurance number"');
    expect(portal).toContain("I do not have a National Insurance number yet");
    expect(portal).toContain("isValidNiNumber");
    expect(portal).toContain("Leave it blank if you do not have one");
  });

  it("requires a right to work document and allows a photo or an uploaded file", () => {
    expect(portal).toContain('list.push("A photo or file of your document is needed")');
    expect(portal).toContain('uploadInput("Take a photo", true)');
    expect(portal).toContain('uploadInput("Upload a file", false)');
  });

  it("asks for the bank numbers twice and checks they match", () => {
    expect(portal).toContain('key: "confirm_sort_code"');
    expect(portal).toContain('key: "confirm_account_number"');
    expect(portal).toContain('list.push("The two sort codes do not match")');
    expect(portal).toContain('list.push("The two account numbers do not match")');
    expect(portal).toContain('!k.startsWith("confirm_")');
  });

  it("offers an optional note and thanks the person after sending", () => {
    expect(portal).toContain("NOTES_STEP");
    expect(portal).toContain('key: "staff_notes"');
    expect(portal).toContain("if (sent) return thankYou");
    expect(portal).toContain("Everything has been sent to your manager");
  });

  it("still autosaves progress and reuses the same submit action", () => {
    expect(portal).toContain('action: "save"');
    expect(portal).toContain('action: "submit"');
    expect(portal).toContain('action: "upload_rtw"');
  });
});

describe("National Insurance format check", () => {
  it("accepts a valid number and rejects a wrong one", async () => {
    const { isValidNiNumber } = await import("@/pages/StaffDetailsPortal");
    expect(isValidNiNumber("AB123456C")).toBe(true);
    expect(isValidNiNumber("ab 12 34 56 c")).toBe(true);
    expect(isValidNiNumber("QQ12345C")).toBe(false);
    expect(isValidNiNumber("DA123456C")).toBe(false);
    expect(isValidNiNumber("QQ123456E")).toBe(false);
  });
});

