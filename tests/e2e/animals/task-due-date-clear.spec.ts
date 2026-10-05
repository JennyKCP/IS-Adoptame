import { expect, test, type Locator, type Page } from "@playwright/test";
import pg from "pg";
import { E2E_DATABASE_URL } from "../../../playwright/env";
import {
  bootstrapStorageState,
  storageStatePathFor,
} from "../support/applications";






const adminPassword = process.env.ADMIN_PASSWORD;

test.describe.configure({ mode: "serial" });

const storageStatePath = storageStatePathFor("task-due-date-clear.state.json");

test.beforeAll(async ({ browser }) => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the task due date E2E spec.",
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


const todayIn = (zone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date());

const query = async <T extends pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
) => {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<T>(sql, params);
    return rows;
  } finally {
    await client.end();
  }
};

type DatedTask = {
  id: string;
  animalId: string;
  title: string;
  dueDate: string;
};




const datedTask = async () => {
  const [task] = await query<DatedTask>(
    `SELECT t.id, t.animal_id AS "animalId", t.title, t.due_date AS "dueDate"
     FROM tasks t
     JOIN animals a ON a.id = t.animal_id
     WHERE t.due_date IS NOT NULL
       AND t.status IN ('TODO', 'IN_PROGRESS')
       AND a."listingStatus" <> 'ARCHIVED'
       AND (SELECT count(*) FROM tasks o
            WHERE o.animal_id = t.animal_id AND o.status <> 'DELETED') = 1
     ORDER BY t.id`,
  );
  if (!task) throw new Error("No open task with a due date to clear.");
  return task;
};

const storedDueDate = async (taskId: string) => {
  const [row] = await query<{ dueDate: string | null }>(
    `SELECT due_date AS "dueDate" FROM tasks WHERE id = $1`,
    [taskId],
  );
  return row.dueDate;
};



const openEditDialog = async (page: Page, task: DatedTask) => {
  await page.goto(`/dashboard/animals/${task.animalId}/tasks`);
  const dialog = page.getByRole("dialog", { name: "Edit Task" });
  const edit = page.getByRole("menuitem", { name: "Edit" });
  await expect(async () => {
    if (!(await edit.isVisible())) {
      await page
        .getByRole("row")
        .filter({ hasText: task.title })
        .getByRole("button", { name: "Open menu" })
        .click();
    }
    await expect(edit).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await edit.click();
  await expect(dialog).toBeVisible();
  await waitForFormHydration(page, "Update Task");
  return dialog;
};




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



const calendarOf = (page: Page) =>
  page.locator('[data-slot="popover-content"]');



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

const ways: {
  name: string;
  clear: (page: Page, dialog: Locator, task: DatedTask) => Promise<void>;
}[] = [
  {
    name: "with the X beside the picker",
    clear: async (_page, dialog) => {
      await dialog.getByRole("button", { name: "Clear date" }).click();
    },
  },
  {
    name: "by clicking the selected day again",
    clear: async (page, dialog, task) => {
      const trigger = dialog.getByRole("button", { name: /^Due Date:/ });
      const calendar = await openCalendar(page, trigger);
      
      const towards =
        task.dueDate < todayIn(SHELTER_ZONE)
          ? "Go to the Previous Month"
          : "Go to the Next Month";
      const selected = calendar.locator(
        `td[data-day="${task.dueDate}"][data-selected="true"] button`,
      );
      for (let step = 0; (await selected.count()) === 0; step++) {
        if (step > 36) throw new Error("The calendar never reached the day.");
        await calendar.getByRole("button", { name: towards }).click();
      }
      await selected.click();
      await page.keyboard.press("Escape");
      await expect(calendar).toBeHidden();
    },
  },
];

for (const way of ways) {
  test(`clearing a task's due date ${way.name} leaves it undated`, async ({
    page,
  }) => {
    const task = await datedTask();
    const dialog = await openEditDialog(page, task);

    const trigger = dialog.getByRole("button", { name: /^Due Date:/ });
    await expect(trigger).not.toHaveAttribute(
      "aria-label",
      "Due Date: Pick a date",
    );

    await way.clear(page, dialog, task);

    await expect(trigger).toHaveAttribute(
      "aria-label",
      "Due Date: Pick a date",
    );
    await expect(trigger).toHaveText("Pick a date");
    await expect(
      dialog.getByRole("button", { name: "Clear date" }),
    ).toHaveCount(0);

    await dialog.getByRole("button", { name: "Update Task" }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => storedDueDate(task.id)).toBeNull();
  });
}
