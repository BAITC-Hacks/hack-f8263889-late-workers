import { type Page, expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ru");
    localStorage.setItem("theme", "light");
  });
});

const sections = (page: Page) =>
  page.getByRole("navigation", { name: "Разделы", exact: true });

test("student lands on the catalog with catalog and saved sections", async ({
  page,
}) => {
  await signIn(page, "student");
  await expect(page).toHaveURL("/catalog");
  const nav = sections(page);
  await expect(nav.getByRole("link")).toHaveText(["Каталог", "Интересное"]);
  await expect(
    nav.getByRole("link", { name: "Каталог", exact: true })
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Интересное", exact: true }).click();
  await expect(page).toHaveURL("/student");
  await expect(
    page.getByRole("heading", { level: 1, name: "Интересное", exact: true })
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Интересное", exact: true })
  ).toHaveAttribute("aria-current", "page");
  await expect(
    nav.getByRole("link", { name: "Каталог", exact: true })
  ).not.toHaveAttribute("aria-current", "page");
});

test("business lands on its tasks with catalog and my tasks sections", async ({
  page,
}) => {
  await signIn(page, "business");
  await expect(page).toHaveURL("/business");
  const nav = sections(page);
  await expect(nav.getByRole("link")).toHaveText(["Каталог", "Мои задачи"]);
  await expect(
    nav.getByRole("link", { name: "Мои задачи", exact: true })
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Каталог", exact: true }).click();
  await expect(page).toHaveURL("/catalog");
  await expect(
    page.getByRole("heading", { level: 1, name: "Каталог задач", exact: true })
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Каталог", exact: true })
  ).toHaveAttribute("aria-current", "page");
});

const cards = (page: Page) => page.getByRole("article");
const isTasksList = (url: URL) => url.pathname === "/api/tasks";
const ratings = async (page: Page) =>
  (
    await cards(page)
      .getByText(/^\d+ \/ 100$/)
      .allTextContents()
  ).map((text) => Number(text.split(" ")[0]));

test("catalog lists tasks by rating with an accented priority card", async ({
  page,
}) => {
  const request = page.waitForRequest((request) =>
    isTasksList(new URL(request.url()))
  );
  await signIn(page, "student");
  const params = new URL((await request).url()).searchParams;
  expect(params.get("sort")).toBe("rating");
  expect(params.get("page")).toBe("1");
  await expect(cards(page)).toHaveCount(20);
  const values = await ratings(page);
  expect(values).toEqual([...values].sort((a, b) => b - a));

  const priority = cards(page).first();
  await expect(
    priority.getByText("Приоритетная", { exact: true })
  ).toBeVisible();
  const accent = await priority
    .getByText("Приоритетная", { exact: true })
    .evaluate((badge) => getComputedStyle(badge).backgroundColor);
  await expect(priority).toHaveCSS("border-top-color", accent);
  const ready = cards(page).filter({ hasText: "Готовая" }).first();
  await expect(ready).not.toHaveCSS("border-top-color", accent);

  await expect(
    cards(page).filter({ hasText: "В работе" }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Страницы каталога", exact: true })
  ).toBeVisible();
});

test("card shows the contract fields and opens the task", async ({ page }) => {
  await signIn(page, "student");
  await page.goto("/catalog?industry=horeca&level=ready");
  const card = page.getByRole("article", {
    name: "Прогноз спроса на выпечку",
    exact: true,
  });
  await expect(card).toContainText("Кофейня «Зерно» · HoReCa");
  await expect(card).toContainText("78 / 100");
  await expect(card).toContainText("Готовая");
  await expect(card).toContainText("3 отклика");
  await expect(card).toContainText("Каждый день списываем до 15% выпечки");
  await card.getByRole("link", { name: "Прогноз спроса на выпечку" }).click();
  await expect(page).toHaveURL("/catalog/12");
});

test("sort and page live in the address and survive a new tab", async ({
  page,
  context,
}) => {
  await signIn(page, "student");
  await page
    .getByLabel("Сортировка", { exact: true })
    .selectOption({ label: "Сначала новые" });
  await expect(page).toHaveURL("/catalog?sort=date");
  await expect(cards(page).first()).toHaveAccessibleName(
    "Учёт волонтёров и смен"
  );

  const pages = page.getByRole("navigation", {
    name: "Страницы каталога",
    exact: true,
  });
  await pages.getByRole("button", { name: "2", exact: true }).click();
  await expect(page).toHaveURL("/catalog?sort=date&page=2");
  await expect(cards(page)).toHaveCount(5);
  const secondPage = await cards(page).getByRole("heading").allTextContents();

  const tab = await context.newPage();
  await tab.goto(page.url());
  await expect(tab.getByLabel("Сортировка", { exact: true })).toHaveValue(
    "date"
  );
  await expect(
    tab.getByRole("button", { name: "2", exact: true })
  ).toHaveAttribute("aria-current", "page");
  await expect(cards(tab).getByRole("heading")).toHaveText(secondPage);

  await page
    .getByLabel("Сортировка", { exact: true })
    .selectOption({ label: "По числу откликов" });
  await expect(page).toHaveURL("/catalog?sort=responses");
  await expect(
    pages.getByRole("button", { name: "1", exact: true })
  ).toHaveAttribute("aria-current", "page");
});

test("pagination is hidden when everything fits on one page", async ({
  page,
}) => {
  await signIn(page, "student");
  await page.goto("/catalog?level=priority");
  await expect(cards(page)).toHaveCount(4);
  await expect(
    page.getByRole("navigation", { name: "Страницы каталога", exact: true })
  ).toHaveCount(0);
});

test("catalog loading shows six placeholder cards", async ({ page }) => {
  await signIn(page, "student");
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(isTasksList, async (route) => {
    await ready;
    await route.continue();
  });
  await page
    .getByLabel("Сортировка", { exact: true })
    .selectOption({ label: "Сначала новые" });
  await expect(page.getByTestId("task-card-skeleton")).toHaveCount(6);
  release();
  await expect(cards(page)).toHaveCount(20);
  await expect(page.getByTestId("task-card-skeleton")).toHaveCount(0);
});

test("empty catalog without filters and with filters", async ({ page }) => {
  await signIn(page, "student");
  await page.route(isTasksList, (route) =>
    new URL(route.request().url()).searchParams.has("industry")
      ? route.continue()
      : route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0 }),
        })
  );
  await page.goto("/catalog?sort=responses");
  await expect(
    page.getByText("Опубликованных задач пока нет", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Сбросить фильтры", exact: true })
  ).toHaveCount(0);

  await page.unroute(isTasksList);
  await page.goto("/catalog?sort=responses&industry=government&level=ready");
  await expect(
    page.getByText("По выбранным фильтрам задач нет", { exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await expect(page).toHaveURL("/catalog?sort=responses");
  await expect(cards(page)).toHaveCount(20);
});

test("catalog error offers a retry", async ({ page }) => {
  await signIn(page, "student");
  let fail = true;
  await page.route(isTasksList, (route) =>
    fail
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "INTERNAL_ERROR", message: "Ошибка сервера" },
          }),
        })
      : route.continue()
  );
  await page.goto("/catalog?sort=date");
  await expect(
    page.getByText("Не удалось загрузить каталог", { exact: true })
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(cards(page)).toHaveCount(20);
});
