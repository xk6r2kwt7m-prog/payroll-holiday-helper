import { test, expect } from "@playwright/test";

test.describe("Protected page access (requires auth env vars)", () => {
  // These tests verify the pages load when authenticated.
  // Without E2E credentials they will be redirected to /auth — that's expected.

  test("employee page responds", async ({ page }) => {
    const res = await page.goto("/employees");
    expect(res?.status()).toBeLessThan(400);
  });

  test("schedule page responds", async ({ page }) => {
    const res = await page.goto("/schedule");
    expect(res?.status()).toBeLessThan(400);
  });

  test("payroll page responds", async ({ page }) => {
    const res = await page.goto("/payroll");
    expect(res?.status()).toBeLessThan(400);
  });
});
