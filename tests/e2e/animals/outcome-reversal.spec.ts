import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  bootstrapStorageState,
  fillStable,
  rowMenuItemHref,
  SEEDED_USER_PASSWORD,
  storageStatePathFor,
  waitForPathname,
} from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;

test.describe.configure({ mode: "serial" });

const storageStatePath = storageStatePathFor("outcome-reversal.state.json");
const volunteerStatePath = storageStatePathFor(
  "outcome-reversal-volunteer.state.json",
);

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the outcome reversal E2E spec.",
    );
  }
  
  await bootstrapStorageState(browser, {
    email: "admin@example.com",
    password: adminPassword,
    storageStatePath,
  });
  await bootstrapStorageState(browser, {
    email: "volunteer1@example.com",
    password: SEEDED_USER_PASSWORD,
    storageStatePath: volunteerStatePath,
  });
});

test.use({ storageState: storageStatePath });

const OPEN_STATUSES = ["Pending", "Reviewing", "Waitlisted", "Approved"];




const FIXTURE_APPLICANTS = [
  "Jane Doe",
  "John Smith",
  "Pat Mislinked",
  "Casey Deactivated",
  "Casey Reapply",
];






const E2E_DIR = path.resolve(__dirname, "..");
const OTHER_SOURCES = (fs.readdirSync(E2E_DIR, { recursive: true }) as string[])
  .filter(
    (file) =>
      file.endsWith(".ts") && path.basename(file) !== path.basename(__filename),
  )
  .map((file) => fs.readFileSync(path.join(E2E_DIR, file), "utf8"))
  .join("\n");






const isNamedElsewhere = (name: string) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}_])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_])`,
    "u",
  ).test(OTHER_SOURCES);

const OUTCOMES_PATH = "/dashboard/outcomes";



const gotoTable = async (page: Page, url: string) => {
  await page.goto(url);
  await expect(page.getByText(/of \d+ row\(s\) selected/)).toBeVisible();
};

interface Candidate {
  animalId: string;
  winnerReviewHref: string;
  
  
  others: { reviewHref: string; status: string }[];
}



const readAllPages = async (
  page: Page,
  url: string,
  readRows: (rows: Element[]) => string[],
) => {
  const values: string[] = [];
  for (let pageNumber = 1; ; pageNumber++) {
    await gotoTable(page, `${url}&pageSize=50&page=${pageNumber}`);
    const rows = await page.locator("tbody tr").evaluateAll(readRows);
    values.push(...rows);
    if (rows.length < 50) return values;
  }
};



const chooseFromSelect = async (page: Page, label: string, option: string) => {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option }).first().click();
};



const radioByGroupLabel = (page: Page, label: string, option: "Yes" | "No") =>
  page
    .locator("div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .filter({ has: page.getByRole("radio") })
    .last()
    .getByRole("radio", { name: option });


const prepareCandidate = async (page: Page): Promise<Candidate> => {
  
  const publishedNames = new Map(
    (
      await readAllPages(
        page,
        "/dashboard/animals?listingStatus=PUBLISHED",
        (rows) =>
          rows.map((row) => {
            const link = row.querySelector("a");
            return `${link?.getAttribute("href") ?? ""}\t${link?.textContent?.trim() ?? ""}`;
          }),
      )
    ).map((entry) => entry.split("\t") as [string, string]),
  );

  
  const openApplications = (
    await readAllPages(
      page,
      "/dashboard/adoption-applications?status=PENDING,REVIEWING,WAITLISTED,APPROVED",
      (rows) =>
        rows.map((row) => {
          const links = row.querySelectorAll("a");
          return [
            links[links.length - 1]?.getAttribute("href") ?? "",
            links[0]?.textContent?.trim() ?? "",
            links[0]?.getAttribute("href") ?? "",
          ].join("\t");
        }),
    )
  ).map((entry) => {
    const [animalHref, applicant, personHref] = entry.split("\t");
    return { animalHref, applicant, personHref };
  });

  const passedOver = new Set(
    openApplications
      .filter(
        ({ applicant }) =>
          FIXTURE_APPLICANTS.includes(applicant) || isNamedElsewhere(applicant),
      )
      .map(({ animalHref }) => animalHref),
  );
  const animalHref = [
    ...new Set(openApplications.map(({ animalHref }) => animalHref)),
  ].find(
    (href) =>
      publishedNames.has(href) &&
      !passedOver.has(href) &&
      !isNamedElsewhere(publishedNames.get(href)!),
  );
  if (!animalHref) {
    throw new Error(
      "No published animal has open applications only from random-pool applicants no other spec names, and is not named by another spec itself.",
    );
  }
  const animalId = animalHref.split("/").pop() as string;
  const animalName = publishedNames.get(animalHref)!;

  
  
  const onThisAnimal = new Set(
    openApplications
      .filter((entry) => entry.animalHref === animalHref)
      .map(({ personHref }) => personHref),
  );
  const applicant = openApplications.find(
    ({ applicant, personHref }) =>
      !FIXTURE_APPLICANTS.includes(applicant) &&
      !isNamedElsewhere(applicant) &&
      !onThisAnimal.has(personHref),
  );
  if (!applicant) throw new Error("No applicant is free to apply.");
  const personId = applicant.personHref.split("/").pop() as string;

  const applicationsPath = `${animalHref}/adoption-applications`;
  await page.goto(
    `/dashboard/adoption-applications/new?personId=${personId}&returnTo=${encodeURIComponent(applicationsPath)}`,
  );
  
  
  await page
    .getByRole("combobox")
    .filter({ hasText: "Search for an animal" })
    .click();
  await page.getByPlaceholder("Type an animal name...").fill(animalName);
  const option = page.locator(`[cmdk-item][data-value="${animalId}"]`);
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();

  
  
  const email = `outcome-reversal-e2e-${Date.now()}@example.com`;
  await fillStable(page.getByLabel("Email *", { exact: true }), email);
  await fillStable(page.getByLabel("Phone *", { exact: true }), "212-555-0142");
  await fillStable(
    page.getByLabel("Address Line 1 *", { exact: true }),
    "8 Test Lane",
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
    "Has had dogs and cats.",
  );
  await fillStable(
    page.getByLabel("Reason for Adoption *", { exact: true }),
    "Outcome reversal coverage.",
  );
  await page.getByRole("button", { name: "Submit Application" }).click();
  await expect(
    page.getByText("Application submitted successfully."),
  ).toBeVisible();
  await waitForPathname(page, applicationsPath);

  
  await gotoTable(page, `${applicationsPath}?pageSize=50`);
  const rows = await page
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) => [
        row.querySelector("td:nth-child(5)")?.textContent?.trim() ?? "",
        row.textContent ?? "",
      ]),
    );
  const open = [];
  for (const [index, [status, text]] of rows.entries()) {
    if (!OPEN_STATUSES.includes(status)) continue;
    open.push({
      reviewHref: await rowMenuItemHref(page, index, "Review"),
      status,
      isWinner: text.includes(email),
    });
  }
  const winner = open.find(({ isWinner }) => isWinner);
  if (!winner) throw new Error("The new application is not on the list.");

  await page.goto(winner.reviewHref);
  await chooseFromSelect(page, "Application Status", "Approved");
  await fillStable(
    page.getByLabel("Reason for Status Change *", { exact: true }),
    "Approved ahead of recording the adoption.",
  );
  await page.getByRole("button", { name: "Update Application" }).click();
  await expect(
    page.getByText("Application updated successfully."),
  ).toBeVisible();

  return {
    animalId,
    winnerReviewHref: winner.reviewHref,
    others: open
      .filter(({ isWinner }) => !isWinner)
      .map(({ reviewHref, status }) => ({ reviewHref, status })),
  };
};


const expectReviewStatus = async (
  page: Page,
  reviewHref: string,
  status: string,
) => {
  await page.goto(reviewHref);
  await expect(page.getByRole("combobox").first()).toHaveText(status);
};

const expectStatuses = async (
  page: Page,
  candidate: Candidate,
  winner: string,
  others: "Closed" | "as before",
) => {
  await expectReviewStatus(page, candidate.winnerReviewHref, winner);
  for (const other of candidate.others) {
    await expectReviewStatus(
      page,
      other.reviewHref,
      others === "Closed" ? "Closed" : other.status,
    );
  }
};



const reportedAdoptions = async (page: Page) => {
  await page.goto("/dashboard/reports/outcomes");
  await expect(
    page.getByRole("heading", { name: "Outcome statistics" }),
  ).toBeVisible();
  const row = page
    .locator("tbody tr")
    .filter({ has: page.getByRole("cell", { name: "Adoption", exact: true }) });
  if ((await row.count()) === 0) return 0;
  return Number((await row.locator("td").nth(1).innerText()).trim());
};


const recordAdoption = async (page: Page, candidate: Candidate) => {
  await page.goto(candidate.winnerReviewHref);
  await page.getByRole("link", { name: "Create Outcome" }).click();
  await page.getByRole("button", { name: "Process Outcome" }).click();
  await expect(page.getByText("Outcome processed successfully.")).toBeVisible();
  await waitForPathname(page, OUTCOMES_PATH);
};



const outcomeRows = (page: Page, animalId: string) =>
  page
    .locator("tbody tr")
    .filter({ has: page.locator(`a[href="/dashboard/animals/${animalId}"]`) });

const gotoOutcomeRows = async (page: Page, animalId: string) => {
  await gotoTable(page, `${OUTCOMES_PATH}?pageSize=50`);
  return outcomeRows(page, animalId);
};




const openRowMenu = async (row: Locator, itemName: string | RegExp) => {
  const trigger = row.getByRole("button", { name: "Open menu" });
  const item = row.page().getByRole("menuitem", { name: itemName });
  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await item.isVisible())) {
      await trigger.click();
    }
    await expect(item).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return item;
};

const openReverseDialog = async (row: Locator) => {
  await (await openRowMenu(row, /^Reverse/)).click();
  const dialog = row.page().getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  return dialog;
};

test("a reversed adoption un-adopts, reopens, drops out of the report, and can be recorded again", async ({
  page,
}) => {
  test.setTimeout(240_000);

  const candidate = await prepareCandidate(page);
  const baseline = await reportedAdoptions(page);

  
  await recordAdoption(page, candidate);
  await expectStatuses(page, candidate, "Adopted", "Closed");
  expect(await reportedAdoptions(page)).toBe(baseline + 1);

  const firstRow = (await gotoOutcomeRows(page, candidate.animalId)).first();
  await expect(firstRow).toBeVisible();
  const editItem = await openRowMenu(firstRow, "Edit");
  const editHref = await page
    .locator("a", { has: editItem })
    .first()
    .getAttribute("href");
  expect(editHref).toMatch(/^\/dashboard\/outcomes\/[^/]+\/edit$/);
  await page.keyboard.press("Escape");

  
  
  const context = page.context();
  const secondReverser = await context.newPage();
  const staleRow = (
    await gotoOutcomeRows(secondReverser, candidate.animalId)
  ).first();
  const staleDialog = await openReverseDialog(staleRow);
  await staleDialog
    .getByLabel("Reason for reversal")
    .fill("Also spotted the mistake.");

  const corrector = await context.newPage();
  await corrector.goto(editHref!);
  const notes = corrector.getByLabel("Notes", { exact: true });
  await expect(notes).toBeVisible();

  
  const dialog = await openReverseDialog(firstRow);
  const confirm = dialog.getByRole("button", { name: "Reverse Outcome" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Reason for reversal").fill("   ");
  await expect(confirm).toBeDisabled();
  
  
  
  const tooLong = dialog.getByText("The reason cannot exceed 1000 characters.");
  await dialog.getByLabel("Reason for reversal").fill("x".repeat(1001));
  await expect(tooLong).toBeVisible();
  await expect(confirm).toBeDisabled();
  await dialog
    .getByLabel("Reason for reversal")
    .fill(`   ${"x".repeat(1000)}   `);
  await expect(tooLong).toBeHidden();
  await expect(confirm).toBeEnabled();
  const reason = `Recorded against the wrong application ${Date.now()}`;
  await dialog.getByLabel("Reason for reversal").fill(reason);
  await confirm.click();
  await expect(page.getByText(/^Outcome reversed\./)).toBeVisible();
  await expect(dialog).toBeHidden();

  
  await expect(firstRow.getByText("Reversed", { exact: true })).toBeVisible();
  const viewReversal = await openRowMenu(firstRow, "View reversal");
  await expect(page.getByRole("menuitem", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: /^Reverse/ })).toHaveCount(0);
  await viewReversal.click();
  await expect(page).toHaveURL(editHref!);
  await expect(
    page.getByRole("heading", { name: "Outcome Reversed" }),
  ).toBeVisible();
  await expect(page.getByText(`Reason: ${reason}`)).toBeVisible();
  await expect(page.locator("main form")).toHaveCount(0);

  await page.goto(candidate.winnerReviewHref);
  await expect(
    page.getByText(`Adoption outcome reversed: ${reason}`),
  ).toBeVisible();
  await expect(page.getByText("Reversed", { exact: true })).toBeVisible();

  
  const volunteerContext = await page.context().browser()!.newContext({
    storageState: volunteerStatePath,
  });
  const volunteer = await volunteerContext.newPage();
  try {
    const volunteerRow = (
      await gotoOutcomeRows(volunteer, candidate.animalId)
    ).first();
    await expect(volunteerRow.getByText("Reversed", { exact: true })).toBeVisible();
    const volunteerView = await openRowMenu(volunteerRow, "View reversal");
    await expect(volunteer.getByRole("menuitem", { name: "Edit" })).toHaveCount(0);
    await expect(volunteer.getByRole("menuitem", { name: /^Reverse/ })).toHaveCount(0);
    await volunteerView.click();
    await expect(volunteer).toHaveURL(editHref!);
    await expect(
      volunteer.getByRole("heading", { name: "Outcome Reversed" }),
    ).toBeVisible();
    await expect(volunteer.getByText(`Reason: ${reason}`)).toBeVisible();
    await expect(volunteer.locator("main form")).toHaveCount(0);
  } finally {
    await volunteerContext.close();
  }

  
  await staleDialog.getByRole("button", { name: "Reverse Outcome" }).click();
  await expect(
    secondReverser.getByText("This outcome has already been reversed."),
  ).toBeVisible();
  
  
  await expect(staleDialog).toBeHidden();
  await expect(staleRow.getByText("Reversed", { exact: true })).toBeVisible();
  await expect(staleRow.getByRole("button", { name: "Open menu" })).toBeVisible();
  await secondReverser.close();

  
  await notes.fill(`A late correction ${Date.now()}`);
  await corrector.getByRole("button", { name: "Update Outcome" }).click();
  await expect(
    corrector.getByText(
      "This outcome was reversed, so it can no longer be corrected.",
    ),
  ).toBeVisible();
  await corrector.close();

  
  
  await expectStatuses(page, candidate, "Approved", "as before");
  expect(await reportedAdoptions(page)).toBe(baseline);

  
  await recordAdoption(page, candidate);
  await expectStatuses(page, candidate, "Adopted", "Closed");
  
  expect(await reportedAdoptions(page)).toBe(baseline + 1);

  
  const rows = await gotoOutcomeRows(page, candidate.animalId);
  await expect(rows.first().getByText("Reversed", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    rows.filter({ has: page.getByText("Reversed", { exact: true }) }),
  ).toHaveCount(1);

  
  
  await page.goto(`/dashboard/animals/${candidate.animalId}/journey`);
  await expect(page.getByText("Outcome: Adopted (reversed)")).toBeVisible();
  await expect(
    page.getByText("Outcome: Reversed", { exact: true }),
  ).toBeVisible();
});



const locationRow = (page: Page) =>
  page
    .locator("div.text-sm")
    .filter({ has: page.getByText("Location", { exact: true }) })
    .first();


const findHousedAnimal = async (page: Page) => {
  const published = await readAllPages(
    page,
    "/dashboard/animals?listingStatus=PUBLISHED",
    (rows) =>
      rows.map((row) => {
        const link = row.querySelector("a");
        return `${link?.getAttribute("href") ?? ""}\t${link?.textContent?.trim() ?? ""}`;
      }),
  );
  const withOpenApplications = new Set(
    await readAllPages(
      page,
      "/dashboard/adoption-applications?status=PENDING,REVIEWING,WAITLISTED,APPROVED",
      (rows) =>
        rows.map((row) => {
          const links = row.querySelectorAll("a");
          return links[links.length - 1]?.getAttribute("href") ?? "";
        }),
    ),
  );
  for (const entry of published) {
    const [href, name] = entry.split("\t");
    if (withOpenApplications.has(href) || isNamedElsewhere(name)) continue;
    await page.goto(href);
    const location = locationRow(page);
    await expect(location).toBeVisible();
    const label = (await location.innerText()).replace(/^Location\s*/, "").trim();
    if (label.includes(" · ")) {
      return { animalId: href.split("/").pop() as string, unitLabel: label };
    }
  }
  throw new Error(
    "No published animal is housed in a unit, free of open applications, and unnamed by another spec.",
  );
};

test("a reversed outcome puts the animal back in its unit, and the feed shows the move", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const { animalId, unitLabel } = await findHousedAnimal(page);
  const recordPath = `/dashboard/animals/${animalId}`;

  
  
  await page.goto(`${OUTCOMES_PATH}/create?animalId=${animalId}`);
  await page.getByLabel("Outcome Type *", { exact: true }).click();
  await page.getByRole("option", { name: "Deceased" }).click();
  await page.getByRole("button", { name: "Process Outcome" }).click();
  await expect(page.getByText("Outcome processed successfully.")).toBeVisible();
  await waitForPathname(page, OUTCOMES_PATH);
  await page.goto(recordPath);
  await expect(locationRow(page)).toContainText("Unplaced");

  const row = (await gotoOutcomeRows(page, animalId)).first();
  const dialog = await openReverseDialog(row);
  await dialog
    .getByLabel("Reason for reversal")
    .fill(`Recorded against the wrong animal ${Date.now()}`);
  await dialog.getByRole("button", { name: "Reverse Outcome" }).click();
  await expect(page.getByText(/^Outcome reversed\./)).toBeVisible();
  await expect(
    page.getByText(`It was put back in ${unitLabel}.`, { exact: false }),
  ).toBeVisible();

  
  await page.goto(recordPath);
  await expect(locationRow(page)).toContainText(unitLabel);

  
  await expect(page.getByText("reversed an outcome").first()).toBeVisible();
  
  const move = page
    .locator("div.relative.flex.items-start")
    .filter({ has: page.getByText("moved this animal") })
    .first();
  await expect(move).toBeVisible();
  await move.getByRole("button", { name: "Show details" }).click();
  await expect(move.getByText(`Moved to ${unitLabel}.`)).toBeVisible();
});
