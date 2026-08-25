import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  outputDir: "test-results",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--disable-features=WebRtcHideLocalIpsWithMdns"],
        },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
        launchOptions: {
          args: ["--disable-features=WebRtcHideLocalIpsWithMdns"],
        },
      },
      testMatch: /visual\.spec\.js/,
    },
  ],
  webServer: [
    {
      command: "npm --prefix server run e2e",
      url: "http://127.0.0.1:4000/health/ready",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173/login",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
