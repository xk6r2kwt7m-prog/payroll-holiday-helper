import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const baseURL = process.env.BASE_URL || "http://localhost:5173";
const authFile = path.join(__dirname, "e2e", ".auth", "user.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Primary auth setup (E2E_USER_EMAIL)
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Per-role auth setup (optional env vars)
    {
      name: "setup-roles",
      testMatch: /auth-roles\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: authFile },
      dependencies: ["setup", "setup-roles"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"], storageState: authFile },
      dependencies: ["setup", "setup-roles"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], storageState: authFile },
      dependencies: ["setup", "setup-roles"],
    },
    {
      name: "iphone-13",
      use: { ...devices["iPhone 13"], storageState: authFile },
      dependencies: ["setup", "setup-roles"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
