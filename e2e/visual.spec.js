import fs from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { expectNoHorizontalOverflow, login, watchRuntime } from "./helpers.js";

const routes = [
  "dashboard",
  "map",
  "reports",
  "inventory",
  "tasks",
  "cargo",
  "users",
  "settings",
];

test("capture responsive route screenshots without runtime or overflow failures", async ({
  page,
}, testInfo) => {
  const runtime = watchRuntime(page);
  const viewport = testInfo.project.name.startsWith("mobile")
    ? "mobile"
    : "desktop";
  const directory = `artifacts/screenshots/${viewport}`;
  await fs.mkdir(directory, { recursive: true });
  await page.goto("/login");
  await page.screenshot({ path: `${directory}/login.png`, fullPage: true });
  await login(page);
  for (const route of routes) {
    await page.goto(`/${route}`);
    await expect(page.locator("main")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${directory}/${route}.png`,
      fullPage: true,
    });
  }
  expect(runtime).toEqual([]);
});
