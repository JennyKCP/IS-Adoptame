import { test, expect, type Locator, type Page } from "@playwright/test";
import { storageStatePathFor } from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;




const storageStatePath = storageStatePathFor(
  "phone-normalization-admin.state.json",
);

test.describe.configure({ mode: "serial" });

const signIn = async (page: Page) => {
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent("/dashboard")}`);
  const credentialsForm = page
    .locator("form")
    .filter({ has: page.getByLabel(/email address/i) });
  await page.getByLabel(/email address/i).fill("admin@example.com");
  await page.getByLabel(/^password$/i).fill(adminPassword!);
  await credentialsForm.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
};

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the phone normalization E2E spec.",
    );
  }
  
  
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await signIn(page);
  await context.storageState({ path: storageStatePath });
  await context.close();
});

test.use({ storageState: storageStatePath });









const ALEX = "Alex Duplicate";
const SAM = "Sam Duplicate";



const UNIQUE_PHONE = "+1 646 555 0111";

const rowsOf = (page: Page): Locator => page.locator("tbody tr");

const gotoSearch = async (page: Page, query: string) => {
  await page.goto(
    `/dashboard/people-directory?query=${encodeURIComponent(query)}`,
  );
};




const fillStable = async (field: Locator, text: string) => {
  await expect(async () => {
    await field.fill(text);
    await expect(field).toHaveValue(text, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
};

const nameField = (page: Page) => page.getByLabel("Name *", { exact: true });

const phoneField = (page: Page) => page.getByLabel(/^Phone/);

const submitNewPerson = async (page: Page, name: string, phone: string) => {
  await page.goto("/dashboard/people-directory/new");
  await fillStable(nameField(page), name);
  await fillStable(phoneField(page), phone);
  await page.getByRole("button", { name: /^Create Person$/ }).click();
};




const PERSON_PROFILE_URL = /\/dashboard\/people-directory\/(?!new$)[^/]+$/;

const duplicateAlert = (page: Page) =>
  page.getByRole("alert").filter({ hasText: "Possible duplicate person" });



test("a digits-only query finds both stored formats of the same number", async ({
  page,
}) => {
  
  
  
  
  await gotoSearch(page, "2125550188");

  const rows = rowsOf(page);
  await expect(rows).toHaveCount(2);
  
  await expect(rows.filter({ hasText: ALEX })).toContainText("(212) 555-0188");
  await expect(rows.filter({ hasText: SAM })).toContainText("212.555.0188");
});

test("a differently formatted phone triggers the duplicate warning, and Use them instead opens the match", async ({
  page,
}) => {
  await submitNewPerson(page, "E2E Phone Dup Probe", "+1 212 555 0188");

  
  await expect(duplicateAlert(page)).toBeVisible();
  await expect(duplicateAlert(page)).toContainText(
    new RegExp(`${ALEX}|${SAM}`),
  );
  
  
  await expect(
    page.getByRole("button", { name: "Continue anyway" }),
  ).toBeVisible();
  
  await expect(page).toHaveURL(/\/dashboard\/people-directory\/new/);

  const matched = await duplicateAlert(page).textContent();
  await duplicateAlert(page).getByRole("link", { name: "Use them instead" }).click();

  await page.waitForURL(PERSON_PROFILE_URL, { timeout: 60_000 });
  
  const expected = matched?.includes(ALEX) ? ALEX : SAM;
  await expect(page.getByText(expected).first()).toBeVisible();
});

test("a phone no one else holds creates the person with no warning", async ({
  page,
}) => {
  await submitNewPerson(page, "E2E Unique Phone", UNIQUE_PHONE);

  
  await page.waitForURL(PERSON_PROFILE_URL, { timeout: 60_000 });
  await expect(page.getByText("E2E Unique Phone").first()).toBeVisible();
  await expect(duplicateAlert(page)).toHaveCount(0);
});



test("Continue anyway saves the record past the warning", async ({ page }) => {
  const name = "E2E Dup Confirmed";
  const phone = "212.555.0188";
  await submitNewPerson(page, name, phone);

  await expect(duplicateAlert(page)).toBeVisible();
  await page.getByRole("button", { name: "Continue anyway" }).click();

  await page.waitForURL(PERSON_PROFILE_URL, { timeout: 60_000 });
  await expect(page.getByText(name).first()).toBeVisible();
  
  await expect(page.getByText(phone)).toBeVisible();
});
