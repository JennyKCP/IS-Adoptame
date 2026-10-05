import { expect, test, type Page } from "@playwright/test";















const speciesPill = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Species" })
    .getByRole("button", { name, exact: true });

const selectSpecies = async (page: Page, name: string) => {
  await speciesPill(page, name).click();
};
const sortTrigger = (page: Page) =>
  page.getByRole("combobox", { name: "Sort by:" });


const facetButton = (page: Page, title: string) =>
  page.getByRole("button", { name: new RegExp(`^${title}`) });

test("selecting a species then resetting clears the species dropdown", async ({
  page,
}) => {
  await page.goto("/pets");

  await selectSpecies(page, "Bird");
  await page.waitForURL((url) => url.searchParams.get("category") === "Bird");
  await expect(speciesPill(page, "Bird")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Restablecer" }).click();

  await page.waitForURL(
    (url) => url.pathname === "/pets" && url.search === "",
  );
  
  await expect(speciesPill(page, "All")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(speciesPill(page, "Bird")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(new URL(page.url()).searchParams.has("category")).toBe(false);
});

test("resetting several filters at once clears every control", async ({
  page,
}) => {
  await page.goto("/pets");

  
  await selectSpecies(page, "Dog");
  await page.waitForURL((url) => url.searchParams.get("category") === "Dog");

  
  await facetButton(page, "Color").click();
  await page.getByRole("option", { name: "Black", exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get("color") === "Black");
  await page.keyboard.press("Escape");

  
  await facetButton(page, "Sex").click();
  await page.getByRole("option", { name: "Male", exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get("sex") === "MALE");
  await page.keyboard.press("Escape");

  
  await facetButton(page, "Size").click();
  await page.getByRole("option", { name: "Small", exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get("size") === "SMALL");
  await page.keyboard.press("Escape");

  
  await sortTrigger(page).click();
  await page.getByRole("option", { name: "Oldest", exact: true }).click();
  await page.waitForURL(
    (url) => url.searchParams.get("sort") === "createdAt.asc",
  );

  
  await page.getByRole("searchbox").fill("bud");
  await page.waitForURL((url) => url.searchParams.get("query") === "bud");

  
  await expect(speciesPill(page, "Dog")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(sortTrigger(page)).toHaveText("Más antiguos");

  await page.getByRole("button", { name: "Restablecer" }).click();
  await page.waitForURL(
    (url) => url.pathname === "/pets" && url.search === "",
  );

  
  await expect(speciesPill(page, "All")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(facetButton(page, "Color")).toHaveText("Color");
  await expect(facetButton(page, "Sex")).toHaveText("Sex");
  await expect(facetButton(page, "Size")).toHaveText("Size");
  await expect(sortTrigger(page)).toHaveText("Más recientes"); 
  await expect(page.getByRole("searchbox")).toHaveValue("");
});

test("navigating to a pet detail page and back leaves the control matching the URL", async ({
  page,
}) => {
  await page.goto("/pets");

  
  
  await selectSpecies(page, "Dog");
  await page.waitForURL((url) => url.searchParams.get("category") === "Dog");
  await expect(speciesPill(page, "Dog")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.locator('main a[href^="/pets/"]').first().click();
  await page.waitForURL((url) => /^\/pets\/[^/]+$/.test(url.pathname));

  await page.goBack();
  await page.waitForURL((url) => url.searchParams.get("category") === "Dog");

  
  await expect(speciesPill(page, "Dog")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
