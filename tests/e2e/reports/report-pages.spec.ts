import { expect, test, type Page } from "@playwright/test";
import {
  bootstrapStorageState,
  storageStatePathFor,
} from "../support/applications";








const adminPassword = process.env.ADMIN_PASSWORD;

const storageStatePath = storageStatePathFor("report-pages.state.json");

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the report pages E2E spec.",
    );
  }
  await bootstrapStorageState(browser, {
    email: "admin@example.com",
    password: adminPassword,
    storageStatePath,
  });
});

test.use({ storageState: storageStatePath });


const content = (page: Page) => page.locator("main > div");



const card = (page: Page, title: string) =>
  content(page)
    .locator('[data-slot="card"]')
    .filter({ hasText: title })
    .last();


const shiftDay = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

const daysBetween = (from: string, to: string) =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
  86_400_000;



const dayKeyOf = (printed: string) =>
  new Date(`${printed} UTC`).toISOString().slice(0, 10);

test("the reports overview draws each report's card", async ({ page }) => {
  await page.goto("/dashboard/reports");
  await expect(
    content(page).getByRole("heading", { name: "Reports" }),
  ).toBeVisible();
  
  
  for (const label of [
    "Outcome statistics",
    "Intake vs outcome",
    "Length of stay",
    "Intake sources",
  ]) {
    await expect(content(page).getByText(label, { exact: true })).toBeVisible();
  }
});

test("the intake sources report draws its trend and breakdown", async ({
  page,
}) => {
  
  
  
  const today = new Date().toISOString().slice(0, 10);
  await page.goto(
    `/dashboard/reports/intakes?from=${shiftDay(today, -730)}&to=${today}`,
  );
  await expect(
    content(page).getByRole("heading", { name: "Intake sources" }),
  ).toBeVisible();
  
  
  await expect(
    card(page, "Monthly intake trend")
      .locator(".recharts-bar-rectangle")
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  
  const breakdown = card(page, "Intakes by source type");
  await expect(breakdown.getByText(/^\d+ · \d+\.\d%$/).first()).toBeVisible();
  await expect(
    breakdown.getByText("No intakes recorded in this period."),
  ).toHaveCount(0);
});

test("the length-of-stay report lists the animals in care", async ({
  page,
}) => {
  await page.goto("/dashboard/reports/length-of-stay");
  await expect(
    content(page).getByRole("heading", { name: "Length of stay" }),
  ).toBeVisible();
  
  const row = card(page, "Longest current stays").locator("tbody tr").first();
  await expect(row.getByRole("link")).toHaveAttribute(
    "href",
    /^\/dashboard\/animals\/[^/]+$/,
  );
  
  
  
  
  
  
  const rangeLabel = await content(page)
    .getByText(/^[A-Z][a-z]{2} \d{1,2}(, \d{4})? – [A-Z][a-z]{2} \d{1,2}, \d{4}$/)
    .innerText();
  const reportToday = dayKeyOf(rangeLabel.split(" – ")[1]);
  
  const cells = row.locator("td");
  const intakeDay = dayKeyOf((await cells.nth(4).innerText()).trim());
  await expect(cells.nth(2)).toHaveText(
    String(daysBetween(intakeDay, reportToday)),
  );
});
