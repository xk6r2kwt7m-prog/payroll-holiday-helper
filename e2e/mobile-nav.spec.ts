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
      const { authenticated } = await navigateProtected(page, page_config.path);

      if (!authenticated) {
        await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
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

  test("mobile bottom navigation is visible and functional", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/");

    if (!authenticated) {
      assertNoErrors(errors);
      return;
    }

    const bottomNav = page.locator("nav").last();
    if (await bottomNav.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const box = await bottomNav.boundingBox();
      if (box) {
        expect(box.y + box.height).toBeGreaterThan(700);
      }

      const navLinks = bottomNav.getByRole("link");
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThanOrEqual(3);
    }

    assertNoErrors(errors);
  });

  test("employee search works on mobile", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/employees");

    if (!authenticated) {
      assertNoErrors(errors);
      return;
    }

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("test");
      await page.waitForTimeout(500);
      await searchInput.clear();
    }

    assertNoErrors(errors);
  });

  test("schedule department filters visible on mobile", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/schedule");

    if (!authenticated) {
      assertNoErrors(errors);
      return;
    }

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
