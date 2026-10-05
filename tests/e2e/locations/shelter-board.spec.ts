import { expect, test } from "@playwright/test";
import pg from "pg";
import { E2E_DATABASE_URL } from "../../../playwright/env";
import {
  bootstrapStorageState,
  storageStatePathFor,
} from "../support/applications";









const adminPassword = process.env.ADMIN_PASSWORD;

const storageStatePath = storageStatePathFor("shelter-board.state.json");

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the shelter board E2E spec.",
    );
  }
  await bootstrapStorageState(browser, {
    email: "admin@example.com",
    password: adminPassword,
    storageStatePath,
  });
});

test.use({ storageState: storageStatePath });


const housedAnimal = async () => {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{
      animal: string;
      unit: string;
      location: string;
      capacity: number;
      occupants: number;
    }>(
      `SELECT a.name AS animal, u.name AS unit, l.name AS location,
              u.capacity,
              (SELECT count(*)::int FROM animals o
               WHERE o.current_unit_id = u.id
                 AND o."listingStatus" <> 'ARCHIVED') AS occupants
       FROM animals a
       JOIN units u ON u.id = a.current_unit_id AND u.deleted_at IS NULL
       JOIN locations l ON l.id = u.location_id AND l.deleted_at IS NULL
       WHERE a."listingStatus" <> 'ARCHIVED'
         AND NOT EXISTS (
           SELECT 1 FROM animals b
           WHERE b.name = a.name AND b.id <> a.id
             AND b."listingStatus" <> 'ARCHIVED')
         AND NOT EXISTS (
           SELECT 1 FROM animals f
           WHERE f.current_unit_id = a.current_unit_id
             AND f."listingStatus" <> 'ARCHIVED' AND f.name < a.name)
       ORDER BY l.name, u.name, a.name
       LIMIT 1`,
    );
    if (!rows[0]) {
      throw new Error("No animal is housed in a unit.");
    }
    return rows[0];
  } finally {
    await client.end();
  }
};

test("the shelter board draws a unit with the animal housed in it", async ({
  page,
}) => {
  const housed = await housedAnimal();
  await page.goto("/dashboard/locations");

  
  
  
  
  const location = page
    .getByRole("group")
    .filter({
      has: page.getByRole("heading", { name: housed.location, exact: true }),
    });
  const unit = location.getByRole("group", {
    name: `${housed.unit} in ${housed.location}`,
    exact: true,
  });
  await expect(
    unit
      .getByRole("button", { name: housed.animal, exact: true })
      .and(page.locator('[aria-roledescription="draggable"]')),
  ).toBeVisible();
  
  await expect(
    unit.locator(":scope > div").first().locator(":scope > span").last(),
  ).toHaveText(`${housed.occupants}/${housed.capacity}`);
});
