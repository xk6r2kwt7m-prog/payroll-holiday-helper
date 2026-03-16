import { test, expect, devices } from "@playwright/test";

test.describe("Mobile navigation", () => {
  test.use(devices["iPhone 13"]);

  test("mobile bottom nav is visible on small viewport", async ({ page }) => {
    await page.goto("/");
    // The app renders a mobile bottom nav bar on small screens
    const bottomNav = page.locator("nav").last();
    await expect(bottomNav).toBeVisible();
  });

  test("page loads correctly on mobile viewport", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
  });
});
