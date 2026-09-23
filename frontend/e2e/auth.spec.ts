import { expect, test } from "@playwright/test";

import {
  type Role,
  accounts,
  authError,
  fillBusiness,
  fillStudent,
  signIn,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ru");
    localStorage.setItem("theme", "light");
  });
});

for (const role of ["business", "student"] as const) {
  test(`${role}: registration, cookie session, reload and logout`, async ({
    page,
    context,
  }) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/auth/"))
        calls.push(new URL(request.url()).pathname);
    });
    const initialMe = page.waitForRequest("**/api/auth/me");
    await page.goto(`/register/${role}`);
    expect((await (await initialMe).allHeaders())["content-type"]).toBe(
      "application/json"
    );
    const email =
      role === "business" ? await fillBusiness(page) : await fillStudent(page);
    const registration = page.waitForRequest(`**/api/auth/register/${role}`);
    await page
      .getByRole("button", { name: "Зарегистрироваться", exact: true })
      .click();
    const registrationRequest = await registration;
    expect((await registrationRequest.allHeaders())["content-type"]).toBe(
      "application/json"
    );
    const submitted = registrationRequest.postDataJSON();
    expect(submitted.email).toBe(email);
    if (role === "business")
      expect(submitted.contactPhone).toBe("+77011234567");
    else {
      expect(submitted.skills).toEqual([]);
      expect(submitted.technologies).toEqual([]);
    }
    await expect(page).toHaveURL(accounts[role].home);
    await expect(
      page.getByRole("heading", { name: accounts[role].heading, exact: true })
    ).toBeVisible();
    expect(calls.filter((path) => path === "/api/auth/login")).toHaveLength(0);
    expect(calls.filter((path) => path === "/api/auth/me")).toHaveLength(1);
    const cookie = (await context.cookies()).find(
      (item) => item.name === "access_token"
    );
    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
    });
    expect(cookie!.expires - Date.now() / 1000).toBeGreaterThan(604_700);
    expect(cookie!.expires - Date.now() / 1000).toBeLessThanOrEqual(604_800);
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      "access_token"
    );
    expect(
      await page.evaluate(() => ({ ...localStorage, ...sessionStorage }))
    ).not.toHaveProperty("authToken");
    expect(
      JSON.stringify(
        await page.evaluate(() => ({ ...localStorage, ...sessionStorage }))
      )
    ).not.toContain(cookie!.value);
    const me = page.waitForRequest("**/api/auth/me");
    await page.reload();
    expect((await (await me).allHeaders()).cookie).toContain(
      `access_token=${cookie!.value}`
    );
    await expect(
      page.getByRole("heading", { name: accounts[role].heading, exact: true })
    ).toBeVisible();
    const logout = page.waitForRequest("**/api/auth/logout");
    await page.getByRole("button", { name: "Выйти", exact: true }).click();
    const logoutRequest = await logout;
    expect(logoutRequest.postData()).toBeNull();
    expect((await logoutRequest.allHeaders())["content-type"]).toBe(
      "application/json"
    );
    await expect(page).toHaveURL("/login");
    expect(
      (await context.cookies()).some((item) => item.name === "access_token")
    ).toBe(false);
    await page.reload();
    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("button", { name: "Войти", exact: true })
    ).toBeVisible();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page
      .getByLabel("Пароль", { exact: true })
      .fill(role === "business" ? "coffee2026" : "arman2026");
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(page).toHaveURL(accounts[role].home);
  });

  test(`${role}: demo account and role guards`, async ({ page }) => {
    await signIn(page, role);
    await expect(
      page.getByRole("banner").getByText(accounts[role].name, { exact: true })
    ).toBeVisible();
    const otherRole: Role = role === "business" ? "student" : "business";
    for (const path of [
      `/${otherRole}`,
      `/${otherRole}/private/nested`,
      "/login",
      "/register/business",
      "/register/student",
      "/",
      "/register",
      "/notes",
      "/unknown-page",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(accounts[role].home);
      await expect(
        page.getByRole("heading", { name: accounts[role].heading, exact: true })
      ).toBeVisible();
    }
  });
}

test("guest guards and removed demo routes lead to login", async ({ page }) => {
  for (const path of [
    "/",
    "/business",
    "/business/private/nested",
    "/student",
    "/student/private",
    "/catalog",
    "/catalog/12",
    "/register",
    "/contact",
    "/notes",
    "/chat",
    "/unknown-page",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("button", { name: "Войти", exact: true })
    ).toBeVisible();
  }
});

test("legacy authToken is removed during bootstrap", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("authToken", "legacy-token")
  );
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Войти", exact: true })
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("authToken"))
  ).toBeNull();
});

test("login validates required fields without a request and clears an incorrect password", async ({
  page,
}) => {
  let loginRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/login")) loginRequests += 1;
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByText("Введите email", { exact: true })).toBeVisible();
  await expect(page.getByText("Введите пароль", { exact: true })).toBeVisible();
  expect(loginRequests).toBe(0);
  await page.getByLabel("Email", { exact: true }).fill(accounts.business.email);
  await page.getByLabel("Пароль", { exact: true }).fill("x");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(
    page.getByText("Неверный email или пароль", { exact: true })
  ).toBeVisible();
  await expect(page.getByLabel("Пароль", { exact: true })).toHaveValue("");
  expect(loginRequests).toBe(1);
  await expect(page).toHaveURL("/login");
});

test("business validation blocks invalid fields before network submission", async ({
  page,
}) => {
  let registrationRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/register/business"))
      registrationRequests += 1;
  });
  await page.goto("/register/business");
  await fillBusiness(page);
  await page.getByLabel("Email", { exact: true }).fill("invalid-email");
  await page.getByLabel("Пароль", { exact: true }).fill("abcdefgh");
  await page.getByLabel("Название компании", { exact: true }).fill("А");
  await page.getByLabel("Контактное лицо", { exact: true }).fill("А");
  await page.getByLabel("Телефон", { exact: true }).fill("+7 12");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  for (const message of [
    "Неверный формат email",
    "Минимум 8 символов, хотя бы одна буква и одна цифра",
    "Название компании: от 2 до 200 символов",
    "Имя контактного лица: от 2 до 100 символов",
    "Телефон: от 10 до 15 цифр, можно с + в начале",
  ]) {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
  expect(registrationRequests).toBe(0);
});

test("student name validation and server field messages are accessible", async ({
  page,
}) => {
  await page.goto("/register/student");
  await fillStudent(page);
  const name = page.getByLabel("Имя", { exact: true });
  await name.fill("А");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription("Имя: от 2 до 100 символов");
  await name.fill("Арман Сейтказы");
  await page.route("**/api/auth/register/student", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: authError("VALIDATION_ERROR", "Проверьте поля формы", {
        name: "Сервер: уточните имя",
        technologies: "Сервер: проверьте технологии",
      }),
    })
  );
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(name).toHaveAccessibleDescription("Сервер: уточните имя");
  await expect(
    page.getByText("Сервер: проверьте технологии", { exact: true })
  ).toBeVisible();
});

test("business maximum lengths and phone digit limits are enforced", async ({
  page,
}) => {
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/register/business")) requests += 1;
  });
  await page.goto("/register/business");
  await fillBusiness(page);
  await page
    .getByLabel("Название компании", { exact: true })
    .fill("К".repeat(201));
  await page
    .getByLabel("Контактное лицо", { exact: true })
    .fill("И".repeat(101));
  await page.getByLabel("Телефон", { exact: true }).fill("+1234567890123456");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(
    page.getByText("Название компании: от 2 до 200 символов", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Имя контактного лица: от 2 до 100 символов", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    page.getByText("Телефон: от 10 до 15 цифр, можно с + в начале", {
      exact: true,
    })
  ).toBeVisible();
  expect(requests).toBe(0);
  await page
    .getByLabel("Название компании", { exact: true })
    .fill("К".repeat(200));
  await page
    .getByLabel("Контактное лицо", { exact: true })
    .fill("И".repeat(100));
  await page.getByLabel("Телефон", { exact: true }).fill("+123456789012345");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(page).toHaveURL("/business");
  expect(requests).toBe(1);
});

test("409 is displayed on email; 422 preserves messages on matching business fields", async ({
  page,
}) => {
  await page.goto("/register/business");
  await fillBusiness(page, accounts.business.email);
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(
    page.getByLabel("Email", { exact: true })
  ).toHaveAccessibleDescription(
    "Пользователь с таким email уже зарегистрирован"
  );
  await page.route("**/api/auth/register/business", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: authError("VALIDATION_ERROR", "Проверьте поля формы", {
        password: "Сервер: выберите другой пароль",
        contactPhone: "Сервер: уточните телефон",
      }),
    })
  );
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  await expect(
    page.getByLabel("Пароль", { exact: true })
  ).toHaveAccessibleDescription("Сервер: выберите другой пароль");
  await expect(
    page.getByLabel("Телефон", { exact: true })
  ).toHaveAccessibleDescription("Сервер: уточните телефон");
  await expect(page).toHaveURL("/register/business");
});

test("registration preserves password whitespace", async ({ page }) => {
  await page.goto("/register/student");
  const email = await fillStudent(page);
  await page.getByLabel("Пароль", { exact: true }).fill("  abc123  ");
  const request = page.waitForRequest("**/api/auth/register/student");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  expect((await request).postDataJSON().password).toBe("  abc123  ");
  await expect(page).toHaveURL(accounts.student.home);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill("  abc123  ");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(accounts.student.home);
});

test("bootstrap 500 shows a retry screen and a second request restores guest state", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/auth/me", async (route) => {
    attempts += 1;
    if (attempts === 1)
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: authError("INTERNAL_ERROR", "Ошибка сервера"),
      });
    else await route.continue();
  });
  await page.goto("/business");
  await expect(
    page.getByText("Не удалось загрузить данные", { exact: true })
  ).toBeVisible();
  await expect(page).toHaveURL("/business");
  expect(attempts).toBe(1);
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page).toHaveURL("/login");
  await expect(
    page.getByRole("button", { name: "Войти", exact: true })
  ).toBeVisible();
  expect(attempts).toBe(2);
});

test("authenticated bootstrap holds the current URL and never flashes login", async ({
  page,
}) => {
  await signIn(page, "business");
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered!: () => void;
  const requested = new Promise<void>((resolve) => {
    entered = resolve;
  });
  await page.route("**/api/auth/me", async (route) => {
    entered();
    await ready;
    await route.continue();
  });
  await page.goto("/business");
  await requested;
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByLabel("Пароль", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL("/business");
  release();
  await expect(
    page.getByRole("heading", { name: accounts.business.heading, exact: true })
  ).toBeVisible();
});

for (const error of [
  {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Не удалось выйти. Попробуйте ещё раз",
  },
  { status: 403, code: "FORBIDDEN", message: "Недостаточно прав" },
]) {
  test(`logout ${error.status} keeps the signed-in user and displays a retry message`, async ({
    page,
    context,
  }) => {
    await signIn(page, "student");
    await page.route("**/api/auth/logout", (route) =>
      route.fulfill({
        status: error.status,
        contentType: "application/json",
        body: authError(error.code, error.message),
      })
    );
    await page.getByRole("button", { name: "Выйти", exact: true }).click();
    await expect(
      page.getByText("Не удалось выйти. Попробуйте ещё раз", { exact: true })
    ).toBeVisible();
    await expect(page).toHaveURL(accounts.student.home);
    expect(
      (await context.cookies()).some((cookie) => cookie.name === "access_token")
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Выйти", exact: true })
    ).toBeEnabled();
  });
}

test("401 UNAUTHORIZED from an authenticated request clears the user and redirects", async ({
  page,
  context,
}) => {
  await signIn(page, "business");
  await context.clearCookies();
  await page.route("**/api/auth/logout", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: authError("UNAUTHORIZED", "Требуется вход"),
    })
  );
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL("/login");
  await expect(
    page.getByRole("button", { name: "Войти", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("banner").getByText(accounts.business.name, { exact: true })
  ).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL("/login");
});

test("pending login disables submission until the server response", async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route("**/api/auth/login", async (route) => {
    calls += 1;
    await ready;
    await route.continue();
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(accounts.business.email);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(accounts.business.password);
  const submit = page.locator('button[type="submit"]');
  await submit.click();
  await expect(submit).toBeDisabled();
  expect(calls).toBe(1);
  release();
  await expect(page).toHaveURL("/business");
});

test("pending registration and logout disable their buttons", async ({
  page,
}) => {
  await page.goto("/register/business");
  await fillBusiness(page);
  let finishRegistration!: () => void;
  const registrationReady = new Promise<void>((resolve) => {
    finishRegistration = resolve;
  });
  await page.route("**/api/auth/register/business", async (route) => {
    await registrationReady;
    await route.continue();
  });
  const submit = page.locator('button[type="submit"]');
  await submit.click();
  await expect(submit).toBeDisabled();
  finishRegistration();
  await expect(page).toHaveURL("/business");
  let finishLogout!: () => void;
  const logoutReady = new Promise<void>((resolve) => {
    finishLogout = resolve;
  });
  await page.route("**/api/auth/logout", async (route) => {
    await logoutReady;
    await route.continue();
  });
  const logout = page.getByRole("button", { name: "Выйти", exact: true });
  await logout.click();
  await expect(logout).toBeDisabled();
  finishLogout();
  await expect(page).toHaveURL("/login");
});

test("navigating during login cannot start a competing registration session", async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered!: () => void;
  const requested = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let registrations = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/register/")) registrations += 1;
  });
  await page.route("**/api/auth/login", async (route) => {
    const response = await route.fetch();
    entered();
    await ready;
    await route.fulfill({ response });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(accounts.business.email);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(accounts.business.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await requested;
  await page
    .getByRole("link", { name: "Регистрация для студента", exact: true })
    .click();
  await expect(page).toHaveURL("/register/student");
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
  expect(registrations).toBe(0);
  release();
  await expect(page).toHaveURL("/business");
  await expect(
    page.getByRole("banner").getByText(accounts.business.name, { exact: true })
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL("/business");
  await expect(
    page.getByRole("heading", { name: accounts.business.heading, exact: true })
  ).toBeVisible();
});

for (const form of [
  {
    path: "/login",
    endpoint: "login",
    error: "Не удалось войти. Попробуйте ещё раз",
  },
  {
    path: "/register/business",
    endpoint: "register/business",
    error: "Не удалось зарегистрироваться. Попробуйте ещё раз",
  },
]) {
  test(`${form.path}: network failure displays an actionable error`, async ({
    page,
  }) => {
    await page.goto(form.path);
    if (form.endpoint === "login") {
      await page
        .getByLabel("Email", { exact: true })
        .fill(accounts.business.email);
      await page
        .getByLabel("Пароль", { exact: true })
        .fill(accounts.business.password);
    } else await fillBusiness(page);
    await page.route(`**/api/auth/${form.endpoint}`, (route) =>
      route.abort("failed")
    );
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(form.error, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(form.path);
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });
}
