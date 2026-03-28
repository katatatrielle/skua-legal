import { expect, test } from "@playwright/test";

test("scaffold landing page loads", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Single-window trust workflow" })).toBeVisible();
  await expect(page.getByText("CleanRoom Law")).toBeVisible();
});
