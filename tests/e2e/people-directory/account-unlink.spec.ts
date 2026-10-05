import { test, expect } from "@playwright/test";
import { bootstrapAdminAuth, firstRowIdByQuery } from "../support/note-audit";
import {
  MY_APPLICATIONS_PATH,
  SEEDED_USER_PASSWORD,
  signIn,
  storageStatePathFor,
} from "../support/applications";












const storageState = storageStatePathFor("account-unlink-admin.state.json");







test.describe.configure({ mode: "serial", retries: 0 });




test.use({ trace: "retain-on-failure" });

test.beforeAll(async ({ browser }) => {
  await bootstrapAdminAuth(browser, storageState);
});

test.use({ storageState });

const ACCOUNT_EMAIL = "pat.mislinked@example.com";
const RECORD_PHONE = "212-555-0166";

let originalPersonId: string;

test("unlinking moves the login to a record of its own", async ({ page }) => {
  
  
  originalPersonId = await firstRowIdByQuery(
    page,
    "/dashboard/people-directory",
    "Pat Mislinked",
  );

  await page.goto(`/dashboard/people-directory/${originalPersonId}`);
  
  await expect(page.getByText("Sign-in Email")).toBeVisible();
  
  await expect(page.getByText(RECORD_PHONE)).toBeVisible();

  await page.getByRole("button", { name: "Unlink Account" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText(ACCOUNT_EMAIL)).toBeVisible();
  await dialog.getByRole("button", { name: "Unlink Account" }).click();

  await expect(page.getByText("Login account unlinked.")).toBeVisible();

  
  
  
  await page.waitForURL(
    (url) =>
      /^\/dashboard\/people-directory\/[^/]+$/.test(url.pathname) &&
      !url.pathname.endsWith(originalPersonId),
    { timeout: 60_000 },
  );

  
  
  await expect(page.getByText(ACCOUNT_EMAIL).first()).toBeVisible();
  
  await expect(page.getByText(RECORD_PHONE)).toHaveCount(0);
});

test("the original record is staff-editable again", async ({ page }) => {
  await page.goto(`/dashboard/people-directory/${originalPersonId}`);

  
  
  await expect(page.getByText("Sign-in Email")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Unlink Account" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Edit Contact Info" }),
  ).toBeVisible();
});





test("the account still signs in, now on its own empty record", async ({
  browser,
}) => {
  
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  try {
    await signIn(page, ACCOUNT_EMAIL, SEEDED_USER_PASSWORD);
    await page.goto(MY_APPLICATIONS_PATH);
    await expect(page.getByText(/no results|no applications/i)).toBeVisible();
  } finally {
    await context.close();
  }
});
