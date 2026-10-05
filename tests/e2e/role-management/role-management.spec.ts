import { expect, test } from "@playwright/test";

const adminPassword = process.env.ADMIN_PASSWORD;
const roleManagementPath = "/dashboard/settings/role-management";




const targetUserEmail = "surrenderer1@example.com";

test.beforeAll(() => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the seeded admin login test.",
    );
  }
});

test("admin can change a user's role and the change persists across reload", async ({
  page,
}) => {
  await page.goto(
    `/sign-in?callbackUrl=${encodeURIComponent(roleManagementPath)}`,
  );

  const credentialsForm = page.locator("form").filter({
    has: page.getByLabel(/email address/i),
  });

  await page.getByLabel(/email address/i).fill("admin@example.com");
  await page.getByLabel(/^password$/i).fill(adminPassword!);
  await credentialsForm.getByRole("button", { name: /^sign in$/i }).click();

  await page.waitForURL(`**${roleManagementPath}`, { timeout: 60_000 });
  await expect(
    page.getByText("Role Management", { exact: true }),
  ).toBeVisible();

  
  const searchInput = page.getByPlaceholder("Filter by email or name...");
  await searchInput.fill(targetUserEmail);
  await page.waitForURL((url) => url.searchParams.get("query") === targetUserEmail);

  const targetRow = page.getByRole("row").filter({ hasText: targetUserEmail });
  await expect(targetRow).toBeVisible();
  await expect(targetRow.getByText("User", { exact: true })).toBeVisible();

  
  await targetRow.getByRole("button", { name: /open menu/i }).click();
  await page.getByRole("menuitem", { name: /set as staff/i }).click();

  
  
  
  
  await expect(
    page.getByText("User role updated successfully."),
  ).toBeVisible();

  
  await page.reload();
  const staffRow = page.getByRole("row").filter({ hasText: targetUserEmail });
  await expect(staffRow).toBeVisible();
  await expect(staffRow.getByText("Staff", { exact: true })).toBeVisible();

  
  await staffRow.getByRole("button", { name: /open menu/i }).click();
  await page.getByRole("menuitem", { name: /set as user/i }).click();

  await expect(
    page.getByText("User role updated successfully."),
  ).toBeVisible();

  await page.reload();
  const revertedRow = page.getByRole("row").filter({ hasText: targetUserEmail });
  await expect(revertedRow).toBeVisible();
  await expect(revertedRow.getByText("User", { exact: true })).toBeVisible();
});
