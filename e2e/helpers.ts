/**
 * Shared Playwright helpers for the E2E audit pack.
 *
 * - Console error / pageerror capture
 * - Common navigation helpers
 * - Assertion utilities
 */
import { type Page, expect } from "@playwright/test";

/** Attach console + pageerror listeners, return arrays to assert later. */
export function captureErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  return { consoleErrors, pageErrors };
}

/** Assert no captured errors (call at end of test). */
export function assertNoErrors({
  consoleErrors,
  pageErrors,
}: {
  consoleErrors: string[];
  pageErrors: string[];
}) {
  expect(pageErrors, "Uncaught page errors").toEqual([]);
  expect(consoleErrors, "Console errors").toEqual([]);
}

/**
 * Navigate to a protected route. If the user is not authenticated, the app
 * redirects to /auth — this helper detects both outcomes and returns a
 * discriminated result so tests can branch accordingly.
 */
export async function navigateProtected(
  page: Page,
  path: string
): Promise<{ authenticated: boolean }> {
  await page.goto(path, { waitUntil: "domcontentloaded" });

  // Wait for either the target content to render or a redirect to /auth
  try {
    await page.waitForURL((url) => !url.pathname.includes("/auth"), {
      timeout: 8_000,
    });
    return { authenticated: true };
  } catch {
    // Still on /auth — user is not logged in
    return { authenticated: false };
  }
}

/** Generate a unique-ish name for test entities to avoid collisions. */
export function uniqueName(prefix = "E2E") {
  return `${prefix}_${Date.now().toString(36)}`;
}
