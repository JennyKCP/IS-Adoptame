import { test, expect, type Page } from "@playwright/test";
import {
  adminStatePath,
  bootstrapAdminAuth,
  fillStable,
  firstRowIdByQuery,
  noteCard,
  openNoteEditDialog,
} from "../support/note-audit";

const storageState = adminStatePath("animals");












test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await bootstrapAdminAuth(browser, storageState);
});

test.use({ storageState });

const buddyId = async (page: Page) =>
  firstRowIdByQuery(page, "/dashboard/animals", "Buddy");

const MEDICAL_NOTE = "Kennel cough suspected";
const INTAKE_NOTE = "Initial intake notes";

const editRows = (page: Page) =>
  page.locator("li").filter({ hasText: "edited a note" });




const gotoActivity = async (page: Page, id: string) => {
  await page.goto(`/dashboard/animals/${id}`);
  const feed = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "most recent activity logs for this animal" });
  await expect(feed.locator("li").filter({ hasText: /\S/ }).first()).toBeVisible();
};

test("editing an animal note stamps 'edited by Admin User' and feeds the activity log, and a save with no changes writes nothing", async ({
  page,
}) => {
  const id = await buddyId(page);

  
  
  
  
  await gotoActivity(page, id);
  const activityBefore = await editRows(page).count();

  await page.goto(`/dashboard/animals/${id}/notes`);
  const intakeCard = noteCard(page, INTAKE_NOTE);
  await expect(intakeCard).toHaveCount(1);
  await expect(intakeCard.getByText(/edited by/i)).toHaveCount(0);

  
  
  await openNoteEditDialog(page, intakeCard);
  await page.getByRole("button", { name: "Update Note" }).click();
  await expect(page.getByText("No changes to save.")).toBeVisible();

  const card = noteCard(page, MEDICAL_NOTE);
  await openNoteEditDialog(page, card);

  const revised = `Kennel cough resolved on recheck — cleared for adoption. E2E ${Date.now()}`;
  await fillStable(page.getByLabel("Content *", { exact: true }), revised);
  
  await page.getByRole("button", { name: "Update Note" }).click();
  await expect(page.getByText("Note updated successfully.")).toBeVisible();

  
  const editedCard = noteCard(page, revised);
  await expect(editedCard.getByText(/edited by Admin User/)).toBeVisible();
  
  await expect(intakeCard.getByText(/edited by/i)).toHaveCount(0);

  
  
  
  await gotoActivity(page, id);
  await expect(editRows(page)).toHaveCount(activityBefore + 1);
  const row = page
    .locator("li")
    .filter({ hasText: "Admin User" })
    .filter({ hasText: "edited a note" })
    .first();
  await expect(row).toBeVisible();

  
  
  
  const detail = row.getByText("Medical", { exact: true });
  await expect(async () => {
    if (!(await detail.isVisible())) {
      await row.getByRole("button", { name: /details/i }).click();
    }
    await expect(detail).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
});
