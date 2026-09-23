# Авторизация: что нужно сделать на фронтенде

Бэкенд переехал на ролевую авторизацию (бизнес / студент) с HttpOnly-cookie.
Старые эндпоинты регистрации удалены, формат ошибок изменился у **всего** API.
Ниже — только то, что нужно поменять в `frontend/`.

## 1. `withCredentials: true` — без этого не заработает ничего

Токен теперь приходит в cookie. Браузер **не сохранит и не отправит** её на
кросс-origin запрос, если axios не попросит явно — даже при `allow_credentials`
на бэкенде. Это первое, что нужно сделать:

```ts
// frontend/src/core/api/client.ts
export const apiClient = axios.create({
  baseURL: API_V1_URL,
  withCredentials: true,   // <- новое
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});
```

Если после логина в DevTools → Application → Cookies нет `access_token` —
почти наверняка забыт этот флаг.

## 2. Новые пути — вне `/api/v1`

Контракт авторизации не версионирован, а `apiClient` смонтирован на `/api/v1`.
Нужен абсолютный URL (тот же приём, что уже используется в `modules/system/api/health.ts`):

```ts
const AUTH_API_URL = `${API_URL}/api/auth`;
```

| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| POST | `/api/auth/register/business` | `{ email, password, companyName, contactName, contactPhone }` | `201` + `{ user }` |
| POST | `/api/auth/register/student` | `{ email, password, name, skills[], technologies[] }` | `201` + `{ user }` |
| POST | `/api/auth/login` | `{ email, password }` | `200` + `{ user }` |
| POST | `/api/auth/logout` | — | `204` |
| GET | `/api/auth/me` | — | `200` + `{ user }` |

`skills` и `technologies` необязательны: пропущенные считаются пустыми.
Теги обрезаются по краям и дедуплицируются без учёта регистра —
`[" React ", "react", "Python"]` вернётся как `["React", "Python"]`.

Телефон можно слать как удобно пользователю: `+7 (701) 123-45-67` сохранится
как `+77011234567` и в таком виде вернётся.

Форма пользователя:

```ts
type User = {
  id: number;
  email: string;
  role: "business" | "student";
  createdAt: string;              // ISO 8601 UTC, с суффиксом Z
  business: { id: number; companyName: string; contactName: string; contactPhone: string } | null;
  student: { id: number; name: string; skills: string[]; technologies: string[] } | null;
};
```

У бизнеса `student` всегда `null`, у студента — наоборот.

## 3. Токен больше не читается из JS

Cookie помечена `HttpOnly`, поэтому `tokenStorage` и `useAuthStore.token`
для этого потока бесполезны. Состояние сессии определяется одним способом:
`GET /api/auth/me` вернул `200` (вошёл) или `401` (не вошёл).

Практично: держать `me` в TanStack Query и считать `isAuthenticated` как
«запрос успешен». `RequireAuth` смотрит на этот же результат, а не на localStorage.
После `logout` — инвалидировать кэш `me`.

## 4. Формат ошибок изменился у всего API

Было `{"error": {"code": "not_found", "message": "...", "details": [...]}}`,
стало:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Проверьте поля формы",
             "fields": { "contactPhone": "Телефон: от 10 до 15 цифр, можно с + в начале" } } }
```

Что нужно поменять в `frontend/src/core/api/errors.ts`:

- **Коды стали `SCREAMING_SNAKE`** — `not_found` → `NOT_FOUND`, `conflict` → `CONFLICT`,
  `unauthorized` → `UNAUTHORIZED`, `validation_error` → `VALIDATION_ERROR` и так далее.
  Это касается и `notes`, и `ai`, а не только авторизации.
- **`getFieldErrors` читает `details` как список `{loc, msg}`** — теперь это плоский
  объект `fields`. Пока не поправить, ошибки полей в формах просто не отрисуются,
  без всякой ошибки в консоли:

  ```ts
  const getFieldErrors = (error: unknown) => toApiError(error).fields ?? {};
  ```

- `message` присутствует у **всех** ошибок, включая `UNAUTHORIZED` и `FORBIDDEN`,
  так что текущая проверка `typeof error.message === "string"` продолжит работать.

Сообщения в `fields` — готовые русские строки, их можно показывать как есть.
Ключи — camelCase, ровно как поля запроса (`companyName`, `contactPhone`).

Коды, которые отдаёт авторизация: `VALIDATION_ERROR` (422), `EMAIL_TAKEN` (409),
`INVALID_CREDENTIALS` (401), `UNAUTHORIZED` (401), `FORBIDDEN` (403).
`fields` есть только у `VALIDATION_ERROR`.

## 5. Удалённые эндпоинты

`POST /api/v1/auth/register` и `POST /api/v1/auth/login/json` больше не существуют —
регистрация стала ролевой. `frontend/src/modules/auth/api/auth.ts` нужно перевести
на новые пути; форма регистрации распадается на две (бизнес и студент).

`GET /api/v1/users/me` и форменный `POST /api/v1/auth/login` пока живы, но помечены
legacy — они нужны кнопке Authorize в Swagger. Не закладывайтесь на них.

## 6. Про деплой — прочитать до того, как выкатывать

Cookie ставится с `SameSite=Lax`. В разработке это работает: `localhost:5173` и
`localhost:8000` считаются одним сайтом (порт на это не влияет).

**Но между разными доменами `Lax`-cookie не отправляется вообще.** Если фронт уедет
на `*.vercel.app`, а API на другой домен, авторизация будет работать локально и
молча ломаться на демо. Варианты: общий домен (или поддомены одного домена), либо
`AUTH_COOKIE_SAMESITE=None` + `ENV=prod` на бэкенде (тогда нужен HTTPS, потому что
браузеры принимают `SameSite=None` только с флагом `Secure`).

Скажите заранее, какой вариант — это одна переменная окружения на нашей стороне.

## 7. Если увидите «CORS error» на `/api/auth/*`

Скорее всего это не CORS. Необработанное исключение на бэкенде отдаётся обработчиком,
который стоит снаружи CORS-middleware, поэтому настоящая ошибка 500 приходит в браузер
без заголовка `Access-Control-Allow-Origin` и выглядит как проблема CORS.
Напишите нам — причина будет видна в логе uvicorn.
