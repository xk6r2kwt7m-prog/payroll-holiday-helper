import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("auth page renders login form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows validation on empty submit", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Form should still be on /auth (not redirected)
    await expect(page).toHaveURL(/\/auth/);
  });

  test("unauthenticated user is redirected to /auth", async ({ page }) => {
    await page.goto("/employees");
    await expect(page).toHaveURL(/\/auth/);
  });
});
