import { test, expect, type Page } from "@playwright/test";
import {
  APPLICANT_EMAIL,
  APPLICANT_NAME,
  MY_APPLICATIONS_PATH,
  SEEDED_USER_PASSWORD,
  bootstrapStorageState,
  storageStatePathFor,
  waitForPathname,
} from "../support/applications";














const ANIMAL_NAME = "Godzilla";



const GROUP_LIMIT = 5;

const staffState = storageStatePathFor("global-search-staff.state.json");
const adopterState = storageStatePathFor("global-search-adopter.state.json");

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await bootstrapStorageState(browser, {
    email: "staff1@example.com",
    password: SEEDED_USER_PASSWORD,
    storageStatePath: staffState,
  });
  await bootstrapStorageState(browser, {
    email: APPLICANT_EMAIL,
    password: SEEDED_USER_PASSWORD,
    storageStatePath: adopterState,
  });
});


const palette = (page: Page) => page.getByRole("dialog", { name: "Search" });

const searchInput = (page: Page) =>
  palette(page).getByPlaceholder(
    "Search animals, people, partners, applications…",
  );




const groupHeading = (page: Page, heading: string) =>
  palette(page).locator("[cmdk-group-heading]", {
    hasText: new RegExp(`^${heading}$`),
  });





const rowsUnder = (page: Page, pathPrefix: string) =>
  palette(page).locator(`[cmdk-item][data-href^="${pathPrefix}"]`);

const themeToggle = (page: Page) =>
  page.getByRole("button", { name: "Toggle theme" });

const searchBar = (page: Page) => page.getByRole("button", { name: "Search" });


const openPalette = async (page: Page, via: "shortcut" | "search bar") => {
  await expect(async () => {
    if (via === "shortcut") {
      await page.keyboard.press("ControlOrMeta+k");
    } else {
      await searchBar(page).click();
    }
    await expect(palette(page)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
};

test.describe("staff", () => {
  test.use({ storageState: staffState });

  test("⌘K, a name, Enter — and the animal's page; then a person and their applications, in separate groups", async ({
    page,
  }) => {
    await page.goto("/dashboard/animals");
    await expect(themeToggle(page)).toBeVisible();

    await openPalette(page, "shortcut");
    await searchInput(page).fill(ANIMAL_NAME);

    const animalRow = rowsUnder(page, "/dashboard/animals/");
    await expect(animalRow).toHaveCount(1);
    
    await expect(animalRow).toHaveAttribute("aria-selected", "true");
    const href = await animalRow.getAttribute("data-href");
    expect(href).toBeTruthy();

    await page.keyboard.press("Enter");
    await waitForPathname(page, href!);
    
    await expect(palette(page)).toBeHidden();
    await expect(
      page.getByText(ANIMAL_NAME, { exact: true }).first(),
    ).toBeVisible();

    
    
    
    await openPalette(page, "shortcut");
    await searchInput(page).fill("Jane");

    await expect(groupHeading(page, "People")).toBeVisible();
    const personRows = rowsUnder(page, "/dashboard/people-directory/");
    await expect(personRows).toHaveCount(1);
    await expect(personRows).toContainText(APPLICANT_NAME);

    await expect(groupHeading(page, "Adoption applications")).toBeVisible();
    const applicationRows = rowsUnder(page, "/dashboard/adoption-applications/");
    await expect(applicationRows).toHaveCount(GROUP_LIMIT);
    await expect(applicationRows.first()).toContainText(APPLICANT_NAME);
  });

  test("the header search bar opens the palette", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(searchBar(page)).toBeVisible();

    await openPalette(page, "search bar");
    
    
    await expect(groupHeading(page, "Pages")).toBeVisible();
    await expect(
      palette(page).locator('[cmdk-item][data-href="/dashboard/animals"]'),
    ).toBeVisible();
    await expect(groupHeading(page, "People")).toHaveCount(0);
  });

  test("Esc closes the palette", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(themeToggle(page)).toBeVisible();

    await openPalette(page, "shortcut");
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();
  });
});

test.describe("an adopter", () => {
  test.use({ storageState: adopterState });

  test("gets no search bar and no shortcut", async ({ page }) => {
    await page.goto(MY_APPLICATIONS_PATH);
    
    
    await expect(themeToggle(page)).toBeVisible();
    await expect(searchBar(page)).toHaveCount(0);

    await page.keyboard.press("ControlOrMeta+k");
    
    
    await page.waitForTimeout(1_000);
    await expect(palette(page)).toHaveCount(0);
  });
});
