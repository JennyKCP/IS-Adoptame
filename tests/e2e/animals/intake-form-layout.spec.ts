import { test, expect, type Locator, type Page } from "@playwright/test";
import { storageStatePathFor } from "../support/applications";

const adminPassword = process.env.ADMIN_PASSWORD;




const storageStatePath = storageStatePathFor(
  "animal-intake-layout-admin.state.json",
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
      "ADMIN_PASSWORD must be available to run the intake form layout E2E spec.",
    );
  }
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await signIn(page);
  await context.storageState({ path: storageStatePath });
  await context.close();
});

test.use({ storageState: storageStatePath });








type Box = { x: number; y: number; width: number; height: number };

const boxOf = async (locator: Locator): Promise<Box> => {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("expected element to have a bounding box");
  }
  return box;
};

const intersects = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;




const setFormWidth = async (page: Page, width: number) => {
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: "Animal Information" }) });
  await form.evaluate((el, w) => {
    el.style.width = `${w}px`;
    el.style.maxWidth = `${w}px`;
  }, width);
};

const namedSelects = (page: Page): Locator[] =>
  ["Species *", "Breed *", "Primary Color *", "Sex *"].map((label) =>
    page.getByLabel(label, { exact: true }),
  );

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard/animals/create");
  await expect(page.getByLabel("Species *", { exact: true })).toBeVisible();
});

test("below the container breakpoint the fields stack and no two selects overlap", async ({
  page,
}) => {
  await setFormWidth(page, 600);

  const [species, breed] = namedSelects(page);

  
  await expect(async () => {
    const s = await boxOf(species);
    const b = await boxOf(breed);
    expect(s.y + s.height).toBeLessThanOrEqual(b.y + 1);
  }).toPass({ timeout: 10_000 });

  
  const selects = namedSelects(page);
  const boxes = await Promise.all(selects.map(boxOf));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(
        intersects(boxes[i], boxes[j]),
        `selects ${i} and ${j} must not overlap when stacked`,
      ).toBe(false);
    }
  }
});

test("above the container breakpoint the fields sit side by side in the grid", async ({
  page,
}) => {
  await setFormWidth(page, 960);

  const [species, breed] = namedSelects(page);

  await expect(async () => {
    const s = await boxOf(species);
    const b = await boxOf(breed);
    
    expect(Math.abs(s.y - b.y)).toBeLessThan(5);
    
    expect(s.x + s.width).toBeLessThanOrEqual(b.x + 1);
    expect(intersects(s, b)).toBe(false);
  }).toPass({ timeout: 10_000 });
});
