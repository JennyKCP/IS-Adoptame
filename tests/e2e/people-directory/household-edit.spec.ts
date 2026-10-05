import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  APPLICANT_EMAIL,
  SEEDED_USER_PASSWORD,
  signIn as signInAs,
  storageStatePathFor,
} from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;




const storageStatePath = storageStatePathFor("household-edit-admin.state.json");

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
      "ADMIN_PASSWORD must be available to run the household edit E2E spec.",
    );
  }
  
  
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await signIn(page);
  await context.storageState({ path: storageStatePath });
  await context.close();
});

test.use({ storageState: storageStatePath });




const personIdByName = async (page: Page, name: string) => {
  await page.goto(
    `/dashboard/people-directory?query=${encodeURIComponent(name)}`,
  );
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  const href = await firstRow.getByRole("link").first().getAttribute("href");
  if (!href) {
    throw new Error(`No person row found for query=${name}`);
  }
  return href.split("/").pop() as string;
};




const fillStable = async (field: Locator, text: string) => {
  await expect(async () => {
    await field.fill(text);
    await expect(field).toHaveValue(text, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
};

test("adding a household from the empty state saves it and shows the new values on the profile", async ({
  page,
}) => {
  const alexId = await personIdByName(page, "Alex Duplicate");
  await page.goto(`/dashboard/people-directory/${alexId}`);
  await expect(
    page.getByText("No household information on file."),
  ).toBeVisible();
  
  await page.getByRole("link", { name: "Add Household Info" }).click();
  await page.waitForURL(`**/dashboard/people-directory/*/household/edit`, {
    timeout: 60_000,
  });

  await page.getByLabel("Living Situation *").click();
  await page.getByRole("option", { name: "Rent Apartment" }).click();

  
  await page.getByLabel("Do you have landlord permission? *").click();
  await page.getByRole("option", { name: "Yes" }).click();

  await fillStable(page.getByLabel("Household Size *"), "4");

  await page.getByLabel("Do you have a yard? *").click();
  await page.getByRole("option", { name: "Yes" }).click();

  await page.getByLabel("Do you have children at home? *").click();
  await page.getByRole("option", { name: "No" }).click();

  const animalExperience = `E2E household save ${Date.now()}`;
  await fillStable(
    page.getByLabel("Experience with Animals *"),
    animalExperience,
  );

  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Household profile updated.")).toBeVisible();
  await page.waitForURL(`**/dashboard/people-directory/${alexId}`, {
    timeout: 60_000,
  });

  
  
  await expect(page.getByText("Rent Apartment")).toBeVisible();
  await expect(page.getByText(animalExperience)).toBeVisible();

  
  await expect(page.getByText(/Last edited by Admin User on /)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit Household Info" }),
  ).toBeVisible();
});





test("a registered user's household is staff-editable", async ({ page }) => {
  const janeId = await personIdByName(page, "Jane Doe");
  await page.goto(`/dashboard/people-directory/${janeId}`);
  await expect(
    page.getByRole("link", { name: /(Edit|Add) Household Info/ }),
  ).toBeVisible();

  await page.goto(`/dashboard/people-directory/${janeId}/household/edit`);
  await expect(page.getByLabel("Living Situation *")).toBeVisible();
});




test("the owner's own edit is attributed to them", async ({
  page,
  browser,
}) => {
  const janeId = await personIdByName(page, "Jane Doe");

  
  const context = await browser.newContext({ storageState: undefined });
  const ownerPage = await context.newPage();
  try {
    await signInAs(ownerPage, APPLICANT_EMAIL, SEEDED_USER_PASSWORD);
    await ownerPage.goto("/dashboard/account");
    await fillStable(
      ownerPage.getByLabel("Experience with Animals *"),
      `Owner edit ${Date.now()}`,
    );
    await ownerPage.getByRole("button", { name: "Save Household Info" }).click();
    await expect(
      ownerPage.getByText("Household information updated successfully."),
    ).toBeVisible();
  } finally {
    await context.close();
  }

  await page.goto(`/dashboard/people-directory/${janeId}`);
  await expect(page.getByText(/Last edited by Jane Doe on /)).toBeVisible();
});
