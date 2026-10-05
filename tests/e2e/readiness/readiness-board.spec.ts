import { test, expect, type Page } from "@playwright/test";
import {
  APPLICANT_EMAIL,
  SEEDED_USER_PASSWORD,
  bootstrapStorageState,
  storageStatePathFor,
  waitForPathname,
} from "../support/applications";












const adminPassword = process.env.ADMIN_PASSWORD;
const BOARD_PATH = "/dashboard/readiness";

const adminState = storageStatePathFor("readiness-board-admin.state.json");
const applicantState = storageStatePathFor(
  "readiness-board-applicant.state.json",
);

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the readiness board E2E spec.",
    );
  }
  await bootstrapStorageState(browser, {
    email: "admin@example.com",
    password: adminPassword,
    storageStatePath: adminState,
  });
  await bootstrapStorageState(browser, {
    email: APPLICANT_EMAIL,
    password: SEEDED_USER_PASSWORD,
    storageStatePath: applicantState,
  });
});

test.use({ storageState: adminState });

const group = (page: Page, title: string) =>
  page.getByRole("region", { name: new RegExp(`^${title}`) });

const rowFor = (page: Page, title: string, animal: string) =>
  group(page, title)
    .locator("tbody tr")
    .filter({ has: page.getByRole("link", { name: animal, exact: true }) });

test("the sidebar entry leads to the board, which groups the seeded blockers by kind", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Readiness Board" }).click();
  await waitForPathname(page, BOARD_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Readiness Board" }),
  ).toBeVisible();

  await expect(rowFor(page, "Escalated findings", "Fido")).toContainText(
    "Daily Rounds of",
  );
  await expect(
    rowFor(page, "Unsupported characteristics", "Flash"),
  ).toContainText("Good with other dogs — contradicted by a live finding");
  const leo = rowFor(page, "No photo", "Leo");
  await expect(leo).toContainText("No photo on the profile");
  
  await expect(leo.locator("td").nth(1)).toHaveText("Unplaced");
  await expect(leo.locator("td").nth(2)).toHaveText("Draft");
});

test("each row links to what clears it", async ({ page }) => {
  
  
  
  
  await page.goto(
    `${BOARD_PATH}?kind=MISSING_ASSESSMENT&species=Cat&stage=DRAFT`,
  );
  await rowFor(page, "Missing assessments", "Leo")
    .getByRole("link", { name: "Record Intake Behavioral" })
    .click();
  await waitForPathname(page, /\/dashboard\/animals\/[^/]+\/assessments\/create$/);
  expect(new URL(page.url()).searchParams.get("template")).toBe("INTAKE_BEHAVIORAL");
  
  await expect(page.locator("#template-picker")).toHaveText("Intake Behavioral");
  await expect(page.getByLabel("Kennel presence *", { exact: true })).toBeVisible();

  await page.goto(BOARD_PATH);
  await rowFor(page, "No photo", "Leo")
    .getByRole("link", { name: "Add a photo" })
    .click();
  await waitForPathname(page, /\/dashboard\/animals\/[^/]+\/photos$/);
  
  
  await expect(page.getByText("This animal has no images yet.")).toBeVisible();
});

test("drills into a group's full list and paginates it", async ({ page }) => {
  await page.goto(BOARD_PATH);

  const missingOverview = group(page, "Missing assessments");
  const showAll = missingOverview.getByRole("link", { name: /^Show all \d+/ });
  const total = Number((await showAll.textContent())?.match(/\d+/)?.[0]);
  
  
  expect(total).toBeGreaterThan(5);

  await showAll.click();
  await page.waitForURL(
    (url) => url.searchParams.get("kind") === "MISSING_ASSESSMENT",
  );
  await expect(
    page.getByRole("heading", { level: 2, name: /^Missing assessments/ }),
  ).toBeVisible();
  
  await expect(group(page, "Escalated findings")).toHaveCount(0);

  const pageSize = 10;
  const rows = page.locator("section tbody tr");
  await expect(rows).toHaveCount(Math.min(total, pageSize));

  if (total > pageSize) {
    const firstAnimalPage1 = await rows.first().locator("a").first().textContent();

    await page.getByRole("link", { name: "Go to next page" }).click();
    await page.waitForURL((url) => url.searchParams.get("page") === "2");
    await expect(rows).toHaveCount(Math.min(total - pageSize, pageSize));

    const firstAnimalPage2 = await rows.first().locator("a").first().textContent();
    expect(firstAnimalPage2).not.toBe(firstAnimalPage1);
  }

  await page.getByRole("link", { name: "All groups" }).click();
  await waitForPathname(page, BOARD_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Readiness Board" }),
  ).toBeVisible();
  await expect(group(page, "Missing assessments")).toBeVisible();
});

test("filters by species", async ({ page }) => {
  await page.goto(BOARD_PATH);
  await expect(rowFor(page, "Escalated findings", "Fido")).toBeVisible();

  await page.getByRole("button", { name: "Species", exact: true }).click();
  await page.getByRole("option", { name: "Cat", exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get("species") === "Cat");
  await page.keyboard.press("Escape");

  await expect(rowFor(page, "No photo", "Leo")).toBeVisible();
  
  const species = await page
    .locator("section tbody tr td:first-child div")
    .allTextContents();
  expect(new Set(species)).toEqual(new Set(["Cat"]));
  await expect(group(page, "Escalated findings")).toHaveCount(0);

  await page.getByRole("button", { name: "Reset" }).click();
  await waitForPathname(page, BOARD_PATH);
  await expect(rowFor(page, "Escalated findings", "Fido")).toBeVisible();
});

test("an account without assessment access neither sees nor opens it", async ({
  browser,
}) => {
  const context = await browser.newContext({ storageState: applicantState });
  const page = await context.newPage();

  await page.goto("/dashboard");
  await expect(
    page.getByRole("link", { name: "My Adoption Applications" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Readiness Board" }),
  ).toHaveCount(0);

  await page.goto(BOARD_PATH);
  await expect(
    page.getByRole("heading", { name: "Access Denied" }),
  ).toBeVisible();

  await context.close();
});
