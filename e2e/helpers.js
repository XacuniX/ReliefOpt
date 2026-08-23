import { expect } from "@playwright/test";

export const PASSWORD = "ReliefOpt!123";

export async function login(page, username = "rahim", password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  try {
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 10_000 });
  } catch {
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  }
}

export function watchRuntime(page) {
  const errors = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !/WebGL not supported|Failed to load resource/.test(message.text())
    )
      errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (request.url().startsWith("http://127.0.0.1"))
      errors.push(`request: ${request.url()} ${request.failure()?.errorText}`);
  });
  return errors;
}

export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}
