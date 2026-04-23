import { defineConfig, devices } from "@playwright/test";

// Playwright owns the server lifecycle: it boots scripts/run_e2e_server.sh
// which wipes the SQLite DB, migrates, seeds a deterministic dataset, and
// runs the dev server on 127.0.0.1:18765. reuseExistingServer makes local
// iteration cheap without masking a stale server in CI.
const BASE_URL = "http://127.0.0.1:18765";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "./scripts/run_e2e_server.sh",
    url: BASE_URL + "/accounts/login/",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
