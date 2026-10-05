import { test, expect, type Locator, type Page } from "@playwright/test";
import { storageStatePathFor } from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;




const storageStatePath = storageStatePathFor(
  "walk-in-adoption-admin.state.json",
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
      "ADMIN_PASSWORD must be available to run the walk-in adoption application E2E spec.",
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




const waitForPathname = (page: Page, pathname: string | RegExp) =>
  page.waitForURL(
    (url) =>
      typeof pathname === "string"
        ? url.pathname === pathname
        : pathname.test(url.pathname),
    { timeout: 60_000 },
  );

const EDIT_PATH = /^\/dashboard\/adoption-applications\/[^/]+\/edit$/;
const REVIEW_PATH = /^\/dashboard\/adoption-applications\/[^/]+\/review$/;




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




const pickAnimal = async (page: Page, animalName: string) => {
  
  
  await page
    .getByRole("combobox")
    .filter({ hasText: "Search for an animal" })
    .click();
  await page.getByPlaceholder("Type an animal name...").fill(animalName);
  const option = page.getByRole("option", { name: animalName }).first();
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




const openRowMenu = async (page: Page) => {
  const trigger = page
    .locator("tbody tr")
    .first()
    .getByRole("button", { name: "Open menu" });
  const reviewItem = page.getByRole("menuitem", { name: "Review" });
  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await reviewItem.isVisible())) {
      await trigger.click();
    }
    await expect(reviewItem).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
};

let walkInId: string;

test("Add Application opens the standalone form, and submitting it redirects to the person's tab with the new row", async ({
  page,
}) => {
  const animal = await firstPublishedAnimal(page);

  walkInId = await personIdByName(page, "WalkIn TestUser");
  await page.goto(
    `/dashboard/people-directory/${walkInId}/adoption-applications`,
  );

  
  const addLink = page.getByRole("link", { name: "Add Application" });
  await expect(addLink).toBeVisible();

  const href = await addLink.getAttribute("href");
  expect(href).toMatch(
    /^\/dashboard\/adoption-applications\/new\?personId=/,
  );
  expect(href).toContain(
    `returnTo=/dashboard/people-directory/${walkInId}/adoption-applications`,
  );

  await addLink.click();
  await waitForPathname(page, "/dashboard/adoption-applications/new");

  
  
  await expect(
    page.getByRole("link", { name: "Fostering", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Submitting on behalf of WalkIn TestUser"),
  ).toBeVisible();

  await pickAnimal(page, animal.name);

  
  
  await fillStable(
    page.getByLabel("Full Name *", { exact: true }),
    "WalkIn TestUser",
  );
  await fillStable(
    page.getByLabel("Email *", { exact: true }),
    "walkin.testuser@example.com",
  );
  await fillStable(
    page.getByLabel("Phone *", { exact: true }),
    "212-555-0177",
  );
  await fillStable(
    page.getByLabel("Address Line 1 *", { exact: true }),
    "410 Amsterdam Ave",
  );
  await fillStable(page.getByLabel("City *", { exact: true }), "New York");
  await fillStable(page.getByLabel("ZIP Code *", { exact: true }), "10024");

  await page.getByLabel("State *", { exact: true }).click();
  await page.getByRole("option", { name: "New York" }).click();

  await page.getByLabel("Living Situation *", { exact: true }).click();
  await page.getByRole("option", { name: "Own Home" }).click();

  await fillStable(
    page.getByLabel("Household Size *", { exact: true }),
    "3",
  );

  await radioByGroupLabel(page, "Do they have a yard? *", "No").click();
  await radioByGroupLabel(page, "Are there children in the home? *", "No").click();

  await fillStable(
    page.getByLabel("Animal Experience *", { exact: true }),
    "Grew up with two rescue dogs and fostered kittens for a local shelter.",
  );
  const reason = `Looking for a calm companion — E2E ${Date.now()}`;
  await fillStable(
    page.getByLabel("Reason for Adoption *", { exact: true }),
    reason,
  );

  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(
    page.getByText("Application submitted successfully."),
  ).toBeVisible();
  await waitForPathname(
    page,
    `/dashboard/people-directory/${walkInId}/adoption-applications`,
  );

  
  const row = page.locator("tbody tr").filter({ hasText: animal.name });
  await expect(row).toBeVisible();
  await expect(row.getByText("Pending", { exact: true })).toBeVisible();
});

test("the application can be edited from the row menu", async ({ page }) => {
  await page.goto(
    `/dashboard/people-directory/${walkInId}/adoption-applications`,
  );

  await openRowMenu(page);
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await waitForPathname(page, EDIT_PATH);

  
  await expect(
    page.getByRole("link", { name: "Fostering", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Animal to Adopt")).toHaveCount(0);

  const newReason = `Revised reason — E2E ${Date.now()}`;
  await fillStable(
    page.getByLabel("Reason for Adoption *", { exact: true }),
    newReason,
  );
  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(
    page.getByText("Application updated successfully."),
  ).toBeVisible();
  await waitForPathname(
    page,
    `/dashboard/people-directory/${walkInId}/adoption-applications`,
  );

  
  await openRowMenu(page);
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await waitForPathname(page, EDIT_PATH);
  await expect(
    page.getByLabel("Reason for Adoption *", { exact: true }),
  ).toHaveValue(newReason, { timeout: 15_000 });
});

test("the application can be reviewed, round-trip to Edit Application Fields, and have its status advanced", async ({
  page,
}) => {
  await page.goto(
    `/dashboard/people-directory/${walkInId}/adoption-applications`,
  );

  await openRowMenu(page);
  await page.getByRole("menuitem", { name: "Review" }).click();
  await waitForPathname(page, REVIEW_PATH);

  const reviewUrl = page.url();
  const appId = new URL(reviewUrl).pathname.split("/")[3];

  await expect(
    page.getByText("Applicant Information (Read-Only)"),
  ).toBeVisible();
  await expect(
    page.getByLabel("Full Name", { exact: true }),
  ).toBeDisabled();

  
  await page
    .getByRole("link", { name: "Edit Application Fields" })
    .click();
  await waitForPathname(
    page,
    `/dashboard/adoption-applications/${appId}/edit`,
  );
  expect(decodeURIComponent(new URL(page.url()).search)).toBe(
    `?returnTo=/dashboard/adoption-applications/${appId}/review`,
  );

  await page.getByRole("link", { name: "Cancel" }).click();
  await waitForPathname(
    page,
    `/dashboard/adoption-applications/${appId}/review`,
  );
  await expect(
    page.getByText("Applicant Information (Read-Only)"),
  ).toBeVisible();

  
  
  await page.goto(reviewUrl);

  
  await page.getByLabel("Application Status", { exact: true }).click();
  await page.getByRole("option", { name: "Reviewing" }).click();
  await page.getByRole("button", { name: "Update Application" }).click();

  await expect(
    page.getByText("Application updated successfully."),
  ).toBeVisible();
  await waitForPathname(
    page,
    `/dashboard/people-directory/${walkInId}/adoption-applications`,
  );

  const row = page.locator("tbody tr").first();
  await expect(row.getByText("Reviewing", { exact: true })).toBeVisible();
});

test("a withdrawn application can no longer be edited by staff", async ({
  page,
}) => {
  await page.goto(
    `/dashboard/people-directory/${walkInId}/adoption-applications`,
  );
  await openRowMenu(page);
  await page.getByRole("menuitem", { name: "Review" }).click();
  await waitForPathname(page, REVIEW_PATH);

  const appId = new URL(page.url()).pathname.split("/")[3];

  
  await page.getByLabel("Application Status", { exact: true }).click();
  await page.getByRole("option", { name: "Withdrawn" }).click();
  await fillStable(
    page.getByPlaceholder("Provide a reason for changing the status..."),
    "Applicant called to withdraw.",
  );
  await page.getByRole("button", { name: "Update Application" }).click();
  await expect(
    page.getByText("Application updated successfully."),
  ).toBeVisible();
  await waitForPathname(
    page,
    `/dashboard/people-directory/${walkInId}/adoption-applications`,
  );

  
  
  await openRowMenu(page);
  await expect(page.getByRole("menuitem", { name: "Edit" })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Review" }).click();
  await waitForPathname(page, REVIEW_PATH);
  await expect(
    page.getByText("Applicant Information (Read-Only)"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit Application Fields" }),
  ).toHaveCount(0);

  
  
  await page.goto(`/dashboard/adoption-applications/${appId}/edit`);
  await expect(
    page.getByRole("heading", { name: /not found/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save Changes" }),
  ).toHaveCount(0);
});






test("a registered user's application is staff-editable from the row menu and the review screen", async ({
  page,
}) => {
  const janeId = await personIdByName(page, "Jane Doe");
  await page.goto(
    `/dashboard/people-directory/${janeId}/adoption-applications`,
  );

  
  
  
  const pendingRow = page
    .locator("tbody tr")
    .filter({ hasText: "Pending" })
    .first();
  await expect(pendingRow).toBeVisible();

  
  
  
  const trigger = pendingRow.getByRole("button", { name: "Open menu" });
  const reviewItem = page.getByRole("menuitem", { name: "Review" });
  await expect(async () => {
    if (!(await reviewItem.isVisible())) {
      await trigger.click();
    }
    await expect(reviewItem).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();

  await reviewItem.click();
  await waitForPathname(page, REVIEW_PATH);
  const appId = new URL(page.url()).pathname.split("/")[3];

  await page.getByRole("link", { name: "Edit Application Fields" }).click();
  await waitForPathname(
    page,
    `/dashboard/adoption-applications/${appId}/edit`,
  );
  await expect(
    page.getByRole("button", { name: "Save Changes" }),
  ).toBeVisible();
});








test("staff can file over a closed application, and not over a live one", async ({
  page,
}) => {
  const caseyId = await personIdByName(page, "Casey Reapply");
  const tab = `/dashboard/people-directory/${caseyId}/adoption-applications`;
  const newApplication = `/dashboard/adoption-applications/new?personId=${caseyId}&returnTo=${tab}`;

  await page.goto(tab);
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Peppercorn");
  await expect(rows.first().getByText("Closed", { exact: true })).toBeVisible();

  
  
  await page.goto(newApplication);
  await pickAnimal(page, "Peppercorn");

  
  
  await fillStable(
    page.getByLabel("Reason for Adoption *", { exact: true }),
    `Back again now that he is listed — E2E ${Date.now()}`,
  );
  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(
    page.getByText("Application submitted successfully."),
  ).toBeVisible();
  await waitForPathname(page, tab);
  await expect(rows).toHaveCount(2);
  await expect(
    rows.filter({ hasText: "Peppercorn" }).getByText("Pending", { exact: true }),
  ).toBeVisible();
  await expect(
    rows.filter({ hasText: "Peppercorn" }).getByText("Closed", { exact: true }),
  ).toBeVisible();

  
  await page.goto(newApplication);
  await page
    .getByRole("combobox")
    .filter({ hasText: "Search for an animal" })
    .click();
  await page.getByPlaceholder("Type an animal name...").fill("Peppercorn");
  
  
  
  
  
  
  await page.waitForURL(
    (url) => url.searchParams.get("animalSearch") === "Peppercorn",
    { timeout: 15_000 },
  );
  await expect(page.getByRole("option", { name: "Peppercorn" })).toHaveCount(0);
  await expect(page.getByText("No published animals found.")).toBeVisible();
});
