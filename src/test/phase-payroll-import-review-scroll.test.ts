/**
 * Regression: the "Review & Resolve Matches" (preview) step of the payroll
 * import dialog must scroll internally so managers can reach every expected-
 * missing row, unresolved row, and the sticky footer with "Update Entries".
 *
 * Previously the preview step used `overflow-hidden` on its outer wrapper and
 * nested a fixed-height `ScrollArea` (`max-h-[380px]`) inside. On short
 * viewports (laptop / mobile) the warning panels above the ScrollArea pushed
 * content off-screen and the footer covered the last rows.
 *
 * The fix is layout-only. These assertions are structural so a future
 * refactor cannot silently regress the scroll behaviour, and business logic
 * (matching / import writer / approval guard) must stay untouched.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(
  resolve(__dirname, "../components/payroll/ImportPayrollDialog.tsx"),
  "utf-8",
);

describe("ImportPayrollDialog preview step — scrollable review", () => {
  it("dialog content is a capped-height flex column", () => {
    expect(src).toMatch(
      /<DialogContent[^>]*className="[^"]*max-h-\[90vh\][^"]*flex flex-col[^"]*"/,
    );
  });

  it("preview step wrapper scrolls vertically", () => {
    const m = src.match(/step === "preview" && \(\s*<div className="([^"]+)"/);
    expect(m, "preview step wrapper not found").not.toBeNull();
    expect(m![1]).toContain("flex-1");
    expect(m![1]).toContain("overflow-y-auto");
    expect(m![1]).not.toContain("overflow-hidden");
  });

  it("employee list is NOT nested in a fixed-height ScrollArea inside preview", () => {
    // No `max-h-[380px]` cap on the inner review list — the outer step
    // wrapper owns scrolling so warnings + list + resolution banner scroll
    // as one column.
    const previewSlice = src.split('step === "preview"')[1] ?? "";
    const doneSlice = previewSlice.split('step === "done"')[0];
    expect(doneSlice).not.toMatch(/max-h-\[380px\]/);
    expect(doneSlice).not.toMatch(/<ScrollArea\b/);
  });

  it("footer stays pinned and does not scroll away with content", () => {
    // Footer row must be shrink-0 so it never gets pushed off inside the
    // flex column, and it lives outside every step wrapper.
    expect(src).toMatch(
      /<div className="shrink-0 flex items-center justify-between pt-2 border-t border-border[^"]*"/,
    );
  });

  it("Update Entries / Import button remains rendered in the footer for the preview step", () => {
    expect(src).toMatch(
      /step === "preview" &&[\s\S]{0,400}onClick=\{handleImport\}/,
    );
    expect(src).toMatch(/Update \$\{matchedEntries\.length\} Entries/);
  });

  it("Match & apply hours action for expected-missing rows is preserved", () => {
    // Business-critical: the button that links an unresolved CSV row to an
    // expected employee must still call handleManualMatch.
    expect(src).toMatch(
      /onClick=\{\(\) => handleManualMatch\(h\.raw, m\.employeeId\)\}[\s\S]{0,300}Match &amp; apply "\{h\.raw\}"/,
    );
  });
});
