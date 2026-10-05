import { expect, type Browser, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { HARNESS_CHECKOUT_ID } from "../../../playwright/env";



export const SEEDED_USER_PASSWORD = "7dJbys5@?tMA";





export const APPLICANT_EMAIL = "surrenderer1@example.com";
export const APPLICANT_NAME = "Jane Doe";





export const OTHER_PERSON_EMAIL = "finder1@example.com";

export const MY_APPLICATIONS_PATH = "/dashboard/my-adoption-applications";

export const signIn = async (page: Page, email: string, password: string) => {
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent("/dashboard")}`);
  const credentialsForm = page
    .locator("form")
    .filter({ has: page.getByLabel(/email address/i) });
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await credentialsForm.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
};





const storageStateDir = path.join(
  os.tmpdir(),
  `adoptame-e2e-${HARNESS_CHECKOUT_ID}-storage-state`,
);

export const storageStatePathFor = (fileName: string) => {
  fs.mkdirSync(storageStateDir, { recursive: true });
  return path.join(storageStateDir, fileName);
};


export const bootstrapStorageState = async (
  browser: Browser,
  {
    email,
    password,
    storageStatePath,
  }: { email: string; password: string; storageStatePath: string },
) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await signIn(page, email, password);
  await context.storageState({ path: storageStatePath });
  await context.close();
};



export const waitForPathname = (page: Page, pathname: string | RegExp) =>
  page.waitForURL(
    (url) =>
      typeof pathname === "string"
        ? url.pathname === pathname
        : pathname.test(url.pathname),
    { timeout: 60_000 },
  );




export const fillStable = async (field: Locator, text: string) => {
  await expect(async () => {
    await field.fill(text);
    await expect(field).toHaveValue(text, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
};


export const rowMenuItemHref = async (
  page: Page,
  rowIndex: number,
  itemName: string,
) => {
  const trigger = page
    .locator("tbody tr")
    .nth(rowIndex)
    .getByRole("button", { name: "Open menu" });
  const item = page.getByRole("menuitem", { name: itemName });

  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await item.isVisible())) {
      await trigger.click();
    }
    await expect(item).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });

  const href = await page
    .locator("a", { has: item })
    .first()
    .getAttribute("href");
  if (!href) {
    throw new Error(`Row ${rowIndex} has no "${itemName}" link.`);
  }
  
  await page.keyboard.press("Escape");
  return href;
};
