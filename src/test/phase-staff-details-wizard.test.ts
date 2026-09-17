import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const portal = readFileSync(resolve(process.cwd(), "src/pages/StaffDetailsPortal.tsx"), "utf8");

describe("staff details form asks a little at a time and ends with a check screen", () => {
  it("drives the screens from a step definition, not one screen per section", () => {
    expect(portal).toContain("STEPS_BY_SECTION");
    expect(portal).toContain("interface StepDef");
    expect(portal).toContain("sections.flatMap");
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
      counts.push((portal.slice(start, i).match(/\{ key:/g) ?? []).length);
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
    expect(portal).toContain("if (reviewGaps.length > 0)");
  });

  it("keeps National Insurance optional and the right to work document required", () => {
    expect(portal).toContain('key: "ni_number", label: "National Insurance number (optional)"');
    expect(portal).toContain('gaps.push("A photo or file of your document")');
  });

  it("still autosaves progress and reuses the same submit action", () => {
    expect(portal).toContain('action: "save"');
    expect(portal).toContain('action: "submit"');
    expect(portal).toContain('action: "upload_rtw"');
  });
});
