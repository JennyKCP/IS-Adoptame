import { expect, test, type Page } from "@playwright/test";












const petsQuery = "?category=Dog&sort=name.asc";
const petsUrlWithQuery = `/pets${petsQuery}`;

const adminPassword = process.env.ADMIN_PASSWORD;

test.beforeAll(() => {
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD must be available to run the seeded admin login test.",
    );
  }
});


const signInWithAdmin = async (page: Page) => {
  const credentialsForm = page.locator("form").filter({
    has: page.getByLabel(/email address/i),
  });
  await page.getByLabel(/email address/i).fill("admin@example.com");
  await page.getByLabel(/^password$/i).fill(adminPassword!);
  await credentialsForm.getByRole("button", { name: /^sign in$/i }).click();
};

test("signing in from the login modal returns to the same pets URL, query string intact", async ({
  page,
}) => {
  await page.goto(petsUrlWithQuery);

  await page
    .getByRole("button", { name: "Add to favorites" })
    .first()
    .click();

  await page.getByRole("link", { name: /login \/ sign up/i }).click();
  await page.waitForURL((url) => url.pathname === "/sign-in", {
    timeout: 10_000,
  });
  const signInUrl = new URL(page.url());
  expect(signInUrl.searchParams.get("callbackUrl")).toBe(petsUrlWithQuery);

  await signInWithAdmin(page);

  await page.waitForURL(
    (url) => url.pathname === "/pets" && url.search === petsQuery,
    { timeout: 60_000 },
  );
});

test("a protocol-relative callbackUrl never leaves the app's origin", async ({
  page,
  baseURL,
}) => {
  await page.goto(
    `/sign-in?callbackUrl=${encodeURIComponent("//evil.com")}`,
  );

  await signInWithAdmin(page);

  await page.waitForURL((url) => url.pathname !== "/sign-in", {
    timeout: 60_000,
  });
  expect(new URL(page.url()).host).toBe(new URL(baseURL!).host);
});

test("an already-signed-in visitor with a malicious callbackUrl is redirected to the safe fallback, not off-origin", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await signInWithAdmin(page);
  await page.waitForURL((url) => url.pathname !== "/sign-in", {
    timeout: 60_000,
  });

  await page.goto(
    `/sign-in?callbackUrl=${encodeURIComponent("//evil.com")}`,
  );

  await page.waitForURL((url) => url.pathname === "/", { timeout: 60_000 });
  expect(new URL(page.url()).pathname).toBe("/");
});







test("an already-signed-in visitor with a valid callbackUrl is returned to it, not dumped on the home page", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await signInWithAdmin(page);
  await page.waitForURL((url) => url.pathname !== "/sign-in", {
    timeout: 60_000,
  });

  await page.goto(
    `/sign-in?callbackUrl=${encodeURIComponent(petsUrlWithQuery)}`,
  );

  await page.waitForURL(
    (url) => url.pathname === "/pets" && url.search === petsQuery,
    { timeout: 60_000 },
  );
});
