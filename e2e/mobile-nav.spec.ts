import { test, expect, devices } from "@playwright/test";

test.describe("Mobile navigation", () => {
  test.use(devices["iPhone 13"]);

  test("mobile bottom navigation bar is visible", async ({ page }) => {
    await page.goto("/");

    const mobileNav = page.getByRole("navigation");
    await expect(mobileNav.first()).toBeVisible({ timeout: 10_000 });
  });

  test("mobile nav contains expected navigation links", async ({ page }) => {
    await page.goto("/");

    const navLinks = page.getByRole("link").or(page.getByRole("button"));
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("page renders without errors on mobile viewport", async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForTimeout(2000);

    if (pageErrors.length > 0) {
      console.log("Page errors captured:", pageErrors);
    }
    if (consoleErrors.length > 0) {
      console.log("Console errors captured:", consoleErrors);
    }

    expect(pageErrors, "Uncaught page errors").toHaveLength(0);
    expect(consoleErrors, "Console.error entries").toHaveLength(0);
  });
});
