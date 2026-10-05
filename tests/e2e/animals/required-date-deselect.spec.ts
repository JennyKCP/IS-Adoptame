import { expect, test, type Locator, type Page } from "@playwright/test";
import pg from "pg";
import { E2E_DATABASE_URL } from "../../../playwright/env";
import {
  bootstrapStorageState,
  storageStatePathFor,
} from "../support/applications";







const adminPassword = process.env.ADMIN_PASSWORD;

const storageStatePath = storageStatePathFor("required-date-deselect.state.json");

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the required date E2E spec.",
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

const firstValue = async (sql: string) => {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ value: string }>(sql);
    if (rows.length === 0) throw new Error(`No row for: ${sql}`);
    return rows[0].value;
  } finally {
    await client.end();
  }
};




const waitForFormHydration = async (page: Page, submitName: string) => {
  const form = formWithSubmit(page, submitName);
  await expect(form).toBeVisible();
  await expect
    .poll(() =>
      form.evaluate((el) =>
        Object.keys(el).some((key) => key.startsWith("__reactProps")),
      ),
    )
    .toBe(true);
};

const formWithSubmit = (page: Page, submitName: string) =>
  page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: submitName }) });




const chooseFromSelect = async (page: Page, label: string, option: string) => {
  const choice = page.getByRole("option", { name: option, exact: true });
  await expect(async () => {
    if (!(await choice.isVisible())) {
      await page.getByLabel(label, { exact: true }).click();
    }
    await expect(choice).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await choice.click();
  await expect(page.getByRole("option")).toHaveCount(0);
};



const calendarOf = (page: Page) => page.locator('[data-slot="popover-content"]');



const openCalendar = async (page: Page, trigger: Locator) => {
  const calendar = calendarOf(page);
  await expect(async () => {
    if (!(await calendar.isVisible())) {
      await trigger.click();
    }
    await expect(calendar).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return calendar;
};

type Form = {
  name: string;
  
  open: (page: Page) => Promise<void>;
  
  submit: (page: Page) => Locator;
  
  trigger: RegExp;
  
  startsEmpty?: boolean;
};

const forms: Form[] = [
  {
    
    name: "the outcome form's date of outcome",
    open: async (page) => {
      const animalId = await firstValue(
        `SELECT id AS value FROM animals
         WHERE "listingStatus" <> 'ARCHIVED' ORDER BY id`,
      );
      await page.goto(`/dashboard/outcomes/create?animalId=${animalId}`);
      await waitForFormHydration(page, "Process Outcome");
    },
    submit: (page) => page.getByRole("button", { name: "Process Outcome" }),
    trigger: /^Date of Outcome \*:/,
  },
  {
    
    name: "the create animal form's intake date",
    open: async (page) => {
      await page.goto("/dashboard/animals/create");
      await waitForFormHydration(page, "Create Intake");
    },
    submit: (page) =>
      formWithSubmit(page, "Create Intake").getByRole("button", {
        name: "Create Intake",
      }),
    trigger: /^Intake Date \*:/,
  },
  {
    
    
    name: "the create animal form's estimated birth date",
    open: async (page) => {
      await page.goto("/dashboard/animals/create");
      await waitForFormHydration(page, "Create Intake");
    },
    submit: (page) =>
      formWithSubmit(page, "Create Intake").getByRole("button", {
        name: "Create Intake",
      }),
    trigger: /^Estimated Birth Date \*:/,
    startsEmpty: true,
  },
  {
    
    name: "the re-intake form's intake date",
    open: async (page) => {
      const animalId = await firstValue(
        `SELECT id AS value FROM animals
         WHERE "listingStatus" = 'ARCHIVED' ORDER BY id`,
      );
      await page.goto(`/dashboard/animals/${animalId}/intake/create`);
      await waitForFormHydration(page, "Process Re-Intake");
    },
    submit: (page) => page.getByRole("button", { name: "Process Re-Intake" }),
    trigger: /^Intake Date \*:/,
  },
  {
    
    name: "the intake correction form's intake date",
    open: async (page) => {
      const intakeId = await firstValue(
        `SELECT id AS value FROM intakes WHERE type = 'STRAY' ORDER BY id`,
      );
      await page.goto(`/dashboard/intakes/${intakeId}/edit`);
      await waitForFormHydration(page, "Update Intake");
      await chooseFromSelect(page, "Intake Type *", "Owner Surrender");
    },
    submit: (page) => page.getByRole("button", { name: "Update Intake" }),
    trigger: /^Intake Date \*:/,
  },
  {
    
    name: "the vitals form's date recorded",
    open: async (page) => {
      const animalId = await firstValue(
        `SELECT id AS value FROM animals WHERE name = 'Frisco' ORDER BY id`,
      );
      await page.goto(`/dashboard/animals/${animalId}/vitals`);
      
      
      
      const dialog = page.getByRole("dialog", { name: "Record Vitals" });
      await expect(async () => {
        if (!(await dialog.isVisible())) {
          await page.getByRole("button", { name: "Record Vitals" }).click();
        }
        await expect(dialog).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
      await waitForFormHydration(page, "Record Vitals");
    },
    submit: (page) =>
      page
        .getByRole("dialog", { name: "Record Vitals" })
        .locator("form")
        .getByRole("button", { name: "Record Vitals" }),
    trigger: /^Date Recorded \*:/,
  },
  {
    
    name: "the assessment form's observed on",
    open: async (page) => {
      const animalId = await firstValue(
        `SELECT id AS value FROM animals WHERE name = 'Frisco' ORDER BY id`,
      );
      await page.goto(`/dashboard/animals/${animalId}/assessments/create`);
      await waitForFormHydration(page, "Record assessment");
    },
    submit: (page) => page.getByRole("button", { name: "Record assessment" }),
    trigger: /^Observed on \*:/,
  },
];

for (const form of forms) {
  test(`clicking the selected day again keeps ${form.name}`, async ({
    page,
  }) => {
    await form.open(page);

    const trigger = page.getByRole("button", { name: form.trigger });
    if (form.startsEmpty) {
      const empty = await trigger.getAttribute("aria-label");
      const first = await openCalendar(page, trigger);
      
      
      
      await first
        .getByRole("button", { name: "Go to the Previous Month" })
        .click();
      await first.locator("button[data-day]").nth(15).click();
      await page.keyboard.press("Escape");
      await expect(first).toBeHidden();
      await expect(trigger).not.toHaveAttribute("aria-label", empty!);
    }
    const before = await trigger.getAttribute("aria-label");
    expect(before).not.toBeNull();

    
    const calendar = await openCalendar(page, trigger);
    const selected = calendar.locator(
      'td[data-selected="true"] button[data-day]',
    );
    
    
    for (let step = 0; (await selected.count()) === 0; step++) {
      if (step > 36) throw new Error("The calendar never reached the day.");
      await calendar
        .getByRole("button", { name: "Go to the Previous Month" })
        .click();
    }
    await expect(selected).toHaveCount(1);
    await selected.click();
    await page.keyboard.press("Escape");
    await expect(calendar).toBeHidden();

    await expect(trigger).toHaveAttribute("aria-label", before!);

    
    
    await trigger.focus();
    await trigger.blur();
    await form.submit(page).click();
    await expect(
      page.locator('[data-slot="form-message"]').first(),
    ).toBeVisible();

    const message = page
      .locator('[data-slot="form-item"]')
      .filter({ has: trigger })
      .locator('[data-slot="form-message"]');
    await expect(message).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-label", before!);
    await expect(trigger).not.toHaveAttribute("aria-invalid", "true");
  });
}
