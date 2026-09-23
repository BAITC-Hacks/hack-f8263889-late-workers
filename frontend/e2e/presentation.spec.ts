import { type Page, type TestInfo, expect, test } from "@playwright/test";

import { accounts } from "./helpers";

const languages = {
  ru: { login: "Вход", password: "Пароль", signIn: "Войти", logout: "Выйти" },
  en: {
    login: "Sign in",
    password: "Password",
    signIn: "Sign in",
    logout: "Sign out",
  },
  kk: { login: "Кіру", password: "Құпиясөз", signIn: "Кіру", logout: "Шығу" },
};

async function capturePage(page: Page, testInfo: TestInfo, name: string) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
    "auth."
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth
    )
  ).toBe(true);
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const language of ["ru", "en", "kk"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const width of [375, 768, 1920]) {
      test(`${language}, ${theme}, ${width}px: translated forms and cabinets fit the viewport`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(
          ({ language, theme }) => {
            localStorage.setItem("i18nextLng", language);
            localStorage.setItem("theme", theme);
          },
          { language, theme }
        );
        await page.goto("/login");
        await expect(
          page.getByRole("heading", {
            name: languages[language].login,
            exact: true,
          })
        ).toBeVisible();
        await expect(
          page.getByLabel(languages[language].password, { exact: true })
        ).toBeVisible();
        if (theme === "dark")
          await expect(page.locator("html")).toHaveClass(/dark/);
        else await expect(page.locator("html")).not.toHaveClass(/dark/);
        await capturePage(page, testInfo, "login");
        for (const role of ["business", "student"] as const) {
          await page.goto(`/register/${role}`);
          await expect(
            page.getByLabel(languages[language].password, { exact: true })
          ).toBeVisible();
          await expect(page.locator("form input")).toHaveCount(5);
          await capturePage(page, testInfo, `register-${role}`);
        }
        for (const role of ["business", "student"] as const) {
          await page.goto("/login");
          await page
            .getByLabel("Email", { exact: true })
            .fill(accounts[role].email);
          await page
            .getByLabel(languages[language].password, { exact: true })
            .fill(accounts[role].password);
          await page
            .getByRole("button", {
              name: languages[language].signIn,
              exact: true,
            })
            .click();
          await expect(page).toHaveURL(accounts[role].home);
          await expect(
            page
              .getByRole("banner")
              .getByText(accounts[role].name, { exact: true })
          ).toBeVisible();
          await capturePage(page, testInfo, role);
          await page
            .getByRole("button", {
              name: languages[language].logout,
              exact: true,
            })
            .click();
          await expect(page).toHaveURL("/login");
        }
      });
    }
  }
}

test("language and theme controls update the current page and persist on reload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("i18nextLng"))
      localStorage.setItem("i18nextLng", "ru");
    if (!localStorage.getItem("theme")) localStorage.setItem("theme", "light");
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "kk", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Кіру", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Theme: light", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Кіру", exact: true })
  ).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
