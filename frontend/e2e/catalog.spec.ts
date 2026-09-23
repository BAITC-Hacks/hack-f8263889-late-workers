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
