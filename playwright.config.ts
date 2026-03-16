import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load test-specific env vars (E2E_USER_EMAIL, E2E_USER_PASSWORD, BASE_URL)
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
    // --- Auth setup (runs first, saves storageState) ---
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    // --- Desktop browsers (depend on setup) ---
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: authFile },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"], storageState: authFile },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], storageState: authFile },
      dependencies: ["setup"],
    },

    // --- Mobile (depends on setup) ---
    {
      name: "iphone-13",
      use: { ...devices["iPhone 13"], storageState: authFile },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
