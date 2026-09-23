import { type Page, expect, test } from "@playwright/test";

import { fillBusiness, fillStudent, signIn } from "./helpers";

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
  const reset = page.getByRole("button", {
    name: "Сбросить фильтры",
    exact: true,
  });
  await expect(reset).toHaveCount(2);
  await reset.last().click();
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

const filterGroup = (page: Page, name: "Отрасль" | "Уровень") =>
  page.getByRole("group", { name, exact: true });

test("industry and level filters narrow the list and go to the address", async ({
  page,
}) => {
  await signIn(page, "student");
  await page.goto("/catalog?page=2");
  await filterGroup(page, "Отрасль").getByLabel("HoReCa").click();
  await expect(page).toHaveURL("/catalog?industry=horeca");
  await filterGroup(page, "Уровень").getByLabel("Готовая").click();
  await expect(page).toHaveURL("/catalog?industry=horeca&level=ready");
  await expect(cards(page)).toHaveCount(1);
  for (const card of await cards(page).all()) {
    await expect(card).toContainText("HoReCa");
    await expect(card).toContainText("Готовая");
  }

  await filterGroup(page, "Отрасль").getByLabel("HoReCa").click();
  await filterGroup(page, "Уровень").getByLabel("Приоритетная").click();
  await expect(page).toHaveURL("/catalog?level=ready,priority");
  const request = page.waitForRequest((request) =>
    isTasksList(new URL(request.url()))
  );
  await page.reload();
  expect(new URL((await request).url()).searchParams.get("level")).toBe(
    "ready,priority"
  );
  await expect(cards(page)).toHaveCount(12);
  const levels = await cards(page)
    .getByText(/^(Готовая|Приоритетная|Рабочая|Требует уточнения)$/)
    .allTextContents();
  expect(new Set(levels)).toEqual(new Set(["Готовая", "Приоритетная"]));
  await expect(
    filterGroup(page, "Уровень").getByLabel("Приоритетная")
  ).toBeChecked();
});

test("reset clears industries and levels but keeps the sort", async ({
  page,
}) => {
  await signIn(page, "student");
  await page.goto("/catalog?sort=date&industry=it,finance&level=working");
  await expect(cards(page)).toHaveCount(2);
  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await expect(page).toHaveURL("/catalog?sort=date");
  await expect(cards(page)).toHaveCount(20);
  await expect(page.getByLabel("Сортировка", { exact: true })).toHaveValue(
    "date"
  );
  await expect(filterGroup(page, "Отрасль").getByRole("checkbox")).toHaveCount(
    10
  );
  for (const checkbox of await page.getByRole("checkbox").all())
    await expect(checkbox).not.toBeChecked();
});

test("industries loading disables the list; an error keeps level filters working", async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fail = false;
  await page.route("**/api/industries", async (route) => {
    await ready;
    if (fail)
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "Ошибка сервера" },
        }),
      });
    else await route.continue();
  });
  await signIn(page, "student");
  await expect(filterGroup(page, "Отрасль")).toHaveAttribute("disabled", "");
  await expect(
    filterGroup(page, "Уровень").getByLabel("Готовая")
  ).toBeEnabled();
  fail = true;
  release();
  await expect(
    page.getByText("Не удалось загрузить отрасли", { exact: true })
  ).toBeVisible();
  await filterGroup(page, "Уровень").getByLabel("Готовая").click();
  await expect(page).toHaveURL("/catalog?level=ready");
  await expect(cards(page).first()).toContainText("Готовая");

  fail = false;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(filterGroup(page, "Отрасль").getByRole("checkbox")).toHaveCount(
    10
  );
  await expect(
    page.getByText("Не удалось загрузить отрасли", { exact: true })
  ).toHaveCount(0);
});

const isTaskDetail = (url: URL) => /^\/api\/tasks\/\d+$/.test(url.pathname);
const FIELD_LABELS = [
  "Контекст",
  "Потребность",
  "Пользователи",
  "Данные и материалы",
  "Ограничения",
  "Ожидаемый результат",
  "Критерии успеха",
  "Контакт",
  "Формат взаимодействия",
];

test("task page shows the header and all nine labelled fields", async ({
  page,
}) => {
  await signIn(page, "student");
  await page.goto("/catalog?industry=horeca&level=ready");
  await page
    .getByRole("article", { name: "Прогноз спроса на выпечку", exact: true })
    .click();
  await expect(page).toHaveURL("/catalog/12");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", {
      level: 1,
      name: "Прогноз спроса на выпечку",
      exact: true,
    })
  ).toBeVisible();
  await expect(main).toContainText("Кофейня «Зерно» · HoReCa");
  await expect(main).toContainText("78 / 100");
  await expect(main).toContainText("Готовая");
  await expect(main).toContainText("3 отклика");
  await expect(main).toContainText("Опубликована 20 сентября 2026 г.");
  await expect(main.getByRole("term")).toHaveText(FIELD_LABELS);
  await expect(main.getByRole("definition").nth(1)).toHaveText(
    "Каждый день списываем до 15% выпечки. Нужна модель, которая по продажам прошлых недель подскажет, сколько печь на завтра."
  );
  const format = main.getByRole("definition").last();
  await expect(format).toHaveText("Не указано");
  await expect(format).toHaveCSS(
    "color",
    await main
      .getByText("Кофейня «Зерно» · HoReCa")
      .evaluate((node) => getComputedStyle(node).color)
  );
});

test("task page shows the in-progress label", async ({ page }) => {
  await signIn(page, "student");
  await page.goto("/catalog/3");
  await expect(page.getByRole("main")).toContainText("В работе");
  await expect(page.getByRole("main")).toContainText("Приоритетная");
});

test("back link restores sort, filters and page", async ({ page }) => {
  await signIn(page, "student");
  await page.goto(
    "/catalog?sort=responses&level=working,ready,priority&page=2"
  );
  const title = await cards(page).first().getByRole("heading").textContent();
  await cards(page).first().getByRole("link").click();
  await expect(page).toHaveURL(/\/catalog\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: title!, exact: true })
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Каталог", exact: true })
    .click();
  await expect(page).toHaveURL(
    "/catalog?sort=responses&level=working,ready,priority&page=2"
  );
  await expect(
    page.getByRole("button", { name: "2", exact: true })
  ).toHaveAttribute("aria-current", "page");
  await expect(cards(page).first()).toHaveAccessibleName(title!);
});

test("unknown and malformed task ids show not found", async ({ page }) => {
  await signIn(page, "student");
  await page.goto("/catalog/99999");
  await expect(
    page.getByRole("heading", { name: "Задача не найдена", exact: true })
  ).toBeVisible();
  await page.getByRole("link", { name: "В каталог", exact: true }).click();
  await expect(page).toHaveURL("/catalog");

  let detailRequests = 0;
  page.on("request", (request) => {
    if (isTaskDetail(new URL(request.url()))) detailRequests += 1;
  });
  await page.goto("/catalog/abc");
  await expect(
    page.getByRole("heading", { name: "Задача не найдена", exact: true })
  ).toBeVisible();
  expect(detailRequests).toBe(0);
});

test("task page loading placeholder and error retry", async ({ page }) => {
  await signIn(page, "student");
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fail = true;
  await page.route(isTaskDetail, async (route) => {
    await ready;
    if (fail)
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "Ошибка сервера" },
        }),
      });
    else await route.continue();
  });
  await page.goto("/catalog/12");
  await expect(page.getByTestId("task-skeleton")).toBeVisible();
  release();
  await expect(
    page.getByText("Не удалось загрузить задачу", { exact: true })
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Прогноз спроса на выпечку",
      exact: true,
    })
  ).toBeVisible();
});

const businessTasks = (page: Page) => page.getByRole("main").getByRole("table");

test("business sees its tasks, including a draft, and opens a row", async ({
  page,
}) => {
  await signIn(page, "business");
  const table = businessTasks(page);
  await expect(table.getByRole("columnheader")).toHaveText([
    "Название",
    "Статус",
    "Рейтинг",
    "Уровень",
    "Отклики",
    "Обновлена",
  ]);
  const draft = table
    .getByRole("row")
    .filter({ hasText: "Чат-бот для записи к врачу" });
  await expect(draft).toContainText("Черновик");
  await expect(draft).toContainText("Требует уточнения");
  await expect(table.getByRole("row")).toHaveCount(4);
  await draft.getByText("Черновик", { exact: true }).click();
  await expect(page).toHaveURL("/catalog/15");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Чат-бот для записи к врачу",
      exact: true,
    })
  ).toBeVisible();
  await page.goBack();
  await table
    .getByRole("link", { name: "Прогноз спроса на выпечку", exact: true })
    .click();
  await expect(page).toHaveURL("/catalog/12");
});

test("a business without tasks sees the empty state", async ({ page }) => {
  await page.goto("/register/business");
  await fillBusiness(page);
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(page).toHaveURL("/business");
  await expect(
    page.getByText("У вас пока нет задач", { exact: true })
  ).toBeVisible();
  await expect(businessTasks(page)).toHaveCount(0);
});

test("business tasks loading rows and error retry", async ({ page }) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fail = true;
  await page.route("**/api/business/tasks", async (route) => {
    await ready;
    if (fail)
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "Ошибка сервера" },
        }),
      });
    else await route.continue();
  });
  await signIn(page, "business");
  await expect(page.getByTestId("business-task-skeleton")).toHaveCount(3);
  release();
  await expect(
    page.getByText("Не удалось загрузить задачи", { exact: true })
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(businessTasks(page).getByRole("row")).toHaveCount(4);
});

test("student cannot open the business section", async ({ page }) => {
  await signIn(page, "student");
  await page.goto("/business");
  await expect(page).toHaveURL("/catalog");
});

async function registerStudent(page: Page) {
  await page.goto("/register/student");
  await fillStudent(page);
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(page).toHaveURL("/catalog");
  await expect(cards(page)).toHaveCount(20);
}

const bakery = (page: Page) =>
  page.getByRole("article", { name: "Прогноз спроса на выпечку", exact: true });

test("save from a card, then unsave from the task page", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/catalog?industry=horeca");
  const card = bakery(page);
  const saveRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/tasks/12/save"
  );
  await card.getByRole("button", { name: "В интересное", exact: true }).click();
  expect((await saveRequest).postData()).toBeNull();
  await expect(
    card.getByRole("button", { name: "В интересном", exact: true })
  ).toBeVisible();
  await expect(page).toHaveURL("/catalog?industry=horeca");

  await card.getByRole("link").click();
  await expect(page).toHaveURL("/catalog/12");
  const main = page.getByRole("main");
  const unsaveRequest = page.waitForRequest(
    (request) =>
      request.method() === "DELETE" &&
      new URL(request.url()).pathname === "/api/tasks/12/save"
  );
  await main.getByRole("button", { name: "В интересном", exact: true }).click();
  await unsaveRequest;
  await expect(
    main.getByRole("button", { name: "В интересное", exact: true })
  ).toBeVisible();

  await page.reload();
  await expect(
    main.getByRole("button", { name: "В интересное", exact: true })
  ).toBeVisible();
});

test("save button is disabled until the response", async ({ page }) => {
  await registerStudent(page);
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/tasks/*/save", async (route) => {
    await ready;
    await route.continue();
  });
  const button = cards(page)
    .first()
    .getByRole("button", { name: "В интересное", exact: true });
  await button.click();
  await expect(button).toBeDisabled();
  release();
  await expect(
    cards(page)
      .first()
      .getByRole("button", { name: "В интересном", exact: true })
  ).toBeEnabled();
});

test("a failed save restores the button and shows a toast", async ({
  page,
}) => {
  await registerStudent(page);
  await page.route("**/api/tasks/*/save", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "Ошибка сервера" },
      }),
    })
  );
  const card = cards(page).first();
  await card.getByRole("button", { name: "В интересное", exact: true }).click();
  await expect(
    page.getByText("Не удалось сохранить изменения", { exact: true })
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "В интересное", exact: true })
  ).toBeEnabled();
  await expect(page).toHaveURL("/catalog");
});

test("business sees no save buttons", async ({ page }) => {
  await signIn(page, "business");
  await page.goto("/catalog");
  await expect(cards(page)).toHaveCount(20);
  await expect(page.getByRole("button", { name: /^В интересно/ })).toHaveCount(
    0
  );
  await page.goto("/catalog/12");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Прогноз спроса на выпечку",
      exact: true,
    })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^В интересно/ })).toHaveCount(
    0
  );
});

test("saved tasks appear on the saved page and disappear when unsaved", async ({
  page,
}) => {
  await registerStudent(page);
  await page.goto("/catalog?industry=horeca");
  await bakery(page)
    .getByRole("button", { name: "В интересное", exact: true })
    .click();
  await expect(
    bakery(page).getByRole("button", { name: "В интересном", exact: true })
  ).toBeVisible();
  const loyalty = page.getByRole("article", {
    name: "Программа лояльности без пластиковых карт",
    exact: true,
  });
  await loyalty
    .getByRole("button", { name: "В интересное", exact: true })
    .click();
  await expect(
    loyalty.getByRole("button", { name: "В интересном", exact: true })
  ).toBeVisible();

  await sections(page).getByRole("link", { name: "Интересное" }).click();
  await expect(page).toHaveURL("/student");
  await expect(cards(page)).toHaveCount(2);
  await expect(bakery(page)).toContainText("78 / 100");

  await bakery(page)
    .getByRole("button", { name: "В интересном", exact: true })
    .click();
  await expect(bakery(page)).toHaveCount(0);
  await expect(cards(page)).toHaveCount(1);
  await loyalty
    .getByRole("button", { name: "В интересном", exact: true })
    .click();
  await expect(cards(page)).toHaveCount(0);
  await expect(
    page.getByText("Вы пока ничего не сохранили", { exact: true })
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Перейти в каталог", exact: true })
    .click();
  await expect(page).toHaveURL("/catalog");
  await page.goto("/catalog?industry=horeca");
  await expect(
    bakery(page).getByRole("button", { name: "В интересное", exact: true })
  ).toBeVisible();
});

test("saved page loading placeholders and error retry", async ({ page }) => {
  await registerStudent(page);
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fail = true;
  await page.route("**/api/me/saved-tasks", async (route) => {
    await ready;
    if (fail)
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "Ошибка сервера" },
        }),
      });
    else await route.continue();
  });
  await sections(page).getByRole("link", { name: "Интересное" }).click();
  await expect(page.getByTestId("task-card-skeleton")).toHaveCount(3);
  release();
  await expect(
    page.getByText("Не удалось загрузить список", { exact: true })
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(
    page.getByText("Вы пока ничего не сохранили", { exact: true })
  ).toBeVisible();
});
