import { expect, test, type Page } from "@playwright/test";
import {
  APPLICANT_NAME,
  bootstrapStorageState,
  rowMenuItemHref,
  storageStatePathFor,
  waitForPathname,
} from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;

test.describe.configure({ mode: "serial" });

const storageStatePath = storageStatePathFor(
  "staff-adoption-status-history.state.json",
);

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the staff status-history E2E spec.",
    );
  }
  await bootstrapStorageState(browser, {
    email: "admin@example.com",
    password: adminPassword,
    storageStatePath,
  });
});

test.use({ storageState: storageStatePath });

const REVIEW_PATH = /^\/dashboard\/adoption-applications\/[^/]+\/review$/;






const openReviewPage = async (page: Page) => {
  await page.goto(
    `/dashboard/adoption-applications?query=${encodeURIComponent(
      APPLICANT_NAME,
    )}&status=REVIEWING`,
  );
  await expect(page.locator("tbody tr")).toHaveCount(1);
  const href = await rowMenuItemHref(page, 0, "Review");
  await page.goto(href);
  await waitForPathname(page, REVIEW_PATH);
};

test("the staff review page renders the application's status history", async ({
  page,
}) => {
  await openReviewPage(page);

  await expect(page.getByText("Status History")).toBeVisible();

  
  
  
  await expect(
    page.getByText("Application submitted by applicant."),
  ).toBeVisible();
  await expect(
    page.getByText("References received. Scheduling a home visit next week."),
  ).toBeVisible();
  await expect(page.getByText("by Olivia Chen").first()).toBeVisible();
});

test("the review form says which of its two note fields the applicant sees", async ({
  page,
}) => {
  await openReviewPage(page);

  
  
  
  await expect(
    page.getByText("Staff-only. Never shown to the applicant."),
  ).toBeVisible();

  
  
  
  await page.getByLabel("Application Status", { exact: true }).click();
  await page.getByRole("option", { name: "Waitlisted" }).click();

  await expect(
    page.getByText(
      "Shared with the applicant — shown on their application page and recorded in the status history below.",
    ),
  ).toBeVisible();
});

test("the reason field is marked required only when the change needs a reason", async ({
  page,
}) => {
  
  
  
  await page.goto(
    `/dashboard/adoption-applications?query=${encodeURIComponent(
      APPLICANT_NAME,
    )}&status=PENDING`,
  );
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.goto(await rowMenuItemHref(page, 0, "Review"));
  await waitForPathname(page, REVIEW_PATH);

  const status = page.getByLabel("Application Status", { exact: true });
  const optionalReason = page.getByLabel("Reason for Status Change", {
    exact: true,
  });
  const requiredReason = page.getByLabel("Reason for Status Change *", {
    exact: true,
  });

  
  await expect(status).toHaveText("Pending");
  await expect(optionalReason).toHaveCount(0);
  await expect(requiredReason).toHaveCount(0);

  await status.click();
  await page.getByRole("option", { name: "Rejected", exact: true }).click();
  await expect(requiredReason).toBeVisible();
  await expect(optionalReason).toHaveCount(0);

  
  
  await status.click();
  await page.getByRole("option", { name: "Reviewing", exact: true }).click();
  await expect(optionalReason).toBeVisible();
  await expect(requiredReason).toHaveCount(0);
});
