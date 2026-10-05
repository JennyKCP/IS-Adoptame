import { test, expect, type Locator, type Page } from "@playwright/test";
import { storageStatePathFor } from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;




const storageStatePath = storageStatePathFor("animal-edit-admin.state.json");

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
      "ADMIN_PASSWORD must be available to run the animal edit E2E spec.",
    );
  }
  
  
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await signIn(page);
  await context.storageState({ path: storageStatePath });
  await context.close();
});

test.use({ storageState: storageStatePath });




const firstAnimalIdByStatus = async (page: Page, status: string) => {
  await page.goto(`/dashboard/animals?listingStatus=${status}&pageSize=10`);
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  const href = await firstRow.getByRole("link").first().getAttribute("href");
  if (!href) {
    throw new Error(`No animal row found for listingStatus=${status}`);
  }
  return href.split("/").pop() as string;
};




const fillStable = async (field: Locator, text: string) => {
  await expect(async () => {
    await field.fill(text);
    await expect(field).toHaveValue(text, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
};

const saveDescription = async (page: Page, animalId: string, text: string) => {
  await page.goto(`/dashboard/animals/${animalId}/edit`);
  const description = page.getByLabel("Description");
  await expect(description).toBeVisible();
  await fillStable(description, text);
  await page.getByRole("button", { name: "Save Changes" }).click();
};

const expectDescriptionPersists = async (
  page: Page,
  animalId: string,
  text: string,
) => {
  await expect(page.getByText("Animal updated successfully.")).toBeVisible();
  await page.waitForURL(`**/dashboard/animals/${animalId}`, { timeout: 60_000 });
  await page.goto(`/dashboard/animals/${animalId}/edit`);
  await expect(page.getByLabel("Description")).toHaveValue(text);
};




test("an archived or pending-adoption animal's description can be edited and persists", async ({
  page,
}) => {
  for (const [status, label] of [
    ["ARCHIVED", "Archived"],
    ["PENDING_ADOPTION", "Pending Adoption"],
  ] as const) {
    const animalId = await firstAnimalIdByStatus(page, status);
    const description = `${label} edit check ${Date.now()}`;
    await saveDescription(page, animalId, description);
    await expectDescriptionPersists(page, animalId, description);

    
    
    
    await expect(
      page.getByLabel("Listing Status *", { exact: true }),
    ).toContainText(label);
    expect(await firstAnimalIdByStatus(page, status)).toBe(animalId);
  }
});

test("the listing status select is disabled and pinned to the current value for locked statuses", async ({
  page,
}) => {
  for (const [status, label] of [
    ["ARCHIVED", "Archived"],
    ["PENDING_ADOPTION", "Pending Adoption"],
  ] as const) {
    const animalId = await firstAnimalIdByStatus(page, status);
    await page.goto(`/dashboard/animals/${animalId}/edit`);
    const statusSelect = page.getByLabel("Listing Status *", { exact: true });
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect).toBeDisabled();
    
    await expect(statusSelect).toContainText(label);
  }
});

test("an in-care animal's ordinary edit still saves", async ({ page }) => {
  
  const animalId = await firstAnimalIdByStatus(page, "PUBLISHED");
  const description = `Published edit check ${Date.now()}`;
  await saveDescription(page, animalId, description);
  await expectDescriptionPersists(page, animalId, description);
});

test("an archived animal's edit form disables the location and unit cascade", async ({
  page,
}) => {
  const animalId = await firstAnimalIdByStatus(page, "ARCHIVED");
  await page.goto(`/dashboard/animals/${animalId}/edit`);
  await expect(page.getByLabel("Location", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Unit", { exact: true })).toBeDisabled();
});
