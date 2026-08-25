import { test, expect } from "@playwright/test";
import { login, PASSWORD, watchRuntime } from "./helpers.js";

test("successful, failed, and inactive login behavior", async ({ page }) => {
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Username")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password")).toBeFocused();
  await page.getByLabel("Username").fill("rahim");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("alert")).toContainText("Invalid username");

  await page.getByLabel("Username").fill("mizanur");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("alert")).toContainText("inactive");

  const runtime = watchRuntime(page);
  await login(page, "rahim");
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(runtime).toEqual([]);
});

for (const scenario of [
  { role: "central admin", username: "rahim", denied: [], home: "/dashboard" },
  {
    role: "warehouse manager",
    username: "fatima",
    denied: ["/users"],
    home: "/dashboard",
  },
  {
    role: "field worker",
    username: "kamal",
    denied: ["/dashboard", "/inventory", "/cargo", "/users"],
    home: "/map",
  },
]) {
  test(`${scenario.role} direct-route RBAC`, async ({ page }) => {
    await login(page, scenario.username);
    for (const path of scenario.denied) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${scenario.home}$`));
    }
  });
}
