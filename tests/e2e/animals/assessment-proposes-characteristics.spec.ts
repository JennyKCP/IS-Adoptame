import { test, expect, type Page } from "@playwright/test";
import {
  adminStatePath,
  bootstrapAdminAuth,
  fillStable,
  firstRowIdByQuery,
} from "../support/note-audit";
import {
  SEEDED_USER_PASSWORD,
  bootstrapStorageState,
  storageStatePathFor,
} from "../support/applications";






















const storageState = adminStatePath("assessment-proposals");
const volunteerState = storageStatePathFor(
  "assessment-proposals-volunteer.state.json",
);

test.describe.configure({ mode: "serial" });



test.beforeAll(async ({ browser }) => {
  await bootstrapAdminAuth(browser, storageState);
  await bootstrapStorageState(browser, {
    email: "volunteer1@example.com",
    password: SEEDED_USER_PASSWORD,
    storageStatePath: volunteerState,
  });
});

test.use({ storageState });

const animalId = (page: Page, name: string) =>
  firstRowIdByQuery(page, "/dashboard/animals", name);

const rowFor = (page: Page, templateName: string) =>
  page
    .getByRole("list", { name: "Assessments" })
    .getByRole("listitem")
    .filter({ hasText: templateName });

const isDetailPath = (url: URL) =>
  /\/assessments\/[^/]+$/.test(url.pathname) &&
  !url.pathname.endsWith("/create");

const openRow = async (page: Page, templateName: string) => {
  await rowFor(page, templateName).getByRole("link").click();
  await page.waitForURL(isDetailPath);
};

const sourceLink = (page: Page, templateName: string) =>
  page.getByRole("link", {
    name: new RegExp(`${templateName} assessment of`, "i"),
  });

const suggestionsHeading = "Characteristics these findings suggest";


const expectActivityEntry = async (page: Page, summary: RegExp) => {
  await expect(async () => {
    const detailButtons = page.getByRole("button", { name: "Show details" });
    const toExpand = await detailButtons.count();
    for (let i = 0; i < toExpand; i++) {
      await detailButtons.first().click();
    }
    await expect(page.getByText(summary)).toBeVisible({ timeout: 1_000 });
  }).toPass();
};



test("without permission to manage characteristics, suggestions show with no buttons", async ({
  page,
  browser,
}) => {
  
  const frisco = await animalId(page, "Frisco");

  const context = await browser.newContext({ storageState: volunteerState });
  const viewer = await context.newPage();
  try {
    await viewer.goto(`/dashboard/animals/${frisco}/assessments`);
    await openRow(viewer, "Dog-to-Dog Introduction");
    await expect(viewer.getByText(suggestionsHeading)).toBeVisible();
    await expect(viewer.getByText("Good with other dogs")).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Add to animal" })).toHaveCount(0);
    await expect(
      viewer.getByRole("button", { name: "Cite this assessment" }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});



test("an unassigned trait offers 'Add to animal'; acting on it cites the assessment and logs it", async ({
  page,
}) => {
  const id = await animalId(page, "Frisco");
  await page.goto(`/dashboard/animals/${id}/assessments`);
  await openRow(page, "Dog-to-Dog Introduction");

  await expect(page.getByText(suggestionsHeading)).toBeVisible();
  
  
  const row = page.locator("li").filter({ hasText: "Good with other dogs" });
  await expect(row.getByText('From “Recommendation”: Dog-social')).toBeVisible();
  await row.getByRole("button", { name: "Add to animal" }).click();
  await expect(page.getByText("Good with other dogs added to the animal.")).toBeVisible();

  await page.goto(`/dashboard/animals/${id}/characteristics`);
  await expect(page.getByText("Good with other dogs", { exact: true })).toBeVisible();
  await expect(sourceLink(page, "Dog-to-Dog Introduction")).toBeVisible();

  await page.goto(`/dashboard/animals/${id}`);
  await expectActivityEntry(
    page,
    /Good with other dogs added, citing the Dog-to-Dog Introduction of/,
  );
});



test("a hand-assigned trait a live finding contradicts warns on the tab, with no acknowledgement anywhere", async ({
  page,
}) => {
  const id = await animalId(page, "Frisco");
  await page.goto(`/dashboard/animals/${id}/characteristics`);
  await expect(page.getByText("Good with cats", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/^Contradicted by “Recommendation”: Not cat-safe on the Cat Test of/),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByText(/acknowledged/i)).toHaveCount(0);

  
  
  
  await page.goto(`/dashboard/animals/${id}/assessments`);
  await openRow(page, "Cat Test");
  await expect(page.getByText(suggestionsHeading)).toHaveCount(0);
});

test("adding or removing a contradicted trait on the tab needs no dialog, checkbox, or reason", async ({
  page,
}) => {
  const id = await animalId(page, "Rocket");
  await page.goto(`/dashboard/animals/${id}/characteristics`);
  await expect(
    page.getByText(/^Contradicted by “Recommendation”: Solo-dog home on the/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Remove Good with other dogs" }).click();
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Characteristics updated successfully.")).toBeVisible();
  await expect(page.getByText("Good with other dogs", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByText("Add a characteristic...").click();
  await page.getByRole("option", { name: /^Good with other dogs/ }).click();
  
  
  await expect(dialog.getByText("Conflicting findings")).toHaveCount(0);
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  const save = dialog.getByRole("button", { name: "Save Changes" });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText("Characteristics updated successfully.")).toBeVisible();

  
  await expect(page.getByText("Good with other dogs", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/^Contradicted by “Recommendation”: Solo-dog home on the/),
  ).toBeVisible();
});



test("restoring a deleted assessment removes the tab's '(deleted)' warning", async ({
  page,
}) => {
  const id = await animalId(page, "Daisy");
  await page.goto(`/dashboard/animals/${id}/characteristics`);
  await expect(page.getByText("(deleted)")).toBeVisible();

  await page.goto(`/dashboard/animals/${id}/assessments?status=deleted`);
  await openRow(page, "polite play with plenty of breaks");
  const url = page.url();

  try {
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("Assessment restored.")).toBeVisible();
    await expect(page.getByText(/^Deleted on /)).toHaveCount(0);
    
    await expect(page.getByText(suggestionsHeading)).toHaveCount(0);

    await page.goto(`/dashboard/animals/${id}/characteristics`);
    await expect(page.getByText("(deleted)")).toHaveCount(0);
    await expect(sourceLink(page, "Dog-to-Dog Introduction")).toBeVisible();
  } finally {
    await page.goto(url);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText(/^Deleted on /)).toBeVisible();
  }
});



test("renaming a trait in Settings keeps its citation and supersession linked", async ({
  page,
}) => {
  const id = await animalId(page, "Daisy");

  const openCatalogMenu = async (name: string) => {
    await page.goto("/dashboard/settings/characteristics");
    await expect(async () => {
      await page.getByRole("button", { name: `Actions for ${name}` }).click();
      await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 15_000 });
  };
  const rename = async (from: string, to: string) => {
    await openCatalogMenu(from);
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog");
    await fillStable(dialog.getByLabel("Name *", { exact: true }), to);
    await dialog.getByRole("button", { name: "Update Characteristic" }).click();
    await expect(page.getByText("Characteristic updated successfully.")).toBeVisible();
  };

  await rename("Good with cats", "Cat-friendly");
  try {
    await page.goto(`/dashboard/animals/${id}/characteristics`);
    await expect(page.getByText("Cat-friendly", { exact: true })).toBeVisible();
    await expect(sourceLink(page, "Cat Test")).toBeVisible();
    await expect(page.getByText("(no longer supports it)")).toHaveCount(0);

    await page.goto(`/dashboard/animals/${id}/assessments`);
    await openRow(page, "Fixated at the barrier");
    await expect(
      page.getByText(/superseded for Cat-friendly by the Cat Test of/),
    ).toBeVisible();

    await openCatalogMenu("Cat-friendly");
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(
      page.getByText(
        "Cat-friendly is proposed by the Cat Test assessment template, so it can't be deleted.",
      ),
    ).toBeVisible();
  } finally {
    await rename("Cat-friendly", "Good with cats");
  }
});



test("the default Status filter hides a deleted row exactly like every other soft-deleted list, even one a trait still cites", async ({
  page,
}) => {
  const id = await animalId(page, "Daisy");
  const list = `/dashboard/animals/${id}/assessments`;
  const citedIntro = "polite play with plenty of breaks";

  await page.goto(list);
  await expect(rowFor(page, citedIntro)).toHaveCount(0);

  await page.goto(`${list}?status=deleted`);
  await expect(rowFor(page, citedIntro)).toHaveCount(1);
  await expect(rowFor(page, citedIntro).getByText("Deleted", { exact: true })).toBeVisible();
});
