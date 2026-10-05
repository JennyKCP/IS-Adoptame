import { test, expect, type Locator, type Page } from "@playwright/test";
import { storageStatePathFor } from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;



const storageStatePath = storageStatePathFor(
  "outcome-correction-admin.state.json",
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
      "ADMIN_PASSWORD must be available to run the outcome correction E2E spec.",
    );
  }
  
  
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await signIn(page);
  await context.storageState({ path: storageStatePath });
  await context.close();
});

test.use({ storageState: storageStatePath });

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");



const fillStable = async (field: Locator, text: string) => {
  await expect(async () => {
    await field.fill(text);
    await expect(field).toHaveValue(text, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
};




const waitForFormHydration = async (
  page: Page,
  submitLabel = "Update Outcome",
) => {
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: submitLabel }) });
  await expect(form).toBeVisible();
  await expect
    .poll(() =>
      form.evaluate((el) =>
        Object.keys(el).some((key) => key.startsWith("__reactProps")),
      ),
    )
    .toBe(true);
};

const gotoOutcomeEdit = async (page: Page, editUrl: string) => {
  await page.goto(editUrl);
  await waitForFormHydration(page);
};




const openFirstOutcomeEdit = async (page: Page, type: string) => {
  await page.goto(`/dashboard/outcomes?type=${type}`);
  const row = page.locator("tbody tr").first();
  await expect(row).toBeVisible();
  const animalLink = row.getByRole("link").first();
  const href = await animalLink.getAttribute("href");
  if (!href) {
    throw new Error(`No outcome row found for type=${type}`);
  }

  
  
  
  const trigger = row.getByRole("button", { name: /open menu/i });
  const editItem = page.getByRole("menuitem", { name: "Edit" });
  await expect(async () => {
    if (!(await editItem.isVisible())) {
      await trigger.click();
    }
    await expect(editItem).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await editItem.click();
  await page.waitForURL("**/dashboard/outcomes/*/edit", { timeout: 60_000 });
  const editUrl = page.url();
  await waitForFormHydration(page);

  return { animalId: href.split("/").pop() as string, editUrl };
};

const correctionRows = (page: Page) =>
  page.locator("li").filter({ hasText: "corrected an outcome" });

const gotoActivity = async (page: Page, animalId: string) => {
  
  
  
  await page.goto(`/dashboard/animals/${animalId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByText("most recent activity logs for this animal").first(),
  ).toBeVisible();
};

test("correcting an outcome logs who changed which fields", async ({ page }) => {
  const { animalId, editUrl } = await openFirstOutcomeEdit(
    page,
    "TRANSFER_OUT",
  );
  
  
  await expect(
    page.getByText("This outcome ended a foster placement.", { exact: false }),
  ).toHaveCount(0);

  const partnerSelect = page.getByLabel(/destination partner/i);
  
  
  await expect(partnerSelect).toBeVisible();
  await expect(partnerSelect).not.toContainText(/select a partner/i);
  const previousPartner = (await partnerSelect.innerText()).trim();

  await partnerSelect.click();
  const other = page
    .getByRole("option")
    .filter({ hasNotText: new RegExp(`^${escapeRegExp(previousPartner)}$`) })
    .first();
  const nextPartner = (await other.innerText()).trim();
  await other.click();

  
  
  await expect(page.getByLabel("Outcome Type")).toBeDisabled();

  await fillStable(page.getByLabel("Notes"), `Corrected in E2E ${Date.now()}`);
  await page.getByRole("button", { name: "Update Outcome" }).click();
  await expect(page.getByText("Outcome updated successfully.")).toBeVisible();
  await page.waitForURL("**/dashboard/outcomes", { timeout: 60_000 });

  await gotoActivity(page, animalId);
  const row = correctionRows(page).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("Admin User");

  
  
  
  const detail = row.locator(".details-box");
  await expect(async () => {
    if (!(await detail.isVisible())) {
      await row.getByRole("button", { name: /details/i }).click();
    }
    await expect(detail).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await expect(detail).toContainText(
    `the destination partner changed from ${previousPartner} to ${nextPartner}`,
  );
  
  
  await expect(detail).toContainText(/notes were (added|edited)/);
  
  await expect(detail).not.toContainText("the date changed");
  await expect(detail).not.toContainText("the owner changed");

  
  
  await gotoOutcomeEdit(page, editUrl);
  await page.getByRole("button", { name: "Update Outcome" }).click();
  await expect(page.getByText("No changes to save.")).toBeVisible();
  await page.waitForURL("**/dashboard/outcomes", { timeout: 60_000 });
});

const personSearch = (page: Page) =>
  page.getByRole("combobox").filter({ hasText: "Search for a person..." });

test("the owner picker names the stored owner, and a save sends them back", async ({
  page,
}) => {
  
  await page.goto("/dashboard/outcomes?type=RETURN_TO_OWNER");
  const row = page.locator("tbody tr").first();
  await expect(row).toBeVisible();
  const owner = (
    await row.locator("td").nth(2).locator(".truncate").innerText()
  ).trim();

  await openFirstOutcomeEdit(page, "RETURN_TO_OWNER");

  
  
  await expect(page.getByText(owner, { exact: true })).toBeVisible();
  await expect(personSearch(page)).toHaveCount(0);

  
  await page.getByRole("button", { name: "Update Outcome" }).click();
  await expect(page.getByText("No changes to save.")).toBeVisible();
});

test("a person chosen as the owner survives switching the outcome type away and back", async ({
  page,
}) => {
  await page.goto("/dashboard/animals?listingStatus=PUBLISHED&pageSize=10");
  const animalLink = page.locator("tbody tr").first().getByRole("link").first();
  await expect(animalLink).toBeVisible();
  const animalId = (await animalLink.getAttribute("href"))!.split("/").pop();

  
  await page.goto(`/dashboard/outcomes/create?animalId=${animalId}`);
  await waitForFormHydration(page, "Process Outcome");

  const chooseType = async (label: string) => {
    await page.getByLabel("Outcome Type").click();
    await page.getByRole("option", { name: label, exact: true }).click();
  };

  await chooseType("Return To Owner");
  
  
  const clear = page.getByRole("button", { name: "Clear" });
  await expect(clear.or(personSearch(page))).toBeVisible();
  if (await clear.isVisible()) {
    await clear.click();
  }
  await personSearch(page).click();
  await page.getByPlaceholder("Type a name, email, or phone...").fill("e");
  
  
  const option = page
    .getByRole("option")
    .filter({ has: page.locator("p") })
    .first();
  await expect(option).toBeVisible();
  const chosen = (await option.locator("p").first().innerText()).trim();
  await option.click();
  await expect(page.getByText(chosen, { exact: true })).toBeVisible();

  await chooseType("Deceased");
  await expect(page.getByText(chosen, { exact: true })).toBeHidden();
  await chooseType("Return To Owner");
  await expect(page.getByText(chosen, { exact: true })).toBeVisible();
  await expect(personSearch(page)).toHaveCount(0);
});

test("the Processed By column sorts the outcomes list", async ({ page }) => {
  await page.goto("/dashboard/outcomes?pageSize=50");
  await expect(page.locator("tbody tr").first()).toBeVisible();

  await page.getByRole("button", { name: "Processed By" }).click();
  await page.getByRole("menuitem", { name: "Asc" }).click();
  await page.waitForURL(/sort=staffMember\.asc/);

  
  const staffColumn = (await page.locator("thead th").count()) - 2;
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const names = await page
    .locator("tbody tr")
    .evaluateAll(
      (rows, index) =>
        rows.map((row) => row.querySelectorAll("td")[index].textContent ?? ""),
      staffColumn,
    );
  expect(names.length).toBeGreaterThan(1);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
});
