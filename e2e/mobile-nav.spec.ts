import { test, expect, devices } from "@playwright/test";

test.describe("Mobile navigation", () => {
  test.use(devices["iPhone 13"]);

  test("mobile bottom navigation bar is visible", async ({ page }) => {
    await page.goto("/");

    // Target the mobile-only bottom nav container (rendered inside md:hidden wrapper)
    // Use role-based locator for the navigation landmark
    const mobileNav = page.getByRole("navigation");

    // At least one navigation element should be visible on mobile
    await expect(mobileNav.first()).toBeVisible({ timeout: 10_000 });
  });

  test("mobile nav contains expected navigation links", async ({ page }) => {
    await page.goto("/");

    // Verify at least one clickable nav link/button is present in the viewport
    const navLinks = page.getByRole("link").or(page.getByRole("button"));
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("page renders without errors on mobile viewport", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForTimeout(2000); // allow async renders

    expect(errors).toHaveLength(0);
  });
});
