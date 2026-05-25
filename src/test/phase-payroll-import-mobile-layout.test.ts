/**
 * Regression: payroll import dialog mobile layout.
 *
 * The previous regression: on a 430×697 mobile viewport the "Set Payroll
 * Period" step content overflowed the dialog because its wrapper used
 * only `space-y-4 py-2` (no flex/overflow), pushing the footer — and the
 * Continue button that advances to the file-upload step — off-screen.
 * The user therefore could not reach the file picker.
 *
 * Fix was UI-only: make the period and upload step containers
 * `flex-1 overflow-y-auto` so they scroll inside the dialog, keeping
 * the footer (Continue / file input next-step) reachable.
 *
 * These assertions are structural (source-level) so they cannot be
 * silently regressed by future refactors. They also lock down the
 * existing-draft preservation logic and approved-period protection so
 * a layout-only fix stays layout-only.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const dialogSource = readFileSync(
  resolve(__dirname, "../components/payroll/ImportPayrollDialog.tsx"),
  "utf-8",
);

describe("ImportPayrollDialog — mobile layout regression", () => {
  it("dialog content is a flex column with capped height so footer can stay pinned", () => {
    expect(dialogSource).toMatch(
      /<DialogContent[^>]*className="[^"]*max-h-\[90vh\][^"]*flex flex-col[^"]*"/,
    );
  });

  it("period step content scrolls inside the dialog on mobile", () => {
    // Match: {step === "period" && ( <div className="flex-1 overflow-y-auto ...">
    const periodWrapper = dialogSource.match(
      /step === "period" && \(\s*<div className="([^"]+)"/,
    );
    expect(periodWrapper, "period step wrapper not found").not.toBeNull();
    expect(periodWrapper![1]).toContain("flex-1");
    expect(periodWrapper![1]).toContain("overflow-y-auto");
  });

  it("upload step content scrolls inside the dialog on mobile", () => {
    const uploadWrapper = dialogSource.match(
      /step === "upload" && \(\s*<div className="([^"]+)"/,
    );
    expect(uploadWrapper, "upload step wrapper not found").not.toBeNull();
    expect(uploadWrapper![1]).toContain("flex-1");
    expect(uploadWrapper![1]).toContain("overflow-y-auto");
  });

  it("Continue button advances from period → upload step", () => {
    // Footer Continue handler must still call setStep("upload")
    expect(dialogSource).toMatch(
      /step === "period" &&[\s\S]{0,400}onClick=\{\(\) => setStep\("upload"\)\}[\s\S]{0,200}Continue/,
    );
  });

  it("upload step exposes a native file picker accepting CSV", () => {
    expect(dialogSource).toMatch(
      /step === "upload"[\s\S]*?<Input\s+type="file"\s+accept="\.csv"/,
    );
  });

  it("upload step has a Back-to-period control so the picker is always escapable", () => {
    expect(dialogSource).toMatch(
      /step === "upload" &&[\s\S]{0,200}onClick=\{\(\) => setStep\("period"\)\}/,
    );
  });
});

describe("ImportPayrollDialog — existing-draft preservation (unchanged)", () => {
  it("existing-draft branch updates timesheet_hours only and reuses existing rate / SC / bonuses", () => {
    // The update payload must contain timesheet_hours but NOT hourly_rate,
    // service_charge, performance_bonus or special_bonus.
    const updateBlock = dialogSource.match(
      /\.from\("payroll_entries"\)\s*\.update\(\{([\s\S]*?)\}\s*as any\)/,
    );
    expect(updateBlock, "existing-entry update block not found").not.toBeNull();
    const payload = updateBlock![1];
    expect(payload).toContain("timesheet_hours");
    expect(payload).not.toMatch(/\bhourly_rate\s*:/);
    expect(payload).not.toMatch(/\bservice_charge\s*:/);
    expect(payload).not.toMatch(/\bperformance_bonus\s*:/);
    expect(payload).not.toMatch(/\bspecial_bonus\s*:/);
  });

  it("total_pay for existing draft entries is recomputed from the preserved values", () => {
    // const totalPay = (hours * rate) + (hours * sc) + perfBonus + specBonus;
    expect(dialogSource).toMatch(
      /const totalPay = \(hours \* rate\) \+ \(hours \* sc\) \+ perfBonus \+ specBonus;/,
    );
    expect(dialogSource).toMatch(/const rate = existing\.hourly_rate;/);
    expect(dialogSource).toMatch(/const sc = existing\.service_charge \|\| 0;/);
    expect(dialogSource).toMatch(/const perfBonus = existing\.performance_bonus \|\| 0;/);
    expect(dialogSource).toMatch(/const specBonus = existing\.special_bonus \|\| 0;/);
  });
});

describe("ImportPayrollDialog — approved period protection (unchanged)", () => {
  it("only a draft incoming period pre-fills as the import target", () => {
    // useEffect guard: if (incomingPeriod && incomingPeriod.status === "draft")
    expect(dialogSource).toMatch(
      /if \(incomingPeriod && incomingPeriod\.status === "draft"\)/,
    );
  });

  it("existing-period detection only matches drafts (never approved/locked)", () => {
    expect(dialogSource).toMatch(
      /periods\.find\(\s*\(p\) => p\.status === "draft" && p\.period_name === periodName/,
    );
  });

  it("new payroll periods created by import are inserted as draft", () => {
    expect(dialogSource).toMatch(/status: "draft" as const,/);
  });
});
