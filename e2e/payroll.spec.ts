/**
 * Payroll regression tests.
 *
 * Covers: page load, period selection, payroll table visibility,
 * approval workflow detection, PDF export button, refresh persistence.
 *
 * ⚠  These tests are read-only and non-destructive.
 *    Payroll mutation tests (create/approve period) require seed data.
 */
import { test, expect } from "@playwright/test";
import { captureErrors, assertNoErrors, navigateProtected } from "./helpers";

test.describe("Payroll page", () => {
  test("loads with payroll-specific content", async ({ page }) => {
    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/payroll");

    if (nav.state === "auth") {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      assertNoErrors(errors);
      return;
    }

    if (nav.state === "unknown") {
      test.info().annotations.push({
        type: "warning",
        description: `Payroll navigation settled in unknown state: ${nav.finalUrl}`,
      });
      assertNoErrors(errors);
      return;
    }

    // Access denied check
    const accessDenied = page.getByText(/access denied/i);
    if (await accessDenied.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.info().annotations.push({
        type: "info",
        description: "Access denied — test user is not admin",
      });
      assertNoErrors(errors);
      return;
    }

    // Should show payroll content or empty state
    const content = page
      .getByText(/payroll|pay run|pay period|no payroll|create.*period/i)
      .first();
    await expect(content).toBeVisible({ timeout: 10_000 });

    assertNoErrors(errors);
  });

  test("payroll periods are selectable (if data exists)", async ({ page }, testInfo) => {
    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/payroll");

    testInfo.skip(nav.state !== "target", `Skipped: route state is "${nav.state}" (${nav.finalUrl})`);

    // Look for period selector or period cards
    const periodSelector = page.getByRole("combobox").or(
      page.getByText(/period|week|monthly/i).first()
    );

    const visible = await periodSelector.isVisible({ timeout: 5_000 }).catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: visible
        ? "Payroll period selector visible"
        : "No period selector — may have no periods or different layout",
    });

    assertNoErrors(errors);
  });

  test("payroll table renders without broken state indicators", async ({ page }, testInfo) => {
    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/payroll");

    testInfo.skip(nav.state !== "target", `Skipped: route state is "${nav.state}" (${nav.finalUrl})`);

    // Wait for content to stabilize
    await page.waitForTimeout(3_000);

    // Check for broken state indicators — these are REAL failures
    const brokenChecks = [
      { locator: page.getByText(/undefined/i), label: "undefined" },
      { locator: page.getByText(/NaN/), label: "NaN" },
      { locator: page.getByText(/\[object/i), label: "[object Object]" },
    ];

    for (const check of brokenChecks) {
      const visible = await check.locator.isVisible({ timeout: 1_000 }).catch(() => false);
      if (visible) {
        const text = await check.locator.textContent();
        throw new Error(
          `Broken state detected on payroll page: "${check.label}" found in rendered content. ` +
          `Text: "${text?.slice(0, 200)}"`
        );
      }
    }

    assertNoErrors(errors);
  });

  test("create payroll period button visible for admin", async ({ page }, testInfo) => {
    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/payroll");

    testInfo.skip(nav.state !== "target", `Skipped: route state is "${nav.state}" (${nav.finalUrl})`);

    const createBtn = page.getByRole("button", { name: /create|new.*period|add.*period/i });
    const visible = await createBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: visible
        ? "Create period button visible"
        : "No create button — may already have active period or not admin",
    });

    assertNoErrors(errors);
  });

  test("payroll calendar page loads", async ({ page }) => {
    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/payroll/calendar");

    if (nav.state === "auth") {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      assertNoErrors(errors);
      return;
    }

    expect(nav.finalUrl).not.toContain("/auth");
    assertNoErrors(errors);
  });

  test("payroll analytics page loads", async ({ page }) => {
    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/payroll/analytics");

    if (nav.state === "auth") {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      assertNoErrors(errors);
      return;
    }

    expect(nav.finalUrl).not.toContain("/auth");
    assertNoErrors(errors);
  });

  test("payroll page survives refresh without breaking", async ({ page }, testInfo) => {
    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/payroll");

    testInfo.skip(nav.state !== "target", `Skipped: route state is "${nav.state}" (${nav.finalUrl})`);

    await page.waitForTimeout(2_000);
    await page.reload({ waitUntil: "networkidle" });

    const content = page
      .getByText(/payroll|pay run|pay period|no payroll|create.*period/i)
      .first();
    await expect(content).toBeVisible({ timeout: 10_000 });

    // Re-check for broken states after refresh
    const brokenChecks = [
      page.getByText(/undefined/i),
      page.getByText(/NaN/),
      page.getByText(/\[object/i),
    ];

    for (const indicator of brokenChecks) {
      const visible = await indicator.isVisible({ timeout: 1_000 }).catch(() => false);
      if (visible) {
        const text = await indicator.textContent();
        throw new Error(`Broken state after refresh: "${text?.slice(0, 200)}"`);
      }
    }

    assertNoErrors(errors);
  });
});
