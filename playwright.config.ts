import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "html",
  use: { baseURL: "http://127.0.0.1:1420", trace: "on-first-retry" },
  webServer: {
    command: "pnpm start:local",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "chromium-retina",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      },
    },
  ],
});
