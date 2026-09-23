import { type Page, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

export type Role = "business" | "student";

export const accounts = {
  business: {
    email: "owner@zerno.kz",
    password: "coffee2026",
    heading: "Кабинет бизнеса",
    name: "Кофейня «Зерно»",
  },
  student: {
    email: "arman@student.kz",
    password: "arman2026",
    heading: "Кабинет студента",
    name: "Арман Сейтказы",
  },
};

export function newEmail() {
  return `e2e-${randomUUID()}@example.kz`;
}

export async function fillBusiness(page: Page, email = newEmail()) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill("coffee2026");
  await page
    .getByLabel("Название компании", { exact: true })
    .fill("Кофейня «Тест»");
  await page
    .getByLabel("Контактное лицо", { exact: true })
    .fill("Айгерим Нурланова");
  await page.getByLabel("Телефон", { exact: true }).fill("+7 (701) 123-45-67");
  return email;
}

export async function fillStudent(page: Page, email = newEmail()) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill("arman2026");
  await page.getByLabel("Имя", { exact: true }).fill("Арман Тестовый");
  return email;
}

export async function signIn(page: Page, role: Role) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(accounts[role].email);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(accounts[role].password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(`/${role}`);
  await expect(
    page.getByRole("heading", { name: accounts[role].heading, exact: true })
  ).toBeVisible();
}

export function authError(
  code: string,
  message: string,
  fields?: Record<string, string>
) {
  return JSON.stringify({
    error: { code, message, ...(fields ? { fields } : {}) },
  });
}
