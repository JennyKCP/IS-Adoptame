import { expect, test } from "@playwright/test";











const openModal = async (page: import("@playwright/test").Page) => {
  await page.goto("/pets");
  await page.locator('button[aria-label="Agregar a favoritos"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
};

for (const { name, dismiss } of [
  {
    name: "the X button",
    dismiss: (page: import("@playwright/test").Page) =>
      page.getByRole("dialog").getByRole("button", { name: "Close" }).click(),
  },
  {
    name: "the Cancel button",
    dismiss: (page: import("@playwright/test").Page) =>
      page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click(),
  },
  {
    name: "Escape",
    dismiss: (page: import("@playwright/test").Page) =>
      page.keyboard.press("Escape"),
  },
  {
    name: "a backdrop click",
    dismiss: (page: import("@playwright/test").Page) =>
      page
        .locator('[data-slot="dialog-overlay"]')
        .click({ position: { x: 5, y: 5 } }),
  },
]) {
  test(`dismissing the login prompt via ${name} closes it without navigating`, async ({
    page,
  }) => {
    await openModal(page);

    await dismiss(page);

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(/\/pets$/);
  });
}
