import { test, expect, type Page } from "@playwright/test";
import { bootstrapAdminAuth, firstRowIdByQuery } from "../support/note-audit";
import {
  APPLICANT_NAME,
  MY_APPLICATIONS_PATH,
  SEEDED_USER_PASSWORD,
  fillStable,
  signIn,
  storageStatePathFor,
} from "../support/applications";















const storageState = storageStatePathFor("user-deactivation-admin.state.json");
const roleManagementPath = "/dashboard/settings/role-management";

const ACCOUNT_EMAIL = "casey.deactivated@example.com";
const ACCOUNT_NAME = "Casey Deactivated";
const MOVED_EMAIL = "casey.deactivated.moved@example.com";
const REASON = "Repeated harassing applications";

test.describe.configure({ mode: "serial", retries: 0 });
test.use({ trace: "retain-on-failure" });

test.beforeAll(async ({ browser }) => {
  await bootstrapAdminAuth(browser, storageState);
});

test.use({ storageState });

const accountRow = (page: Page) =>
  page.getByRole("row").filter({ hasText: ACCOUNT_EMAIL });

const findAccount = async (page: Page, status: "active" | "deactivated") => {
  await page.goto(
    `${roleManagementPath}?query=${encodeURIComponent(ACCOUNT_EMAIL)}&status=${status}`,
  );
};

const openRowMenu = async (page: Page, itemName: RegExp) => {
  await accountRow(page).getByRole("button", { name: /open menu/i }).click();
  await page.getByRole("menuitem", { name: itemName }).click();
  return page.getByRole("alertdialog");
};

test("the Deactivated filter lists the seeded account and the Status column shows it", async ({
  page,
}) => {
  await findAccount(page, "deactivated");
  await expect(accountRow(page)).toBeVisible();
  await expect(accountRow(page).getByText("Deactivated", { exact: true })).toBeVisible();

  
  await findAccount(page, "active");
  await expect(accountRow(page)).toHaveCount(0);
});

test("a deactivated account cannot sign in, and is told why", async ({
  browser,
}) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent("/dashboard")}`);
  await page.getByLabel(/email address/i).fill(ACCOUNT_EMAIL);
  await page.getByLabel(/^password$/i).fill(SEEDED_USER_PASSWORD);
  await page
    .locator("form")
    .filter({ has: page.getByLabel(/email address/i) })
    .getByRole("button", { name: /^sign in$/i })
    .click();

  
  await expect(page.getByText(/account has been deactivated/i)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/sign-in");

  
  
  
  
  
  
  
  
  await page.goto("/sign-in?error=ACCOUNT_DEACTIVATED");
  
  
  const alert = page.locator('[data-slot="alert"]');
  await expect(alert).toContainText(/account has been deactivated/i);

  
  
  await page.goto(
    "/sign-in?error=state_mismatch&error_description=Call%20555-0100%20now",
  );
  await expect(alert).toContainText(/contact the shelter if it keeps/i);
  await expect(alert).not.toContainText("555-0100");
  await context.close();
});




test("staff can edit the email of a deactivated account, but not of an active one", async ({
  page,
}) => {
  
  
  
  test.setTimeout(180_000);

  const accountPersonId = await firstRowIdByQuery(
    page,
    "/dashboard/people-directory",
    ACCOUNT_NAME,
  );

  const setEmail = async (personId: string, email: string) => {
    await page.goto(`/dashboard/people-directory/${personId}/edit`);
    await fillStable(page.getByLabel("Email (or phone)"), email);
    await page.getByRole("button", { name: "Save Changes" }).click();
  };

  await setEmail(accountPersonId, MOVED_EMAIL);
  await expect(page.getByText("Person updated successfully.")).toBeVisible();

  await page.goto(`/dashboard/people-directory/${accountPersonId}`);
  await expect(page.getByText(MOVED_EMAIL).first()).toBeVisible();

  
  
  
  const header = page.locator('[data-slot="card"]').first();
  await expect(header.getByText("Deactivated", { exact: true })).toBeVisible();
  await expect(header).toContainText("account cannot sign in");

  
  await setEmail(accountPersonId, ACCOUNT_EMAIL);
  await expect(page.getByText("Person updated successfully.")).toBeVisible();

  
  const activePersonId = await firstRowIdByQuery(
    page,
    "/dashboard/people-directory",
    APPLICANT_NAME,
  );
  await page.goto(`/dashboard/people-directory/${activePersonId}`);
  await expect(
    page.locator('[data-slot="card"]').first().getByText("Deactivated"),
  ).toHaveCount(0);
  await setEmail(activePersonId, "someone.else@example.com");
  await expect(
    page.getByText(/signs in with this address/i),
  ).toBeVisible();
});

test("reactivating restores sign-in, and deactivating ends a session already open", async ({
  page,
  browser,
}) => {
  await findAccount(page, "deactivated");
  let dialog = await openRowMenu(page, /^reactivate$/i);
  await dialog.getByRole("button", { name: /^reactivate$/i }).click();
  await expect(page.getByText("Account reactivated.")).toBeVisible();

  
  const context = await browser.newContext({ storageState: undefined });
  const applicant = await context.newPage();
  await signIn(applicant, ACCOUNT_EMAIL, SEEDED_USER_PASSWORD);
  await applicant.goto(MY_APPLICATIONS_PATH);
  expect(new URL(applicant.url()).pathname).toBe(MY_APPLICATIONS_PATH);

  
  await findAccount(page, "active");
  dialog = await openRowMenu(page, /^deactivate$/i);
  const confirm = dialog.getByRole("button", { name: /^deactivate$/i });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Reason").fill(REASON);
  await confirm.click();
  await expect(page.getByText("Account deactivated.")).toBeVisible();

  
  
  
  
  await applicant.goto(MY_APPLICATIONS_PATH);
  await applicant.waitForURL((url) => url.pathname === "/sign-in", {
    timeout: 60_000,
  });
  await context.close();

  
  
  await findAccount(page, "deactivated");
  await expect(accountRow(page)).toBeVisible();
});
