import { test, expect, type Locator, type Page } from "@playwright/test";
import { storageStatePathFor } from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;
const locationsPath = "/dashboard/settings/locations";




const storageStatePath = storageStatePathFor("locations-admin.state.json");

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
      "ADMIN_PASSWORD must be available to run the locations E2E spec.",
    );
  }
  
  
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await signIn(page);
  await context.storageState({ path: storageStatePath });
  await context.close();
});

test.use({ storageState: storageStatePath });




const fillStable = async (field: Locator, text: string) => {
  await expect(async () => {
    await field.fill(text);
    await expect(field).toHaveValue(text, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
};



const locationCard = (page: Page, name: string) =>
  page
    .locator("div.border.rounded-lg.p-4.bg-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });





const locationMenuButton = (card: Locator) =>
  card.locator('button[aria-haspopup="menu"]').first();

const locationName = `E2E Location ${Date.now()}`;
const unitName = `E2E Unit ${Date.now()}`;

test("admin can create a location", async ({ page }) => {
  await page.goto(locationsPath);
  await page.getByRole("button", { name: "Add Location" }).click();

  await fillStable(page.getByLabel("Name *", { exact: true }), locationName);
  await page.getByLabel("Type *", { exact: true }).click();
  await page.getByRole("option", { name: "Isolation", exact: true }).click();
  await page
    .getByRole("button", { name: "Create Location", exact: true })
    .click();

  await expect(
    page.getByText("Location created successfully."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: locationName, exact: true }),
  ).toBeVisible();
});

test("admin can add a unit to the new location", async ({ page }) => {
  await page.goto(locationsPath);
  const card = locationCard(page, locationName);

  
  
  await card.getByRole("button", { name: "Add Unit" }).first().click();
  await fillStable(page.getByLabel("Name *", { exact: true }), unitName);
  await fillStable(page.getByLabel("Capacity *", { exact: true }), "2");
  await page
    .getByRole("button", { name: "Create Unit", exact: true })
    .click();

  await expect(page.getByText("Unit created successfully.")).toBeVisible();
  await expect(card.getByText(`${unitName} · cap 2`)).toBeVisible();
});

test("a location with units cannot be deleted", async ({ page }) => {
  await page.goto(locationsPath);
  const card = locationCard(page, locationName);

  await locationMenuButton(card).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();

  await expect(
    page.getByText(
      "Can't delete this location while it still has units. Delete or move its units first.",
    ),
  ).toBeVisible();
  
  await expect(card.getByText("Deleted")).not.toBeVisible();
});

test("removing the unit then deleting the location succeeds", async ({
  page,
}) => {
  await page.goto(locationsPath);
  const card = locationCard(page, locationName);

  
  
  
  const unitMenuButton = card.locator('button[aria-haspopup="menu"]').nth(1);
  await unitMenuButton.click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByText("Unit deleted successfully.")).toBeVisible();
  
  
  
  await expect(card.getByText(unitName)).toBeVisible();
  await expect(card.getByText("Deleted")).toBeVisible();

  await locationMenuButton(card).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(
    page.getByText("Location deleted successfully."),
  ).toBeVisible();

  
  await expect(
    page.getByRole("heading", { name: locationName, exact: true }),
  ).not.toBeVisible();
});

test("the deleted location only shows under the Deleted status filter, can't receive new units, and shows with the active ones when both are selected", async ({
  page,
}) => {
  await page.goto(locationsPath);
  await expect(
    page.getByRole("heading", { name: locationName, exact: true }),
  ).not.toBeVisible();

  await page.getByRole("button", { name: "Status" }).click();
  await page.getByRole("option", { name: "Deleted", exact: true }).click();
  await page.keyboard.press("Escape");

  const card = locationCard(page, locationName);
  await expect(card).toBeVisible();
  
  await expect(card.getByText("Deleted").first()).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Add Unit" }).first(),
  ).toBeDisabled();

  
  
  await page.getByRole("button", { name: "Status" }).click();
  await page.getByRole("option", { name: "Active", exact: true }).click();
  await page.keyboard.press("Escape");

  await expect(card).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cat room", exact: true }),
  ).toBeVisible();
});
