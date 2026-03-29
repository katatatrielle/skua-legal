import { expect, test, type Page } from "@playwright/test";

async function skipIfDatabaseUnavailable(page: Page) {
  await page.goto("/");
  const needsSetup = await page.getByText("Database connection needed").isVisible().catch(() => false);
  test.skip(needsSetup, "Requires configured Postgres and seeded demo data.");
}

async function createMatter(page: Page, title: string) {
  await page.goto("/");
  await page.getByTestId("matter-title-input").fill(title);
  await page.getByTestId("create-matter-button").click();
  await expect(page.locator('[data-testid^="matter-card-"]').filter({ hasText: title })).toBeVisible();
}

async function draftMatterHappyPath(page: Page, title: string) {
  await createMatter(page, title);

  const matterCard = page.locator('[data-testid^="matter-card-"]').filter({ hasText: title });
  await matterCard.getByRole("link", { name: "Research" }).click();

  await page.getByTestId("research-raw-text-input").fill(
    "[12] The court held that employers must document accommodation efforts before asserting undue hardship in this case."
  );
  await page.getByTestId("research-notes-input").fill("Reliable source text for heuristic review and drafting.");
  await page.getByTestId("research-submit-button").click();

  await expect(page.getByTestId("candidate-authority-panel")).toBeVisible();
  await page.getByTestId("create-review-authority-0").click();

  await expect(page.getByTestId("run-intake-button")).toBeVisible();
  await page.getByTestId("run-intake-button").click();

  await page.getByTestId("proposition-under-review-input").fill(
    "The court held that employers must document accommodation efforts before asserting undue hardship in this case."
  );
  await page.getByTestId("run-provenance-review-button").click();
  await page.getByTestId("decision-verified").click();

  await page.getByRole("link", { name: "Draft workspace" }).click();

  await page.getByPlaceholder("Node title").fill("Accommodation documentation rule");
  await page
    .getByPlaceholder("Claim or proposition this section needs to support")
    .fill("Employers must document accommodation efforts before asserting undue hardship.");
  await page.getByRole("button", { name: "Create outline node" }).click();

  await page.getByRole("button", { name: "Attach" }).first().click();
  await page.getByTestId("draft-section-button").click();

  await expect(page.getByTestId("draft-output")).toContainText("Accommodation documentation rule");
  await expect(page.getByTestId("citation-inspector")).toContainText("Paragraph 1");
}

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Single-window trust workflow" })).toBeVisible();
  await expect(page.getByText("CleanRoom Law")).toBeVisible();
});

test("seeded demo matter is visible and navigable", async ({ page }) => {
  await skipIfDatabaseUnavailable(page);

  await expect(page.getByText("CleanRoom Demo Matter")).toBeVisible();
  await page.getByRole("link", { name: "Research" }).first().click();
  await expect(page.getByText("Raw Research Inbox")).toBeVisible();

  await page.getByRole("link", { name: "Authority review" }).click();
  await expect(page.getByText("Authority Queue")).toBeVisible();

  await page.getByRole("link", { name: "Draft workspace" }).click();
  await expect(page.getByText("Matter diagnostics")).toBeVisible();
});

test("happy path: matter to reviewed authority to drafted section", async ({ page }) => {
  await skipIfDatabaseUnavailable(page);
  await draftMatterHappyPath(page, `Playwright Happy Path ${Date.now()}`);

  await expect(page.getByTestId("diagnostics-model-runs")).toContainText("model runs");
  await expect(page.getByTestId("diagnostics-events")).toContainText("section_drafted");
});

test("restart path: invalidated authority taints draft and clears it on restart", async ({ page }) => {
  await skipIfDatabaseUnavailable(page);
  const title = `Playwright Restart Path ${Date.now()}`;
  await draftMatterHappyPath(page, title);

  await page.getByRole("link", { name: "Authorities" }).click();
  await page.getByTestId("decision-invalidated").click();

  await page.getByRole("link", { name: "Draft workspace" }).click();
  await expect(page.getByTestId("node-taint-banner")).toContainText("tainted");

  const restartButton = page.getByRole("button", { name: "Restart from recommendation" }).first();
  await restartButton.click();

  await expect(page.getByTestId("draft-output-empty")).toBeVisible();
  await expect(page.getByTestId("diagnostics-restarts")).toContainText("1 restarts");
});
