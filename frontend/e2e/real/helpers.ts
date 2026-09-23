import { type Page, type Response, expect } from "@playwright/test";

import { fillBusiness, fillStudent } from "../helpers";

export const API_TARGET = (
  process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const DEMO_PASSWORD = "demo2026";

export const demoAccounts = {
  student: { email: "arman@student.kz", home: "/catalog" },
  business: { email: "owner@zerno.kz", home: "/business" },
};

/**
 * Titles from backend/seed/tasks.json. The database generates task IDs, so
 * tests find tasks by title and never hardcode an ID.
 */
export const seedTasks = {
  priority: "Программа лояльности для постоянных гостей",
  bakery: "Прогноз спроса на выпечку",
  draft: "Чат-бот для брони столиков",
};

export const FIELD_LABELS = [
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

export type TaskCardJson = {
  id: number;
  title: string;
  rating: number;
  publishedAt: string | null;
  level: { code: string };
  status: { code: string };
  industry: { code: string; name: string };
};

export type TasksPageJson = {
  items: TaskCardJson[];
  page: number;
  pageSize: number;
  total: number;
};

export async function signInDemo(page: Page, role: keyof typeof demoAccounts) {
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(demoAccounts[role].email);
  await page.getByLabel("Пароль", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(demoAccounts[role].home);
}

export async function registerStudent(page: Page) {
  await page.goto("/register/student");
  const email = await fillStudent(page);
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(page).toHaveURL("/catalog");
  return email;
}

export async function registerBusiness(page: Page) {
  await page.goto("/register/business");
  const email = await fillBusiness(page);
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(page).toHaveURL("/business");
  return email;
}

/**
 * The catalogue response for a query, matched on its parameters rather than on
 * arrival order; `null` means the parameter is absent.
 */
export async function tasksResponse(
  page: Page,
  params: Record<string, string | null>
): Promise<TasksPageJson> {
  const response = await page.waitForResponse((response: Response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/tasks" &&
      Object.entries(params).every(
        ([key, value]) => url.searchParams.get(key) === value
      )
    );
  });
  return (await response.json()) as TasksPageJson;
}

export const cards = (page: Page) => page.getByRole("article");
