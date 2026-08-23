import { test, expect } from "@playwright/test";
import { login, watchRuntime } from "./helpers.js";

test("admin report submission persists after reload", async ({ page }) => {
  const runtime = watchRuntime(page);
  await login(page);
  await page.goto("/submit-report");
  await page.getByLabel("District").selectOption("Dhaka");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Incident Type").selectOption("Fire");
  await page.getByLabel("Description").fill("E2E persistent report");
  await page.getByLabel("Affected People Count").fill("12");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Submit Report" }).click();
  await expect(
    page.getByText("Report committed to Central Command."),
  ).toBeVisible();
  await page.goto("/reports");
  await page.getByRole("row", { name: /Fire Dhaka/ }).click();
  await expect(page.getByText("E2E persistent report")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("row", { name: /Fire Dhaka/ }).click();
  await expect(page.getByText("E2E persistent report")).toBeVisible();
  expect(runtime).toEqual([]);
});

test("offline field proposal survives reload, reconnect, and admin approval", async ({
  page,
  browser,
}) => {
  await login(page, "kamal");
  await page.goto("/submit-report");
  await page.getByRole("button", { name: /Sync status/ }).click();
  await page.getByRole("button", { name: /Simulate Offline/i }).click();
  await page.keyboard.press("Escape");

  await page.getByLabel("District").selectOption("Sylhet");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Incident Type").selectOption("Flood");
  await page.getByLabel("Description").fill("Offline E2E report");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Submit Report" }).click();
  await expect(page.getByText(/pending Central Admin approval/)).toBeVisible();
  await page.getByLabel("District").selectOption("Sylhet");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Incident Type").selectOption("Fire");
  await page.getByLabel("Description").fill("Offline rejected E2E report");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Submit Report" }).click();
  await expect(page.getByText(/pending Central Admin approval/)).toBeVisible();
  await page.reload();
  await page.goto("/reports");
  await expect(page.getByText("Pending Approval").first()).toBeVisible();

  await page.getByRole("button", { name: /Sync status/ }).click();
  await page.getByRole("button", { name: /Simulate Online/i }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Pending approval/i).first()).toBeVisible();

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await login(admin, "rahim");
  await admin.getByRole("button", { name: /Sync status/ }).click();
  await admin.getByRole("button", { name: "Approvals" }).click();
  const acceptedProposal = admin
    .locator("article")
    .filter({ hasText: "Offline E2E report" });
  await acceptedProposal.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByText(/authoritative snapshot/)).toBeVisible();
  const rejectedProposal = admin
    .locator("article")
    .filter({ hasText: "Offline rejected E2E report" });
  await rejectedProposal
    .getByLabel("Rejection reason")
    .fill("Duplicate field evidence");
  await rejectedProposal.getByRole("button", { name: "Reject" }).click();
  await expect(admin.getByText("Duplicate field evidence")).toBeVisible();
  await page.getByRole("button", { name: /Sync status/ }).click();
  await page.getByRole("button", { name: "Offline Queue" }).click();
  await page.getByRole("button", { name: /Retry All/i }).click();
  await expect(page.getByText("Duplicate field evidence")).toBeVisible();
  await adminContext.close();
});

test("two tabs establish WebRTC and relay an authoritative snapshot", async ({
  page,
  context,
}) => {
  await login(page);
  const peer = await context.newPage();
  await peer.goto("/dashboard");
  await expect(page.getByRole("button", { name: /Sync status/ })).toContainText(
    /synced/i,
  );
  await expect(peer.getByRole("button", { name: /Sync status/ })).toContainText(
    /synced/i,
  );

  for (const tab of [page, peer]) {
    await tab.getByRole("button", { name: /Sync status/ }).click();
    await tab.getByRole("button", { name: /Simulate Offline/i }).click();
  }
  await page.getByRole("button", { name: "Manual (two devices)" }).click();
  await peer.getByRole("button", { name: "Manual (two devices)" }).click();
  await page.getByRole("button", { name: "Create offer (Host)" }).click();
  const hostOffer = page.locator("textarea[readonly]").first();
  await expect(hostOffer).not.toHaveValue("");
  await peer
    .locator("textarea")
    .nth(1)
    .fill(await hostOffer.inputValue());
  await peer.getByRole("button", { name: "Accept offer" }).click();
  const guestAnswer = peer.locator("textarea[readonly]").first();
  await expect(guestAnswer).not.toHaveValue("");
  await page
    .locator("textarea:not([readonly])")
    .first()
    .fill(await guestAnswer.inputValue());
  await page.getByRole("button", { name: "Accept answer" }).click();
  await expect(page.getByText("connected", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Push snapshot" }).click();
  await expect(peer.getByText(/snapshot #\d+/i).last()).toBeVisible();
});

test("notification reads persist and cargo validates quantity", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: /Notifications/ }).click();
  await expect(
    page.getByRole("button", { name: /Flood escalation Critical/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Notifications (0 unread)" }),
  ).toBeVisible();

  await page.goto("/cargo");
  await page.getByRole("button", { name: "Optimize Packing" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "quantity must be a positive integer",
  );
  await page.getByLabel("Vehicle").selectOption("cv2");
  await page.getByLabel("Item Name").fill("Water boxes");
  for (const [label, value] of [
    ["L (cm)", "20"],
    ["W (cm)", "20"],
    ["H (cm)", "20"],
    ["Weight (kg)", "5"],
    ["Qty", "3"],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Optimize Packing" }).click();
  await expect(page.getByText(/3 boxes placed/i)).toBeVisible();
});
