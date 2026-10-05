




import { expect, type Browser, type Locator, type Page } from "@playwright/test";
import { storageStatePathFor } from "./applications";

const adminPassword = process.env.ADMIN_PASSWORD;






export const adminStatePath = (name: string) =>
  storageStatePathFor(`note-audit-${name}-admin.state.json`);

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



export const bootstrapAdminAuth = async (
  browser: Browser,
  storageStatePath: string,
) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the note-audit E2E specs.",
    );
  }
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await signIn(page);
  await context.storageState({ path: storageStatePath });
  await context.close();
};




export const fillStable = async (field: Locator, text: string) => {
  await expect(async () => {
    await field.fill(text);
    await expect(field).toHaveValue(text, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
};



export const firstRowIdByQuery = async (
  page: Page,
  directoryPath: string,
  query: string,
): Promise<string> => {
  await page.goto(`${directoryPath}?query=${encodeURIComponent(query)}`);
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  const href = await firstRow.getByRole("link").first().getAttribute("href");
  if (!href) {
    throw new Error(`No row found in ${directoryPath} for query=${query}`);
  }
  return href.split("/").pop() as string;
};





export const noteCard = (page: Page, contentSubstring: string): Locator =>
  page.locator("div.group.rounded-lg").filter({ hasText: contentSubstring });






export const openNoteEditDialog = async (page: Page, card: Locator) => {
  await expect(card).toHaveCount(1);
  await card.hover();
  const trigger = card.getByRole("button", { name: /note actions/i });
  const editItem = page.getByRole("menuitem", { name: "Edit" });
  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await editItem.isVisible())) {
      await trigger.click();
    }
    await expect(editItem).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await editItem.click();
  await expect(page.getByRole("heading", { name: "Edit Note" })).toBeVisible();
};
