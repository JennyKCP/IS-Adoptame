import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  fillStable,
  waitForPathname,
  storageStatePathFor,
} from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;
const fostersPath = "/dashboard/fosters";
const newPlacementPath = "/dashboard/fosters/placements/new";




const storageStatePath = storageStatePathFor("fosters-admin.state.json");

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
      "ADMIN_PASSWORD must be available to run the fosters E2E spec.",
    );
  }
  
  
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await signIn(page);
  await context.storageState({ path: storageStatePath });
  await context.close();
});






const SHELTER_ZONE = process.env.SHELTER_TIMEZONE || "America/New_York";

test.use({ storageState: storageStatePath, timezoneId: SHELTER_ZONE });


const shelterToday = () => {
  
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHELTER_ZONE,
  })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(year, month - 1, day);
};











const OVERDUE_ANIMAL = "Juniper";


let placedAnimalName = "";
let placedAnimalUrl = "";
let generalPlacementId = "";

const banner = (page: Page) =>
  page.locator("div").filter({ hasText: /^In foster with/ }).first();



const chooseFromSelect = async (
  page: Page,
  label: string,
  option: string | RegExp,
) => {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option }).first().click();
};



const openCreateFormForAvailableFoster = async (page: Page) => {
  await page.goto(`${fostersPath}?capacity=available`);
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  await firstRow.locator('button[aria-haspopup="menu"]').first().click();
  await page.getByRole("menuitem", { name: "New Placement" }).click();
  await page.waitForURL(`**${newPlacementPath}?fosterProfileId=*`);
  return page.url();
};



const pickFirstEligibleAnimal = async (page: Page) => {
  await page.getByRole("combobox", { name: /animal/i }).click();
  const firstOption = page.getByRole("option").first();
  await expect(firstOption).toBeVisible();
  const name = (await firstOption.locator("p").first().innerText()).trim();
  await firstOption.click();
  return name;
};





const dayCell = (calendar: Locator, date: Date) =>
  calendar.locator(
    `button[data-day="${date.toLocaleDateString("en-US")}"]`,
  );

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const placementIdFromBanner = async (page: Page) => {
  const href = await banner(page)
    .getByRole("link", { name: "Return from Foster" })
    .getAttribute("href");
  const match = href?.match(/placements\/([^/]+)\/return/);
  if (!match) throw new Error(`No placement id in Return href: ${href}`);
  return match[1];
};

test("an animal can be placed in foster without an expected return date", async ({
  page,
}) => {
  await openCreateFormForAvailableFoster(page);

  placedAnimalName = await pickFirstEligibleAnimal(page);
  await chooseFromSelect(page, "Placement Type *", "General");

  
  
  await expect(page.getByText("No expected date")).toBeVisible();

  await page.getByRole("button", { name: "Place in Foster" }).click();

  await expect(page.getByText("Placement created.")).toBeVisible();
  await page.waitForURL("**/dashboard/animals/**");
  placedAnimalUrl = page.url();

  await expect(banner(page)).toContainText("In foster with");
  await expect(banner(page)).toContainText("General");
  
  await expect(banner(page)).not.toContainText("expected return");

  generalPlacementId = await placementIdFromBanner(page);
});

test("an animal already in foster cannot be placed again", async ({ page }) => {
  const animalId = placedAnimalUrl.split("/").pop();
  await page.goto(`${newPlacementPath}?animalId=${animalId}`);

  await expect(
    page.getByRole("heading", { name: "Already In Foster" }),
  ).toBeVisible();
  await expect(
    page.getByText(`${placedAnimalName} already has an open foster placement`),
  ).toBeVisible();
});

test("a general placement cannot be converted to an adoption", async ({
  page,
}) => {
  
  
  
  await page.goto(
    `/dashboard/fosters/placements/${generalPlacementId}/convert`,
  );

  await expect(
    page.getByRole("heading", { name: "Not a Foster-to-Adopt Placement" }),
  ).toBeVisible();
});

test("the calendar refuses a past expected return date", async ({ page }) => {
  const today = shelterToday();
  
  
  test.skip(today.getDate() === 1, "No past day is in view on the 1st.");

  await openCreateFormForAvailableFoster(page);
  
  
  
  await page
    .getByRole("button", { name: /^Expected Return Date:/ })
    .click();

  const calendar = page.getByRole("dialog");
  await expect(calendar).toBeVisible();
  
  
  
  
  await expect(dayCell(calendar, startOfMonth(today))).toBeDisabled();
  
  
  await expect(dayCell(calendar, today)).toBeEnabled();
});

test("a placement can record an expected return date", async ({ page }) => {
  await openCreateFormForAvailableFoster(page);

  await pickFirstEligibleAnimal(page);
  await chooseFromSelect(page, "Placement Type *", "Medical");

  
  
  
  await page
    .getByRole("button", { name: /^Expected Return Date:/ })
    .click();
  const calendar = page.getByRole("dialog");
  
  await calendar.getByRole("button", { name: /Go to the Next Month/i }).click();
  const now = shelterToday();
  await dayCell(
    calendar,
    new Date(now.getFullYear(), now.getMonth() + 1, 15),
  ).click();
  await expect(page.getByText("No expected date")).toBeHidden();

  await page.getByRole("button", { name: "Place in Foster" }).click();

  await expect(page.getByText("Placement created.")).toBeVisible();
  await page.waitForURL("**/dashboard/animals/**");
  await expect(banner(page)).toContainText("expected return");
});

test("an overdue placement is flagged on the animal profile", async ({
  page,
}) => {
  await page.goto(`/dashboard/animals?query=${OVERDUE_ANIMAL}`);
  await page.getByRole("link", { name: OVERDUE_ANIMAL, exact: true }).click();
  await page.waitForURL("**/dashboard/animals/**");

  
  
  
  await expect(banner(page)).toContainText("expected return");
  await expect(banner(page)).toContainText("Overdue");
});

test("an animal can be returned from foster", async ({ page }) => {
  await page.goto(placedAnimalUrl);
  await banner(page).getByRole("link", { name: "Return from Foster" }).click();
  await page.waitForURL("**/return");

  
  await page.getByLabel("Return Reason *", { exact: true }).click();
  const returnedToShelter = page.getByRole("option", {
    name: "Returned To Shelter",
    exact: true,
  });
  await expect(returnedToShelter).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Ended By Outcome" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "Adopted By Foster" }),
  ).toHaveCount(0);
  await returnedToShelter.click();

  
  
  const unitTrigger = page.getByLabel("Unit *", { exact: true });
  if ((await unitTrigger.innerText()).includes("Select a unit")) {
    await page.getByText("Select a location").click();
    await page.getByRole("option").first().click();
    await unitTrigger.click();
    await page.getByRole("option").first().click();
  }

  await page.getByRole("button", { name: "Return From Foster" }).click();

  await expect(page.getByText("Animal returned from foster.")).toBeVisible();
  await page.waitForURL("**/dashboard/animals/**");
  await expect(page.getByText("In foster with")).toBeHidden();

  
  
  
  await page.goto(
    `/dashboard/outcomes/create?animalId=${placedAnimalUrl.split("/").pop()}`,
  );
  await expect(
    page.getByRole("button", { name: "Process Outcome" }),
  ).toBeVisible();
  await expect(page.getByText(/is in foster with/)).toHaveCount(0);
});

test("a foster-to-adopt placement moves the listing to Pending Adoption and converts to an adoption", async ({
  page,
}) => {
  await openCreateFormForAvailableFoster(page);

  const animalName = await pickFirstEligibleAnimal(page);
  await chooseFromSelect(page, "Placement Type *", "Foster To Adopt");
  await expect(
    page.getByText(
      "The animal's listing will move to Pending Adoption while this placement is open.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Place in Foster" }).click();
  await expect(page.getByText("Placement created.")).toBeVisible();
  await page.waitForURL("**/dashboard/animals/**");

  await expect(banner(page)).toContainText("Foster To Adopt");
  await expect(
    page.getByText("Pending Adoption", { exact: true }).first(),
  ).toBeVisible();

  await banner(page).getByRole("link", { name: "Convert to Adoption" }).click();
  await page.waitForURL("**/convert");

  await page.getByRole("button", { name: "Convert to Adoption" }).click();
  await expect(
    page.getByRole("alertdialog").getByText(
      `${animalName} will be marked as adopted`,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm & Convert" }).click();

  await expect(
    page.getByText("Foster placement converted to adoption."),
  ).toBeVisible();
});

test("a paused foster offers no New Placement action", async ({ page }) => {
  await page.goto(`${fostersPath}?status=PAUSED`);
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  await expect(firstRow).toContainText("Paused");

  await firstRow.locator('button[aria-haspopup="menu"]').first().click();
  await expect(
    page.getByRole("menuitem", { name: "View Profile" }),
  ).toBeVisible();
  
  
  await expect(
    page.getByRole("menuitem", { name: "New Placement" }),
  ).toHaveCount(0);
});



const REVIEW_PATH = /^\/dashboard\/adoption-applications\/[^/]+\/review$/;










const pickApplicationAnimal = async (
  page: Page,
  animal: { id: string; name: string },
) => {
  await page
    .getByRole("combobox")
    .filter({ hasText: "Search for an animal" })
    .click();
  await page.getByPlaceholder("Type an animal name...").fill(animal.name);
  const option = page.locator(`[cmdk-item][data-value="${animal.id}"]`);
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  await expect(page.getByRole("button", { name: "Clear" })).toBeVisible();
};




const radioByGroupLabel = (
  page: Page,
  label: string,
  option: "Yes" | "No",
) =>
  page
    .locator("div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .filter({ has: page.getByRole("radio") })
    .last()
    .getByRole("radio", { name: option });






const firstPublishedAnimal = async (page: Page) => {
  await page.goto("/dashboard/animals?listingStatus=PUBLISHED&pageSize=10");
  const link = page.locator("tbody tr").first().getByRole("link").first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  const name = (await link.innerText()).trim();
  if (!href || !name) {
    throw new Error("No PUBLISHED animal row found.");
  }
  return { id: href.split("/").pop() as string, name };
};




const openRowMenuItem = async (row: Locator, itemName: string) => {
  const trigger = row.getByRole("button", { name: "Open menu" });
  const item = row.page().getByRole("menuitem", { name: itemName });
  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await item.isVisible())) {
      await trigger.click();
    }
    await expect(item).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await item.click();
};

test("converting with the foster's approved application linked makes it read Adopted on the staff table", async ({
  page,
}) => {
  
  const animal = await firstPublishedAnimal(page);

  
  
  await page.goto(`${fostersPath}?capacity=available`);
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  const personLink = firstRow.getByRole("link").first();
  const personHref = await personLink.getAttribute("href");
  if (!personHref) {
    throw new Error("No foster person link found in the roster.");
  }
  const fosterPersonId = personHref.split("/")[3];
  const fosterPersonName = (await personLink.innerText()).trim();

  await firstRow.locator('button[aria-haspopup="menu"]').first().click();
  await page.getByRole("menuitem", { name: "New Placement" }).click();
  await page.waitForURL(`**${newPlacementPath}?fosterProfileId=*`);
  const placementFormUrl = page.url();

  
  
  
  await page.goto(
    `/dashboard/adoption-applications/new?personId=${fosterPersonId}&returnTo=${encodeURIComponent(
      `/dashboard/people-directory/${fosterPersonId}/adoption-applications`,
    )}`,
  );
  await pickApplicationAnimal(page, animal);

  
  
  
  
  const applicantEmail = `foster-conversion-e2e-${Date.now()}@example.com`;
  await fillStable(page.getByLabel("Email *", { exact: true }), applicantEmail);
  await fillStable(
    page.getByLabel("Phone *", { exact: true }),
    "212-555-0199",
  );
  await fillStable(
    page.getByLabel("Address Line 1 *", { exact: true }),
    "12 Test Lane",
  );
  await fillStable(page.getByLabel("City *", { exact: true }), "New York");
  await fillStable(page.getByLabel("ZIP Code *", { exact: true }), "10001");
  await chooseFromSelect(page, "State *", "New York");
  await chooseFromSelect(page, "Living Situation *", "Own Home");
  await fillStable(page.getByLabel("Household Size *", { exact: true }), "2");
  await radioByGroupLabel(page, "Do they have a yard? *", "No").click();
  await radioByGroupLabel(
    page,
    "Are there children in the home? *",
    "No",
  ).click();
  await fillStable(
    page.getByLabel("Animal Experience *", { exact: true }),
    "Longtime foster, prior pet owner.",
  );
  await fillStable(
    page.getByLabel("Reason for Adoption *", { exact: true }),
    `Foster-to-adopt conversion coverage — E2E ${Date.now()}`,
  );
  await page.getByRole("button", { name: "Submit Application" }).click();
  await expect(
    page.getByText("Application submitted successfully."),
  ).toBeVisible();
  await waitForPathname(
    page,
    `/dashboard/people-directory/${fosterPersonId}/adoption-applications`,
  );

  
  
  
  
  
  
  
  const applicationRow = page
    .locator("tbody tr")
    .filter({ has: page.locator(`a[href="/dashboard/animals/${animal.id}"]`) })
    .filter({ has: page.getByText("Pending", { exact: true }) });
  await expect(applicationRow).toBeVisible();
  await openRowMenuItem(applicationRow, "Review");
  await waitForPathname(page, REVIEW_PATH);

  await chooseFromSelect(page, "Application Status", "Approved");
  await fillStable(
    page.getByLabel("Reason for Status Change *", { exact: true }),
    "Approved ahead of a foster-to-adopt conversion.",
  );
  await page.getByRole("button", { name: "Update Application" }).click();
  await expect(
    page.getByText("Application updated successfully."),
  ).toBeVisible();

  
  
  
  
  await page.goto(placementFormUrl);
  await page.getByRole("combobox", { name: /animal/i }).click();
  await page.getByPlaceholder("Search animals…").fill(animal.name);
  const placementAnimalOption = page.locator(
    `[cmdk-item][data-value*="${animal.id}"]`,
  );
  await expect(placementAnimalOption).toBeVisible();
  await placementAnimalOption.click();
  await chooseFromSelect(page, "Placement Type *", "Foster To Adopt");
  await page.getByRole("button", { name: "Place in Foster" }).click();
  await expect(page.getByText("Placement created.")).toBeVisible();
  await page.waitForURL("**/dashboard/animals/**");

  await banner(page).getByRole("link", { name: "Convert to Adoption" }).click();
  await page.waitForURL("**/convert");

  
  
  
  const applicationRadio = page.getByRole("radio", {
    name: `${fosterPersonName}'s application`,
  });
  await expect(applicationRadio).toBeChecked();

  await page.getByRole("button", { name: "Convert to Adoption" }).click();
  await page.getByRole("button", { name: "Confirm & Convert" }).click();
  await expect(
    page.getByText("Foster placement converted to adoption."),
  ).toBeVisible();

  
  
  
  await page.goto(
    `/dashboard/adoption-applications?query=${encodeURIComponent(
      fosterPersonName,
    )}&pageSize=20`,
  );
  await expect(page.getByText(/of \d+ row\(s\) selected/)).toBeVisible();
  const staffRow = page
    .locator("tbody tr")
    .filter({ hasText: applicantEmail });
  await expect(staffRow).toBeVisible();
  await expect(
    staffRow.getByText("Adopted", { exact: true }).first(),
  ).toBeVisible();
});
