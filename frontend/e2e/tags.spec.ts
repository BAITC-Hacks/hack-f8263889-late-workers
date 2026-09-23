import { expect, test } from "@playwright/test";

import { fillStudent } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "ru"));
  await page.goto("/register/student");
  await fillStudent(page);
});

test("tags ignore blanks and case-insensitive duplicates; pending input is included on submit", async ({
  page,
}) => {
  const technologies = page.getByRole("textbox", {
    name: "Технологии",
    exact: true,
  });
  await technologies.fill("   ");
  await technologies.press("Enter");
  await technologies.fill(" React ");
  await technologies.press("Enter");
  await technologies.fill("react");
  await technologies.press(",");
  await expect(
    page.getByRole("button", { name: "Удалить React", exact: true })
  ).toHaveCount(1);
  await technologies.fill(" TypeScript ");
  const skills = page.getByRole("textbox", { name: "Навыки", exact: true });
  await skills.fill(" Анализ данных ");
  const request = page.waitForRequest("**/api/auth/register/student");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  expect((await request).postDataJSON()).toMatchObject({
    skills: ["Анализ данных"],
    technologies: ["React", "TypeScript"],
  });
  await expect(page).toHaveURL("/catalog");
});

test("tags enforce 20 items and 50 characters, and deletion re-enables entry", async ({
  page,
}) => {
  const skills = page.getByRole("textbox", { name: "Навыки", exact: true });
  await skills.fill("А".repeat(51));
  await skills.press("Enter");
  await expect(
    page
      .getByText("До 20 тегов, каждый до 50 символов", { exact: true })
      .first()
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Удалить ${"А".repeat(51)}`, exact: true })
  ).toHaveCount(0);
  await skills.fill("А".repeat(50));
  await skills.press("Enter");
  for (let index = 1; index < 20; index += 1) {
    await skills.fill(`Навык ${index}`);
    await skills.press(index % 2 ? "Enter" : ",");
  }
  await expect(skills).toBeDisabled();
  await page
    .getByRole("button", { name: "Удалить Навык 1", exact: true })
    .click();
  await expect(skills).toBeEnabled();
  await skills.fill("Новый навык");
  await skills.press("Enter");
  await expect(skills).toBeDisabled();
  const request = page.waitForRequest("**/api/auth/register/student");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  const data = (await request).postDataJSON();
  expect(data.skills).toHaveLength(20);
  expect(data.skills).toContain("А".repeat(50));
  expect(data.skills).toContain("Новый навык");
  expect(data.skills).not.toContain("Навык 1");
  expect(data.technologies).toEqual([]);
  await expect(page).toHaveURL("/catalog");
});

test("an oversized pending tag prevents submission until corrected", async ({
  page,
}) => {
  let registrationRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/register/student"))
      registrationRequests += 1;
  });
  const technologies = page.getByRole("textbox", {
    name: "Технологии",
    exact: true,
  });
  await technologies.fill("x".repeat(51));
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(technologies).toHaveAttribute("aria-invalid", "true");
  await expect(
    page
      .getByText("До 20 тегов, каждый до 50 символов", { exact: true })
      .first()
  ).toBeVisible();
  expect(registrationRequests).toBe(0);
  await technologies.fill("React");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(page).toHaveURL("/catalog");
  expect(registrationRequests).toBe(1);
});
