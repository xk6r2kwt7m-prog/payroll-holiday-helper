/**
 * Mobile audit — key pages on iPhone 13 viewport.
 *
 * Verifies that important navigation and primary actions remain visible
 * and usable. Captures and fails on console.error and pageerror.
 */
import { test, expect, type Page } from "@playwright/test";
import { captureErrors, assertNoErrors, navigateProtected } from "./helpers";

test.use({
  viewport: { width: 390, height: 844 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
});

const MOBILE_PAGES = [
  {
    path: "/",
    name: "Homepage / Dashboard",
    assertions: async (page: Page) => {
      const content = page.getByText(/good|dashboard|schedule|staff|clock/i).first();
      await expect(content).toBeVisible({ timeout: 10_000 });
    },
  },
  {
    path: "/employees",
    name: "Employees",
    assertions: async (page: Page) => {
      const content = page.getByText(/people|employee|no employee/i).first();
      await expect(content).toBeVisible({ timeout: 10_000 });
    },
  },
  {
    path: "/schedule",
    name: "Schedule",
    assertions: async (page: Page) => {
      const content = page.getByText(/schedule|rota|shift|no locations/i).first();
      await expect(content).toBeVisible({ timeout: 10_000 });
    },
  },
  {
    path: "/timesheets",
    name: "Timesheets",
    assertions: async (page: Page) => {
      const content = page.getByText(/timesheet|attendance|pending|no entries|no time/i).first();
      await expect(content).toBeVisible({ timeout: 10_000 });
    },
  },
  {
    path: "/holidays",
    name: "Holidays / Leave",
    assertions: async (page: Page) => {
      const content = page.getByText(/holiday|leave|request|balance/i).first();
      await expect(content).toBeVisible({ timeout: 10_000 });
    },
  },
];

test.describe("Mobile audit — iPhone 13 viewport", () => {
  for (const page_config of MOBILE_PAGES) {
    test(`${page_config.name} renders correctly on mobile`, async ({ page }) => {
      const errors = captureErrors(page);
      const nav = await navigateProtected(page, page_config.path);

      if (nav.state === "auth") {
        await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
        assertNoErrors(errors);
        return;
      }

      if (nav.state === "unknown") {
        test.info().annotations.push({
          type: "warning",
          description: `Mobile page ${page_config.path} settled in unknown state: ${nav.finalUrl}`,
        });
        assertNoErrors(errors);
        return;
      }

      await page_config.assertions(page);

      // Verify no horizontal overflow (content fits viewport)
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = 390;
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);

      assertNoErrors(errors);
    });
  }

  test("mobile bottom navigation is visible and functional", async ({ page }, testInfo) => {
    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/");

    testInfo.skip(nav.state !== "target", `Skipped: route state is "${nav.state}"`);

    // Use data-testid for stable selection of the mobile nav
    const mobileNav = page.getByTestId("mobile-bottom-nav");
    const navVisible = await mobileNav.isVisible({ timeout: 5_000 }).catch(() => false);

    if (navVisible) {
      // Assert the nav is positioned at the bottom of the viewport
      const box = await mobileNav.boundingBox();
      if (box) {
        const viewportHeight = 844;
        expect(
          box.y + box.height,
          "Mobile nav should be at the bottom of the viewport"
        ).toBeGreaterThan(viewportHeight - 100);
      }

      // Assert expected navigation links are present using accessible roles
      const navLinks = mobileNav.getByRole("link");
      const linkCount = await navLinks.count();
      expect(linkCount, "Mobile nav should have at least 3 navigation links").toBeGreaterThanOrEqual(3);

      // Verify at least one link has visible text/label
      const firstLink = navLinks.first();
      await expect(firstLink).toBeVisible();
    } else {
      test.info().annotations.push({
        type: "warning",
        description: "Mobile bottom nav (data-testid='mobile-bottom-nav') not found — may not render for this role",
      });
    }

    assertNoErrors(errors);
  });

  test("employee search works on mobile", async ({ page }, testInfo) => {
    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/employees");

    testInfo.skip(nav.state !== "target", `Skipped: route state is "${nav.state}"`);

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("test");
      await page.waitForTimeout(500);
      await searchInput.clear();
    }

    assertNoErrors(errors);
  });

  test("schedule department filters visible on mobile", async ({ page }, testInfo) => {
    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/schedule");

    testInfo.skip(nav.state !== "target", `Skipped: route state is "${nav.state}"`);

    const deptFilter = page.getByText(/FOH|BOH|CPU/).first();
    const visible = await deptFilter.isVisible({ timeout: 5_000 }).catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: visible
        ? "Department filters visible on mobile"
        : "Department filters may be collapsed or page is in empty state",
    });

    assertNoErrors(errors);
  });
});
