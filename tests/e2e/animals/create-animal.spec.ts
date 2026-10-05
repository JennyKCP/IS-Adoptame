import { expect, test, type Page } from "@playwright/test";
import {
  bootstrapStorageState,
  fillStable,
  storageStatePathFor,
  waitForPathname,
} from "../support/applications";





const adminPassword = process.env.ADMIN_PASSWORD;

const storageStatePath = storageStatePathFor("create-animal.state.json");

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the create animal E2E spec.",
    );
  }
  await bootstrapStorageState(browser, {
    email: "admin@example.com",
    password: adminPassword,
    storageStatePath,
  });
});




const SHELTER_ZONE = process.env.SHELTER_TIMEZONE || "America/New_York";

test.use({ storageState: storageStatePath, timezoneId: SHELTER_ZONE });




const waitForFormHydration = async (page: Page, submitName: string) => {
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: submitName }) });
  await expect(form).toBeVisible();
  await expect
    .poll(() =>
      form.evaluate((el) =>
        Object.keys(el).some((key) => key.startsWith("__reactProps")),
      ),
    )
    .toBe(true);
};




const chooseFromSelect = async (
  page: Page,
  label: string,
  option: string | null,
) => {
  const options = page.getByRole("option");
  const choice =
    option === null
      ? options.first()
      : page.getByRole("option", { name: option, exact: true });
  await expect(async () => {
    if (!(await choice.isVisible())) {
      await page.getByLabel(label, { exact: true }).click();
    }
    await expect(choice).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await choice.click();
  await expect(options).toHaveCount(0);
};



const openCalendar = async (page: Page, label: RegExp) => {
  const calendar = page.getByRole("dialog");
  await expect(async () => {
    if (!(await calendar.isVisible())) {
      await page.getByRole("button", { name: label }).click();
    }
    await expect(calendar).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return calendar;
};

const toast = (page: Page, message: string | RegExp) =>
  page.locator("[data-sonner-toast]").filter({ hasText: message });

test("an animal created with the required fields is saved and listed", async ({
  page,
}) => {
  test.setTimeout(120_000);
  
  const name = `Created by form ${Date.now()}`;

  
  
  
  
  
  
  await page.goto("/dashboard/animals");
  const addAnimal = page.getByRole("link", { name: "Add Animal" });
  await expect
    .poll(() =>
      addAnimal.evaluate((el) =>
        Object.keys(el).some((key) => key.startsWith("__reactProps")),
      ),
    )
    .toBe(true);
  
  await page.evaluate(() => {
    (window as { sameDocument?: boolean }).sameDocument = true;
  });
  await addAnimal.click();
  await waitForPathname(page, "/dashboard/animals/create");
  await waitForFormHydration(page, "Create Intake");

  await fillStable(page.getByLabel("Animal Name *", { exact: true }), name);
  await chooseFromSelect(page, "Species *", null);
  await chooseFromSelect(page, "Breed *", null);
  await chooseFromSelect(page, "Primary Color *", null);
  
  
  await chooseFromSelect(page, "Intake Type *", "Seize");
  
  const birthCalendar = await openCalendar(page, /^Estimated Birth Date \*:/);
  await birthCalendar
    .locator("button[data-day]:not([disabled])")
    .nth(0)
    .click();
  await page.keyboard.press("Escape");
  await expect(birthCalendar).toBeHidden();

  await page.getByRole("button", { name: "Create Intake" }).click();

  await expect(
    toast(page, "Animal intake created successfully."),
  ).toBeVisible();
  await waitForPathname(page, "/dashboard/animals");

  
  await expect(
    page.locator("tbody").getByRole("link", { name, exact: true }),
  ).toHaveAttribute("href", /^\/dashboard\/animals\/[^/]+$/);
  expect(
    await page.evaluate(
      () => (window as { sameDocument?: boolean }).sameDocument,
    ),
  ).toBe(true);
});
