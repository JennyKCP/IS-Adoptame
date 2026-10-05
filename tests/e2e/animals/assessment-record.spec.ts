import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  adminStatePath,
  bootstrapAdminAuth,
  fillStable,
  firstRowIdByQuery,
} from "../support/note-audit";









const storageState = adminStatePath("assessments");

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await bootstrapAdminAuth(browser, storageState);
});

test.use({ storageState });

const friscoId = (page: Page) =>
  firstRowIdByQuery(page, "/dashboard/animals", "Frisco");

const pickOption = async (page: Page, label: string, option: string) => {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
};


const openNewest = async (page: Page) => {
  await page
    .getByRole("list", { name: "Assessments" })
    .getByRole("listitem")
    .first()
    .getByRole("link")
    .click();
  await page.waitForURL(/\/assessments\/[^/]+$/);
  return {
    findings: page.getByRole("region", { name: "Findings" }),
    summary: page.getByRole("region", { name: "Summary" }),
  };
};

const findingValue = (findings: Locator, question: string) =>
  findings.locator("li", { hasText: question }).locator("p").first();

test("record an assessment, then edit it without losing answers", async ({
  page,
}) => {
  const id = await friscoId(page);
  const summary = `E2E handling assessment ${Date.now()}`;

  await page.goto(`/dashboard/animals/${id}/assessments/create`);
  await pickOption(page, "Template *", "Handling Sensitivity");

  await pickOption(page, "Collar and leash application *", "Accepts readily");
  await pickOption(page, "Gentle restraint for exam", "Tolerates");
  await pickOption(page, "Overall handling sensitivity *", "Low");

  
  await fillStable(
    page.getByLabel("Note", { exact: true }).first(),
    "Calm for the collar",
  );
  await fillStable(page.getByLabel("Summary"), summary);

  await page.getByRole("button", { name: "Record assessment" }).click();
  await expect(page.getByText("Assessment recorded.")).toBeVisible();
  await page.waitForURL(`**/dashboard/animals/${id}/assessments`);

  let detail = await openNewest(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Handling Sensitivity" }),
  ).toBeVisible();
  await expect(
    findingValue(detail.findings, "Collar and leash application"),
  ).toHaveText("Accepts readily");
  await expect(detail.findings).toContainText("Calm for the collar");

  
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await page.waitForURL(/\/assessments\/[^/]+\/edit$/);

  
  await expect(page.locator("#template-picker")).toHaveText(
    /Handling Sensitivity/,
  );
  await pickOption(page, "Overall handling sensitivity *", "Moderate");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Assessment updated.")).toBeVisible();
  await page.waitForURL(`**/dashboard/animals/${id}/assessments`);

  detail = await openNewest(page);
  
  await expect(
    findingValue(detail.findings, "Overall handling sensitivity"),
  ).toHaveText("Moderate");
  
  await expect(
    findingValue(detail.findings, "Collar and leash application"),
  ).toHaveText("Accepts readily");
  await expect(
    findingValue(detail.findings, "Gentle restraint for exam"),
  ).toHaveText("Tolerates");
  await expect(detail.findings).toContainText("Calm for the collar");
  await expect(detail.summary).toContainText(summary);
});
