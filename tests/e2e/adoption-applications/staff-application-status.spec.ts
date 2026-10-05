import { expect, test, type Page } from "@playwright/test";
import {
  APPLICANT_NAME,
  bootstrapStorageState,
  fillStable,
  rowMenuItemHref,
  storageStatePathFor,
  waitForPathname,
} from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;

test.describe.configure({ mode: "serial" });

const storageStatePath = storageStatePathFor(
  "staff-application-status.state.json",
);

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the staff application status E2E spec.",
    );
  }
  await bootstrapStorageState(browser, {
    email: "admin@example.com",
    password: adminPassword,
    storageStatePath,
  });
});

test.use({ storageState: storageStatePath });

const APPLICATIONS_PATH = "/dashboard/adoption-applications";
const REVIEW_PATH = /^\/dashboard\/adoption-applications\/[^/]+\/review$/;

const janeDoeApplications = (params: Record<string, string>) =>
  `${APPLICATIONS_PATH}?${new URLSearchParams({
    query: APPLICANT_NAME,
    pageSize: "20",
    ...params,
  })}`;


const statusCells = (page: Page) => page.locator("tbody tr td:nth-child(5)");




const gotoTable = async (page: Page, url: string) => {
  await page.goto(url);
  await expect(page.getByText(/of \d+ row\(s\) selected/)).toBeVisible();
};





test("the status filter and sort follow what each application's outcomes make it", async ({
  page,
}) => {
  await gotoTable(
    page,
    janeDoeApplications({ status: "ADOPTED,CLOSED", sort: "status.desc" }),
  );
  await expect(statusCells(page)).toHaveText(["Closed", "Closed", "Adopted"]);
  
  
  await gotoTable(
    page,
    janeDoeApplications({ status: "ADOPTED,CLOSED", sort: "status.asc" }),
  );
  await expect(statusCells(page)).toHaveText(["Adopted", "Closed", "Closed"]);
});

test("a filtered list pages through every match", async ({ page }) => {
  await gotoTable(page, `${APPLICATIONS_PATH}?status=CLOSED&pageSize=10`);
  await expect(statusCells(page)).toHaveCount(10);
  const total = Number(
    (await page.getByText(/of \d+ row\(s\)/).textContent())?.match(
      /of (\d+) row/,
    )?.[1],
  );
  expect(total).toBeGreaterThan(10);

  const lastPage = Math.ceil(total / 10);
  await gotoTable(
    page,
    `${APPLICATIONS_PATH}?status=CLOSED&pageSize=10&page=${lastPage}`,
  );
  await expect(statusCells(page)).toHaveCount(total - (lastPage - 1) * 10);
  await expect(statusCells(page)).toHaveText(
    Array(total - (lastPage - 1) * 10).fill("Closed"),
  );
});

test("the animal profile opens the approved application's adoption form", async ({
  page,
}) => {
  await gotoTable(page, `${APPLICATIONS_PATH}?status=APPROVED`);
  const reviewHref = await rowMenuItemHref(page, 0, "Review");
  const applicationId = reviewHref.match(/\/adoption-applications\/([^/]+)\/review$/)?.[1];
  expect(applicationId).toBeTruthy();

  const animalHref = await page
    .locator("tbody tr")
    .first()
    .getByRole("link")
    .last()
    .getAttribute("href");
  expect(animalHref).toMatch(/^\/dashboard\/animals\/[^/]+$/);

  await gotoTable(page, `${animalHref}/adoption-applications?status=APPROVED`);
  await expect(statusCells(page)).toHaveText(["Approved"]);

  await page.goto(animalHref!);
  const completeAdoption = page.getByRole("link", { name: "Complete Adoption" });
  await expect(completeAdoption).toHaveAttribute(
    "href",
    `/dashboard/outcomes/create?applicationId=${applicationId}`,
  );
  await completeAdoption.click();
  await expect(page.getByText("Process Animal Outcome", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Outcome Type")).toBeDisabled();
  await expect(page.getByLabel("Outcome Type")).toContainText("Adoption");
});

test("an adopted animal offers re-intake instead of completing adoption again", async ({
  page,
}) => {
  await gotoTable(page, janeDoeApplications({ status: "ADOPTED" }));
  const animalHref = await page
    .locator("tbody tr")
    .first()
    .getByRole("link")
    .last()
    .getAttribute("href");
  expect(animalHref).toMatch(/^\/dashboard\/animals\/[^/]+$/);

  await page.goto(animalHref!);
  await expect(page.getByRole("link", { name: "Create Re-Intake" })).toHaveAttribute(
    "href",
    `${animalHref}/intake/create`,
  );
  await expect(page.getByRole("link", { name: "Complete Adoption" })).toHaveCount(0);
});





test("staff can save internal notes on a closed application", async ({
  page,
}) => {
  await gotoTable(page, janeDoeApplications({ status: "CLOSED" }));
  const reviewHref = await rowMenuItemHref(page, 0, "Review");
  await page.goto(reviewHref);
  await waitForPathname(page, REVIEW_PATH);
  const statusSelect = page.getByRole("combobox").first();
  await expect(statusSelect).toHaveText("Closed");
  await expect(statusSelect).toBeDisabled();

  const note = `Called about the closure ${Date.now()}`;
  await fillStable(page.getByLabel("Internal Notes", { exact: true }), note);
  await page.getByRole("button", { name: "Update Application" }).click();
  await expect(page.getByText("Application updated successfully.")).toBeVisible();

  await page.goto(reviewHref);
  await expect(page.getByLabel("Internal Notes", { exact: true })).toHaveValue(
    note,
  );
  await expect(statusSelect).toHaveText("Closed");
});
