import { expect, test, type Page } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { E2E_DATABASE_URL } from "../../../playwright/env";
import {
  bootstrapStorageState,
  storageStatePathFor,
  waitForPathname,
} from "../support/applications";







const adminPassword = process.env.ADMIN_PASSWORD;

test.describe.configure({ mode: "serial" });

const storageStatePath = storageStatePathFor(
  "outcome-ends-foster-placement.state.json",
);

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the outcome ends foster placement E2E spec.",
    );
  }
  await bootstrapStorageState(browser, {
    email: "admin@example.com",
    password: adminPassword,
    storageStatePath,
  });
});



const SHELTER_ZONE = process.env.SHELTER_TIMEZONE || "America/New_York";

test.use({ storageState: storageStatePath, timezoneId: SHELTER_ZONE });

const OUTCOMES_PATH = "/dashboard/outcomes";



const E2E_DIR = path.resolve(__dirname, "..");
const OTHER_SOURCES = (fs.readdirSync(E2E_DIR, { recursive: true }) as string[])
  .filter(
    (file) =>
      file.endsWith(".ts") && path.basename(file) !== path.basename(__filename),
  )
  .map((file) => fs.readFileSync(path.join(E2E_DIR, file), "utf8"))
  .join("\n");
const isNamedElsewhere = (name: string) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}_])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_])`,
    "u",
  ).test(OTHER_SOURCES);


type DayKey = string;

const todayIn = (zone: string): DayKey =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date());

const shiftDay = (day: DayKey, days: number): DayKey =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);


const printedDay = (day: DayKey) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const withDb = async <T>(run: (client: pg.Client) => Promise<T>) => {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
};


const newId = () =>
  `c${Array.from(crypto.randomBytes(24), (byte) =>
    "abcdefghijklmnopqrstuvwxyz0123456789".charAt(byte % 36),
  ).join("")}`;

interface Animal {
  id: string;
  name: string;
}

interface Foster {
  profileId: string;
  personId: string;
  name: string;
}


const takeAnimals = async (count: number, intakeDay: DayKey) =>
  withDb(async (client) => {
    const { rows } = await client.query<Animal>(
      `SELECT a.id, a.name FROM animals a
       WHERE a."listingStatus" = 'PUBLISHED'
         AND (SELECT count(*) FROM intakes i WHERE i."animalId" = a.id) = 1
         AND NOT EXISTS (SELECT 1 FROM outcomes o WHERE o."animalId" = a.id)
         AND NOT EXISTS (
           SELECT 1 FROM adoption_applications p WHERE p.animal_id = a.id)
         AND NOT EXISTS (
           SELECT 1 FROM foster_placements f WHERE f.animal_id = a.id)
       ORDER BY a.name, a.id`,
    );
    const names = new Set<string>();
    const picked = rows.filter((row) => {
      
      if (names.has(row.name) || isNamedElsewhere(row.name)) return false;
      names.add(row.name);
      return true;
    });
    if (picked.length < count) {
      throw new Error("Not enough first-stay animals free of other specs.");
    }
    const chosen = picked.slice(0, count);
    for (const animal of chosen) {
      await client.query(
        `UPDATE intakes SET "intakeDate" = $2 WHERE "animalId" = $1`,
        [animal.id, intakeDay],
      );
    }
    return chosen;
  });


const placeInFoster = async (
  animal: Animal,
  type: "GENERAL" | "FOSTER_TO_ADOPT",
  startDay: DayKey,
) =>
  withDb(async (client) => {
    const { rows: fosters } = await client.query<Foster>(
      `SELECT fp.id AS "profileId", p.id AS "personId", p.name
       FROM foster_profiles fp JOIN persons p ON p.id = fp.person_id
       WHERE fp.status = 'ACTIVE'
         AND (SELECT count(*) FROM foster_placements x
              WHERE x.foster_profile_id = fp.id AND x.end_date IS NULL)
           < fp.max_animals
       ORDER BY fp.id LIMIT 1`,
    );
    if (fosters.length === 0) {
      throw new Error("No active foster has room for a placement.");
    }
    const [foster] = fosters;
    const {
      rows: [admin],
    } = await client.query<{ id: string }>(
      `SELECT id FROM persons WHERE email = 'admin@example.com'`,
    );
    const placementId = newId();
    await client.query(
      `INSERT INTO foster_placements
         (id, type, start_date, animal_id, foster_profile_id,
          previous_unit_id, previous_listing_status, placed_by_id, "updatedAt")
       SELECT $1, $2::"FosterPlacementType", $3, a.id, $5, a.current_unit_id,
              CASE WHEN $2 = 'FOSTER_TO_ADOPT' THEN a."listingStatus" END,
              $6, now()
       FROM animals a WHERE a.id = $4`,
      [placementId, type, startDay, animal.id, foster.profileId, admin.id],
    );
    await client.query(
      `UPDATE animals SET current_unit_id = NULL,
         "listingStatus" = CASE WHEN $2 = 'FOSTER_TO_ADOPT'
           THEN 'PENDING_ADOPTION'::"AnimalListingStatus"
           ELSE "listingStatus" END
       WHERE id = $1`,
      [animal.id, type],
    );
    await client.query(
      `INSERT INTO animal_activity_logs
         (id, "activityType", "animalId", "changedById", "changeSummary",
          "changedAt")
       VALUES ($1, 'FOSTER_PLACED', $2, $3, $4, now())`,
      [newId(), animal.id, admin.id, `Placed with foster ${foster.name}.`],
    );
    return { placementId, foster };
  });


const approvedApplication = async (animal: Animal, foster: Foster) =>
  withDb(async (client) => {
    const id = newId();
    await client.query(
      `INSERT INTO adoption_applications
         (id, applicant_name, applicant_email, applicant_phone,
          applicant_address_line1, applicant_city, applicant_state,
          applicant_zip_code, living_situation, household_size, children_ages,
          reason_for_adoption, status, source, applicant_id, animal_id,
          updated_at)
       VALUES ($1, $2, $3, '212-555-0199', '12 Test Lane', 'New York', 'NY',
               '10001', 'OWN_HOME', 2, '{}', 'Adopting the animal I foster.',
               'APPROVED', 'STAFF', $4, $5, now())`,
      [
        id,
        foster.name,
        `outcome-foster-e2e-${Date.now()}@example.com`,
        foster.personId,
        animal.id,
      ],
    );
    await client.query(
      `UPDATE animals SET "listingStatus" = 'PENDING_ADOPTION'
       WHERE id = $1 AND "listingStatus" = 'PUBLISHED'`,
      [animal.id],
    );
    return id;
  });

const setApplicationStatus = (
  applicationId: string,
  status: "PENDING" | "APPROVED",
) =>
  withDb((client) =>
    client.query(
      `UPDATE adoption_applications SET status = $2::"ApplicationStatus"
       WHERE id = $1`,
      [applicationId, status],
    ),
  );



const liveOutcomeId = (animalId: string) =>
  withDb(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM outcomes WHERE "animalId" = $1 AND "reversedAt" IS NULL`,
      [animalId],
    );
    expect(rows).toHaveLength(1);
    return rows[0].id;
  });




const waitForFormHydration = async (page: Page, submitName: string) => {
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: submitName }) });
  await expect(form).toBeVisible();
  await expect
    .poll(() =>
      form.evaluate((el) =>
        Object.keys(el).some((key) => key.startsWith("__reactProps")),
      ),
    )
    .toBe(true);
};




const openSelect = async (page: Page, label: string) => {
  const options = page.getByRole("option");
  await expect(async () => {
    if (!(await options.first().isVisible())) {
      await page.getByLabel(label, { exact: true }).click();
    }
    await expect(options.first()).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return options;
};

const chooseFromSelect = async (page: Page, label: string, option: string) => {
  const options = await openSelect(page, label);
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(options).toHaveCount(0);
};

const dateTrigger = (page: Page) =>
  page.getByRole("button", { name: /^Date of Outcome \*:/ });





const shownDay = async (page: Page): Promise<DayKey> => {
  const name = (await dateTrigger(page).getAttribute("aria-label")) ?? "";
  const match = name.match(/: (\w+) (\d+)\w*, (\d{4})$/);
  if (!match) throw new Error(`No day in the date picker's name: "${name}".`);
  const [, monthName, date, year] = match;
  const month = new Date(`${monthName} 1, 2000`).getMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}-${date.padStart(2, "0")}`;
};


const dataDayOf = (day: DayKey) => {
  const [year, month, date] = day.split("-").map(Number);
  return `${month}/${date}/${year}`;
};



const pickDay = async (page: Page, day: DayKey) => {
  const calendar = page.getByRole("dialog");
  await expect(async () => {
    if (!(await calendar.isVisible())) {
      await dateTrigger(page).click();
    }
    await expect(calendar).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  const cell = calendar.locator(`button[data-day="${dataDayOf(day)}"]`);
  if (!(await cell.isVisible())) {
    await calendar
      .getByRole("button", { name: "Go to the Previous Month" })
      .click();
  }
  await cell.click();
  await page.keyboard.press("Escape");
  await expect(calendar).toBeHidden();
};

const toast = (page: Page, message: string | RegExp) =>
  page.locator("[data-sonner-toast]").filter({ hasText: message });

const banner = (page: Page) =>
  page
    .locator("div")
    .filter({ hasText: /^In foster with/ })
    .first();


const historyRow = async (page: Page, foster: Foster, animal: Animal) => {
  await page.goto(`/dashboard/people-directory/${foster.personId}/fostering`);
  await expect(
    page.getByText("Placement History", { exact: true }),
  ).toBeVisible();
  return page
    .locator("tbody tr")
    .filter({ has: page.locator(`a[href="/dashboard/animals/${animal.id}"]`) });
};

const today = todayIn(SHELTER_ZONE);
const intakeDay = shiftDay(today, -60);
const placementStart = shiftDay(today, -10);



let deceased: Animal;
let convertible: Animal;
let deceasedPlacement: { placementId: string; foster: Foster };

test.beforeAll(async () => {
  [deceased, convertible] = await takeAnimals(2, intakeDay);
});

test("an outcome recorded while the animal is in foster says so, and ends the placement", async ({
  page,
}) => {
  deceasedPlacement = await placeInFoster(deceased, "GENERAL", placementStart);
  const { foster } = deceasedPlacement;

  await page.goto(`${OUTCOMES_PATH}/create?animalId=${deceased.id}`);
  await expect(
    page.getByText(
      `${deceased.name} is in foster with ${foster.name} since ${printedDay(placementStart)}. Recording this outcome ends that placement.`,
    ),
  ).toBeVisible();
  await waitForFormHydration(page, "Process Outcome");
  await chooseFromSelect(page, "Outcome Type *", "Deceased");

  
  const outcomeDay = await shownDay(page);
  await page.getByRole("button", { name: "Process Outcome" }).click();
  await expect(toast(page, "Outcome processed successfully.")).toBeVisible();
  await waitForPathname(page, OUTCOMES_PATH);

  await page.goto(`/dashboard/animals/${deceased.id}`);
  await expect(
    page.getByText("Archived", { exact: true }).first(),
  ).toBeVisible();
  await expect(banner(page)).toBeHidden();

  
  const row = await historyRow(page, foster, deceased);
  await expect(row).toContainText(printedDay(outcomeDay));
  await expect(row).toContainText("Ended: deceased");
});

test("correcting that outcome's day says it moves the placement's end, and moves it", async ({
  page,
}) => {
  const { foster } = deceasedPlacement;
  const outcomeId = await liveOutcomeId(deceased.id);
  const correctedDay = shiftDay(today, -2);

  await page.goto(`${OUTCOMES_PATH}/${outcomeId}/edit`);
  await waitForFormHydration(page, "Update Outcome");
  await expect(
    page.getByText(
      "This outcome ended a foster placement. Changing the date moves the placement's end day with it.",
    ),
  ).toBeVisible();

  await pickDay(page, correctedDay);
  await page.getByRole("button", { name: "Update Outcome" }).click();
  await expect(toast(page, "Outcome updated successfully.")).toBeVisible();
  await waitForPathname(page, OUTCOMES_PATH);

  const row = await historyRow(page, foster, deceased);
  await expect(row).toContainText(printedDay(correctedDay));
  await expect(row).toContainText("Ended: deceased");
});

test("a foster adopting from their foster-to-adopt placement is sent to the conversion", async ({
  page,
}) => {
  const { placementId, foster } = await placeInFoster(
    convertible,
    "FOSTER_TO_ADOPT",
    placementStart,
  );
  const applicationId = await approvedApplication(convertible, foster);

  
  
  
  await setApplicationStatus(applicationId, "PENDING");
  await page.goto(`${OUTCOMES_PATH}/create?applicationId=${applicationId}`);
  await expect(
    page.getByRole("button", { name: "Process Outcome" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Convert the Foster Placement" }),
  ).toHaveCount(0);

  await setApplicationStatus(applicationId, "APPROVED");
  await page.goto(`${OUTCOMES_PATH}/create?applicationId=${applicationId}`);
  await expect(
    page.getByRole("heading", { name: "Convert the Foster Placement" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      `is in a foster-to-adopt placement with ${foster.name}, who is adopting through this application.`,
    ),
  ).toBeVisible();
  
  await expect(
    page.getByRole("button", { name: "Process Outcome" }),
  ).toHaveCount(0);

  
  
  await page.getByRole("link", { name: "Convert to Adoption" }).click();
  await waitForPathname(
    page,
    `/dashboard/fosters/placements/${placementId}/convert`,
  );
  await expect(
    page.getByRole("radio", { name: `${foster.name}'s application` }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Convert to Adoption" }).click();
  await page.getByRole("button", { name: "Confirm & Convert" }).click();
  await expect(
    page.getByText("Foster placement converted to adoption."),
  ).toBeVisible();
});
