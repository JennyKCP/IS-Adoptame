import { expect, test } from "@playwright/test";

test("shows the bottom tab bar on extra-small screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const mobileNavigation = page.getByRole("navigation", {
    name: "Navegación móvil",
  });

  await expect(mobileNavigation).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Abrir menú principal" }),
  ).toBeHidden();

  for (const label of [
    "Inicio",
    "Mascotas",
    "Nosotros",
    "Contacto",
    "Iniciar sesión",
  ]) {
    await expect(
      mobileNavigation.getByRole("link", { name: label }),
    ).toBeVisible();
  }

  await expect(
    mobileNavigation.getByRole("link", { name: "Inicio" }),
  ).toHaveAttribute("aria-current", "page");

  await mobileNavigation.getByRole("link", { name: "Mascotas" }).click();
  await expect(page).toHaveURL(/\/pets$/);
});

test("keeps the hamburger between extra-small and desktop breakpoints", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "Abrir menú principal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegación móvil" }),
  ).toBeHidden();
});

test("keeps the normal navigation on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegación móvil" }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Abrir menú principal" }),
  ).toBeHidden();
});
