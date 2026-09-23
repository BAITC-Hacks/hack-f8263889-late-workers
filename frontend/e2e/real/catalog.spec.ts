import { type Page, expect, test } from "@playwright/test";

import {
  FIELD_LABELS,
  cards,
  registerBusiness,
  registerStudent,
  seedTasks,
  signInDemo,
  tasksResponse,
} from "./helpers";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ru");
    localStorage.setItem("theme", "light");
  });
});

const sections = (page: Page) =>
  page.getByRole("navigation", { name: "Разделы", exact: true });
const titles = (page: Page) => cards(page).getByRole("heading");
const sortSelect = (page: Page) =>
  page.getByLabel("Сортировка", { exact: true });
const filterGroup = (page: Page, name: "Отрасль" | "Уровень") =>
  page.getByRole("group", { name, exact: true });

test("each role lands on its section; guests are sent to login", async ({
  page,
}) => {
  await page.goto("/catalog");
  await expect(page).toHaveURL("/login");

  await signInDemo(page, "student");
  await expect(sections(page).getByRole("link")).toHaveText([
    "Каталог",
    "Интересное",
  ]);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL("/login");

  await signInDemo(page, "business");
  await expect(sections(page).getByRole("link")).toHaveText([
    "Каталог",
    "Мои задачи",
  ]);
  await page.goto("/student");
  await expect(page).toHaveURL("/business");
});

test("registration keeps an HttpOnly session across reloads until logout", async ({
  page,
}) => {
  const email = await registerStudent(page);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "access_token"
  );
  await page.reload();
  await expect(page).toHaveURL("/catalog");
  await expect(
    page.getByRole("banner").getByText("Арман Тестовый", { exact: true })
  ).toBeVisible();

  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL("/login");
  await page.reload();
  await expect(page).toHaveURL("/login");

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill("arman2026");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL("/catalog");
});

test("the catalogue follows the API rating order and accents priority tasks", async ({
  page,
}) => {
  const list = tasksResponse(page, { sort: "rating", page: "1" });
  await signInDemo(page, "student");
  const body = await list;
  const ratings = body.items.map((task) => task.rating);
  expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  await expect(titles(page)).toHaveText(body.items.map((task) => task.title));

  const priority = page.getByRole("article", {
    name: seedTasks.priority,
    exact: true,
  });
  const accent = await priority
    .getByText("Приоритетная", { exact: true })
    .evaluate((badge) => getComputedStyle(badge).backgroundColor);
  await expect(priority).toHaveCSS("border-top-color", accent);
  await expect(
    page.getByRole("article", { name: seedTasks.bakery, exact: true })
  ).not.toHaveCSS("border-top-color", accent);

  const inProgress = body.items.filter(
    (task) => task.status.code === "in_progress"
  );
  await expect(
    cards(page).filter({ has: page.getByText("В работе", { exact: true }) })
  ).toHaveCount(inProgress.length);
});

test("date sort, filters and page survive a copied address in a new tab", async ({
  page,
  context,
}) => {
  await signInDemo(page, "student");
  const dated = tasksResponse(page, { sort: "date" });
  await sortSelect(page).selectOption({ label: "Сначала новые" });
  await expect(page).toHaveURL("/catalog?sort=date");
  const byDate = await dated;
  const dates = byDate.items.map((task) => task.publishedAt ?? "");
  expect(dates).toEqual([...dates].sort().reverse());
  await expect(titles(page)).toHaveText(byDate.items.map((task) => task.title));

  const tab = await context.newPage();
  const address = "/catalog?sort=date&level=working,needs_clarification";
  const restored = tasksResponse(tab, {
    sort: "date",
    level: "working,needs_clarification",
  });
  await tab.goto(address);
  const restoredBody = await restored;
  await expect(sortSelect(tab)).toHaveValue("date");
  await expect(filterGroup(tab, "Уровень").getByLabel("Рабочая")).toBeChecked();
  await expect(
    filterGroup(tab, "Уровень").getByLabel("Требует уточнения")
  ).toBeChecked();
  await expect(titles(tab)).toHaveText(
    restoredBody.items.map((task) => task.title)
  );

  const second = tasksResponse(tab, { sort: "date", page: "2" });
  await tab.goto("/catalog?sort=date&page=2");
  const secondBody = await second;
  await expect(sortSelect(tab)).toHaveValue("date");
  // The demo seed fits on one page; a bigger dataset gets a real second page.
  if (secondBody.total > secondBody.pageSize) {
    await expect(
      tab.getByRole("button", { name: "2", exact: true })
    ).toHaveAttribute("aria-current", "page");
    await expect(titles(tab)).toHaveText(
      secondBody.items.map((task) => task.title)
    );
  } else {
    await expect(
      tab.getByText("На этой странице задач нет", { exact: true })
    ).toBeVisible();
  }
});

test("industry and level filters narrow the list; reset keeps the sort", async ({
  page,
}) => {
  await signInDemo(page, "student");
  const unfiltered = tasksResponse(page, {
    sort: "responses",
    industry: null,
    level: null,
  });
  await page.goto("/catalog?sort=responses");
  const everything = await unfiltered;

  const narrowed = tasksResponse(page, { industry: "horeca", level: "ready" });
  await filterGroup(page, "Отрасль").getByLabel("HoReCa").click();
  await filterGroup(page, "Уровень").getByLabel("Готовая").click();
  await expect(page).toHaveURL(
    "/catalog?sort=responses&industry=horeca&level=ready"
  );
  const horecaReady = await narrowed;
  expect(horecaReady.items.length).toBeGreaterThan(0);
  for (const task of horecaReady.items) {
    expect(task.industry.code).toBe("horeca");
    expect(task.level.code).toBe("ready");
  }
  await expect(titles(page)).toHaveText(
    horecaReady.items.map((task) => task.title)
  );

  await filterGroup(page, "Уровень").getByLabel("Готовая").click();
  await filterGroup(page, "Отрасль").getByLabel("HoReCa").click();
  await expect(page).toHaveURL("/catalog?sort=responses");
  const twoLevels = tasksResponse(page, {
    level: "working,needs_clarification",
  });
  await filterGroup(page, "Уровень").getByLabel("Рабочая").click();
  await filterGroup(page, "Уровень").getByLabel("Требует уточнения").click();
  const both = await twoLevels;
  expect(new Set(both.items.map((task) => task.level.code))).toEqual(
    new Set(["working", "needs_clarification"])
  );
  await expect(titles(page)).toHaveText(both.items.map((task) => task.title));

  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await expect(page).toHaveURL("/catalog?sort=responses");
  await expect(sortSelect(page)).toHaveValue("responses");
  await expect(titles(page)).toHaveText(
    everything.items.map((task) => task.title)
  );
});

test("the task page shows all nine fields and the back link restores the list", async ({
  page,
}) => {
  await signInDemo(page, "student");
  await page.goto("/catalog?sort=date&industry=horeca");
  await page
    .getByRole("article", { name: seedTasks.bakery, exact: true })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/\/catalog\/\d+$/);
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", {
      level: 1,
      name: seedTasks.bakery,
      exact: true,
    })
  ).toBeVisible();
  await expect(main).toContainText("Опубликована 20 сентября 2026 г.");
  await expect(main.getByRole("term")).toHaveText(FIELD_LABELS);
  await expect(main.getByRole("definition").last()).toHaveText("Не указано");

  await main.getByRole("link", { name: "Каталог", exact: true }).click();
  await expect(page).toHaveURL("/catalog?sort=date&industry=horeca");
  await expect(filterGroup(page, "Отрасль").getByLabel("HoReCa")).toBeChecked();

  await page.goto("/catalog/99999");
  await expect(
    page.getByRole("heading", { name: "Задача не найдена", exact: true })
  ).toBeVisible();
});

test("a student saves and unsaves a task across the card, task page and saved list", async ({
  page,
}) => {
  await registerStudent(page);
  await page.goto("/catalog?industry=horeca");
  const card = page.getByRole("article", {
    name: seedTasks.bakery,
    exact: true,
  });
  await card.getByRole("button", { name: "В интересное", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "В интересном", exact: true })
  ).toBeVisible();
  await expect(page).toHaveURL("/catalog?industry=horeca");

  await card.getByRole("link").click();
  const main = page.getByRole("main");
  await main.getByRole("button", { name: "В интересном", exact: true }).click();
  await expect(
    main.getByRole("button", { name: "В интересное", exact: true })
  ).toBeVisible();
  await page.reload();
  await main.getByRole("button", { name: "В интересное", exact: true }).click();
  await expect(
    main.getByRole("button", { name: "В интересном", exact: true })
  ).toBeVisible();

  await sections(page).getByRole("link", { name: "Интересное" }).click();
  await expect(page).toHaveURL("/student");
  await expect(titles(page)).toHaveText([seedTasks.bakery]);
  await page
    .getByRole("article", { name: seedTasks.bakery, exact: true })
    .getByRole("button", { name: "В интересном", exact: true })
    .click();
  await expect(cards(page)).toHaveCount(0);
  await expect(
    page.getByText("Вы пока ничего не сохранили", { exact: true })
  ).toBeVisible();
});

test("the demo business opens its draft, which students cannot see", async ({
  page,
  browser,
}) => {
  await signInDemo(page, "business");
  const draft = page
    .getByRole("main")
    .getByRole("table")
    .getByRole("row")
    .filter({ hasText: seedTasks.draft });
  await expect(draft).toContainText("Черновик");
  await draft.getByText("Черновик", { exact: true }).click();
  await expect(page).toHaveURL(/\/catalog\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: seedTasks.draft, exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^В интересно/ })).toHaveCount(
    0
  );
  const draftAddress = new URL(page.url()).pathname;

  await page.goto("/catalog");
  await expect(cards(page).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^В интересно/ })).toHaveCount(
    0
  );

  const student = await browser.newContext();
  const studentPage = await student.newPage();
  await studentPage.addInitScript(() =>
    localStorage.setItem("i18nextLng", "ru")
  );
  await signInDemo(studentPage, "student");
  await studentPage.goto(draftAddress);
  await expect(
    studentPage.getByRole("heading", {
      name: "Задача не найдена",
      exact: true,
    })
  ).toBeVisible();
  await student.close();
});

test("a business without tasks sees the empty state", async ({ page }) => {
  await registerBusiness(page);
  await expect(
    page.getByText("У вас пока нет задач", { exact: true })
  ).toBeVisible();
});
