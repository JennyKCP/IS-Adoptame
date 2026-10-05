import { expect, test, type Page } from "@playwright/test";
import {
  APPLICANT_EMAIL,
  MY_APPLICATIONS_PATH,
  OTHER_PERSON_EMAIL,
  SEEDED_USER_PASSWORD,
  bootstrapStorageState,
  fillStable,
  rowMenuItemHref,
  storageStatePathFor,
  waitForPathname,
} from "../support/applications";




test.describe.configure({ mode: "serial" });

const storageStatePath = storageStatePathFor(
  "applicant-adoption-applications.state.json",
);

test.beforeAll(async ({ browser }) => {
  await bootstrapStorageState(browser, {
    email: APPLICANT_EMAIL,
    password: SEEDED_USER_PASSWORD,
    storageStatePath,
  });
});

test.use({ storageState: storageStatePath });

const VIEW_PATH = /^\/dashboard\/my-adoption-applications\/[^/]+$/;






const FIXTURE_COUNT_BY_STATUS = {
  PENDING: 2,
  REVIEWING: 1,
  WAITLISTED: 1,
  APPROVED: 1,
  REJECTED: 1,
  WITHDRAWN: 3,
  ADOPTED: 1,
  CLOSED: 2,
} as const;





const MESSAGE_TITLE_BY_STATUS = {
  PENDING: "Waiting for review",
  REVIEWING: "Under review",
  WITHDRAWN: "Withdrawn by you",
  CLOSED: "No longer available",
} as const;

type FixtureStatus = keyof typeof FIXTURE_COUNT_BY_STATUS;



const STATUS_LABEL: Record<FixtureStatus, string> = {
  PENDING: "Pending",
  REVIEWING: "Reviewing",
  WAITLISTED: "Waitlisted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  ADOPTED: "Adopted",
  CLOSED: "Closed",
};

const EXPECTED_TALLY = Object.fromEntries(
  Object.entries(FIXTURE_COUNT_BY_STATUS).map(([status, count]) => [
    STATUS_LABEL[status as FixtureStatus],
    count,
  ]),
);

const listByStatus = async (page: Page, status: FixtureStatus) => {
  await page.goto(`${MY_APPLICATIONS_PATH}?status=${status}&pageSize=20`);
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toBeVisible();
  return rows;
};



const applicationHref = (page: Page, rowIndex = 0) =>
  rowMenuItemHref(page, rowIndex, "View application");

const animalLink = (page: Page, rowIndex = 0) =>
  page.locator("tbody tr").nth(rowIndex).getByRole("link").first();

const openApplication = async (page: Page, href: string) => {
  await page.goto(href);
  await waitForPathname(page, VIEW_PATH);
};



const statusMessage = (page: Page) => page.locator('[data-slot="alert"]');






const findReturnedClosedFixture = async (page: Page) => {
  const rows = await listByStatus(page, "CLOSED");
  await expect(rows).toHaveCount(FIXTURE_COUNT_BY_STATUS.CLOSED);

  const candidates: { application: string; animal: string; animalName: string }[] =
    [];
  for (let i = 0; i < FIXTURE_COUNT_BY_STATUS.CLOSED; i++) {
    const link = animalLink(page, i);
    const animal = await link.getAttribute("href");
    const animalName = (await link.innerText()).trim();
    const application = await applicationHref(page, i);
    if (!animal) {
      throw new Error(`CLOSED row ${i} has no animal link.`);
    }
    candidates.push({ application, animal, animalName });
  }

  for (const candidate of candidates) {
    await page.goto(candidate.animal);

    
    
    
    const adoptCta = page.getByRole("link", { name: /^Adopt / });
    const notFoundHeading = page.getByRole("heading", {
      name: "Pet Not Found",
      exact: true,
    });

    
    
    
    
    await expect(adoptCta.or(notFoundHeading)).toBeVisible();

    if (await adoptCta.isVisible()) {
      return candidate;
    }
  }

  throw new Error("Expected one CLOSED fixture on a republished animal.");
};



let submittedApplicationHref: string;

test("every status is listed, and every row offers View application", async ({
  page,
}) => {
  await page.goto(`${MY_APPLICATIONS_PATH}?pageSize=20`);
  await expect(page.locator("tbody tr")).toHaveCount(
    Object.values(FIXTURE_COUNT_BY_STATUS).reduce((a, b) => a + b, 0),
  );

  
  
  
  const statusCells = await page
    .locator("tbody tr td:nth-child(4)")
    .allInnerTexts();
  const tally: Record<string, number> = {};
  for (const cell of statusCells) {
    const label = cell.trim();
    tally[label] = (tally[label] ?? 0) + 1;
  }
  expect(tally).toEqual(EXPECTED_TALLY);

  
  
  
  await page.goto(`${MY_APPLICATIONS_PATH}?pageSize=20`);
  const viewItem = page.getByRole("menuitem", { name: "View application" });
  await expect(async () => {
    if (!(await viewItem.isVisible())) {
      await page
        .locator("tbody tr")
        .first()
        .getByRole("button", { name: "Open menu" })
        .click();
    }
    await expect(viewItem).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByRole("menuitem", { name: "Edit" })).toHaveCount(0);

  await viewItem.click();
  await waitForPathname(page, VIEW_PATH);
  await expect(statusMessage(page)).toBeVisible();
});

test("a reviewed application is read-only, and shows why", async ({ page }) => {
  await listByStatus(page, "REVIEWING");
  const href = await applicationHref(page);
  await openApplication(page, href);

  await expect(
    page.getByRole("link", { name: "Edit application" }),
  ).toHaveCount(0);

  
  
  await expect(
    page.getByText("References received. Scheduling a home visit next week."),
  ).toBeVisible();
  await expect(page.getByText("by Olivia Chen").first()).toBeVisible();
  await expect(
    page.getByText("Application submitted by applicant."),
  ).toBeVisible();

  
  
  await page.goto(`${href}/edit`);
  await waitForPathname(page, href);
  await expect(statusMessage(page)).toContainText(
    MESSAGE_TITLE_BY_STATUS.REVIEWING,
  );
});

test("a closed applicant can apply again once the animal is back", async ({
  page,
}) => {
  const returned = await findReturnedClosedFixture(page);

  
  
  
  await openApplication(page, returned.application);
  await expect(statusMessage(page)).toContainText(
    MESSAGE_TITLE_BY_STATUS.CLOSED,
  );
  await expect(
    page.getByText("This animal was adopted by another applicant."),
  ).toBeVisible();

  await page.goto(returned.animal);
  await page.getByRole("link", { name: /^Adopt / }).click();
  await waitForPathname(page, `${returned.animal}/adopt`);

  
  
  const staleTab = await page.context().newPage();
  await staleTab.goto(`${returned.animal}/adopt`);
  await fillStable(
    staleTab.getByLabel("Reason for Adoption *", { exact: true }),
    `Submitted from a stale tab — E2E ${Date.now()}`,
  );

  
  
  const reason = `Ready to try again now that he is back — E2E ${Date.now()}`;
  await fillStable(
    page.getByLabel("Reason for Adoption *", { exact: true }),
    reason,
  );

  
  
  
  
  
  
  await fillStable(
    page.getByLabel("Email *", { exact: true }),
    OTHER_PERSON_EMAIL,
  );

  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(
    page.getByText("Application submitted successfully."),
  ).toBeVisible();
  await waitForPathname(page, MY_APPLICATIONS_PATH);

  
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toContainText(returned.animalName);
  submittedApplicationHref = await applicationHref(page, 0);

  await openApplication(page, submittedApplicationHref);
  await expect(statusMessage(page)).toContainText(
    MESSAGE_TITLE_BY_STATUS.PENDING,
  );
  await expect(page.getByText(reason)).toBeVisible();

  
  
  
  await expect(page.getByText(OTHER_PERSON_EMAIL)).toBeVisible();

  
  
  
  await staleTab.getByRole("button", { name: "Submit Application" }).click();
  await expect(
    staleTab.getByText("You already have an application for this animal."),
  ).toBeVisible();
  await staleTab.close();

  
  
  await page.goto(returned.animal);
  await expect(
    page.getByRole("link", { name: "View Your Application" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^Adopt / })).toHaveCount(0);

  await page.goto(`${MY_APPLICATIONS_PATH}?pageSize=20`);
  await expect(page.locator("tbody tr")).toHaveCount(
    Object.values(FIXTURE_COUNT_BY_STATUS).reduce((a, b) => a + b, 0) + 1,
  );

  
  
  await page.goto("/dashboard/account");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    APPLICANT_EMAIL,
  );
});

test("a pending application can still be edited", async ({ page }) => {
  await openApplication(page, submittedApplicationHref);
  await page.getByRole("link", { name: "Edit application" }).click();
  await waitForPathname(page, `${submittedApplicationHref}/edit`);

  const revised = `Revised reason — E2E ${Date.now()}`;
  await fillStable(
    page.getByLabel("Reason for Adoption *", { exact: true }),
    revised,
  );
  await page.getByRole("button", { name: "Update Application" }).click();

  await expect(
    page.getByText("Application updated successfully."),
  ).toBeVisible();
  await waitForPathname(page, MY_APPLICATIONS_PATH);

  await openApplication(page, submittedApplicationHref);
  await expect(page.getByText(revised)).toBeVisible();
});

test("withdrawing asks first, and closes the edit route", async ({ page }) => {
  await openApplication(page, submittedApplicationHref);

  await page.getByRole("button", { name: "Withdraw application" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Withdraw your application?");
  
  await expect(dialog).not.toContainText("back to the adoptable listings");

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(statusMessage(page)).toContainText(
    MESSAGE_TITLE_BY_STATUS.PENDING,
  );
  await expect(
    page.getByRole("link", { name: "Edit application" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Withdraw application" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Withdraw", exact: true })
    .click();

  await expect(
    page.getByText("Application withdrawn successfully."),
  ).toBeVisible();
  await expect(statusMessage(page)).toContainText(
    MESSAGE_TITLE_BY_STATUS.WITHDRAWN,
  );
  await expect(
    page.getByText("Application withdrawn by user."),
  ).toBeVisible();

  
  await page.goto(`${submittedApplicationHref}/edit`);
  await waitForPathname(page, submittedApplicationHref);
  await expect(
    page.getByRole("link", { name: "Edit application" }),
  ).toHaveCount(0);
});

test("reactivating puts a withdrawn application back to pending", async ({
  page,
}) => {
  await openApplication(page, submittedApplicationHref);
  await page.getByRole("button", { name: "Reactivate" }).click();

  await expect(
    page.getByText("Application reactivated successfully."),
  ).toBeVisible();
  await expect(statusMessage(page)).toContainText(
    MESSAGE_TITLE_BY_STATUS.PENDING,
  );
  await expect(
    page.getByText("Application reactivated by user."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit application" }),
  ).toBeVisible();
});


test("reactivate is disabled, with the reason, once the animal has left", async ({
  page,
}) => {
  const rows = await listByStatus(page, "WITHDRAWN");
  await expect(rows).toHaveCount(FIXTURE_COUNT_BY_STATUS.WITHDRAWN);

  const hrefs: string[] = [];
  for (let i = 0; i < FIXTURE_COUNT_BY_STATUS.WITHDRAWN; i++) {
    hrefs.push(await applicationHref(page, i));
  }

  
  
  let disabled = false;
  for (const href of hrefs) {
    await openApplication(page, href);
    const reactivate = page.getByRole("button", { name: "Reactivate" });
    await expect(reactivate).toBeVisible();
    if (await reactivate.isDisabled()) {
      disabled = true;
      break;
    }
  }
  expect(disabled, "a WITHDRAWN fixture on an archived animal").toBe(true);

  
  
  await expect(
    page.getByText(
      /has left the shelter, so this application can no longer be reactivated/,
    ),
  ).toBeVisible();
});





test("a withdrawn application cannot be reactivated beside a live replacement", async ({
  page,
}) => {
  const pendingRows = await listByStatus(page, "PENDING");
  const pendingAnimals = new Set<string | null>();
  for (let i = 0; i < (await pendingRows.count()); i++) {
    pendingAnimals.add(await animalLink(page, i).getAttribute("href"));
  }

  const withdrawnRows = await listByStatus(page, "WITHDRAWN");
  const blocked: number[] = [];
  for (let i = 0; i < (await withdrawnRows.count()); i++) {
    if (pendingAnimals.has(await animalLink(page, i).getAttribute("href"))) {
      blocked.push(i);
    }
  }
  
  
  expect(blocked).toHaveLength(1);
  const href = await applicationHref(page, blocked[0]);

  await openApplication(page, href);
  await page.getByRole("button", { name: "Reactivate" }).click();

  await expect(
    page.getByText(
      "Cannot reactivate application. You already have an active application for this animal.",
    ),
  ).toBeVisible();
  await expect(statusMessage(page)).toContainText(
    MESSAGE_TITLE_BY_STATUS.WITHDRAWN,
  );
});


test("withdrawing an approved application says the animal goes back on the listings", async ({
  page,
}) => {
  await listByStatus(page, "APPROVED");
  const animal = await animalLink(page).getAttribute("href");
  const href = await applicationHref(page);
  if (!animal) {
    throw new Error("APPROVED row has no animal link.");
  }

  
  
  await page.goto(animal);
  await expect(
    page.getByText("Pending Adoption", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^Adopt / })).toHaveCount(0);

  await openApplication(page, href);
  await page.getByRole("button", { name: "Withdraw application" }).click();
  const dialog = page.getByRole("alertdialog");
  
  await expect(dialog).toContainText("back to the adoptable listings");
  await dialog.getByRole("button", { name: "Withdraw", exact: true }).click();

  await expect(
    page.getByText("Application withdrawn successfully."),
  ).toBeVisible();
  await expect(statusMessage(page)).toContainText(
    MESSAGE_TITLE_BY_STATUS.WITHDRAWN,
  );
});
