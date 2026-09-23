# Задача: Пользователи — список, поиск, фильтр, сортировка (Frontend, этап 1)

## Цель
Появляется страница `/users`, открытая без авторизации: таблица пользователей с пагинацией по 20 записей, поиском с дебаунсом, фильтром по статусу и сортировкой по трём колонкам. Этап закрывает только чтение (`GET /api/users`); мутации — этап 2 (`tasks/users-frontend-2.md`).

## Контракт API

Базовый путь — `/api/users` (не `/api/v1`, см. «Решения и ограничения»). Все поля объекта пользователя в camelCase.

### Объект пользователя

```json
{
  "id": 1,
  "firstName": "Иван",
  "lastName": "Петров",
  "email": "ivan@example.com",
  "phone": "+77011234567",
  "gender": "male",
  "status": "active",
  "createdAt": "2026-09-23T10:00:00Z"
}
```

`gender`: `male` | `female` | `unknown`. `status`: `active` | `blocked`. `createdAt` — ISO 8601 UTC.

### Формат ошибки

```json
{ "error": { "code": "VALIDATION_ERROR", "fields": { "phone": "INVALID_FORMAT", "email": "REQUIRED" } } }
```

```json
{ "error": { "code": "EMAIL_TAKEN" } }
```

`fields` присутствует только у `VALIDATION_ERROR`. Поля `message` в этом контракте нет.

### GET /api/users

Query: `page` (>=1, по умолчанию 1), `limit` (по умолчанию 20), `q` (подстрока поиска), `status` (`active` | `blocked`; отсутствует = все), `sort` (`lastName` | `email` | `createdAt`), `order` (`asc` | `desc`).

Response 200:

```json
{
  "items": [ { "id": 1, "firstName": "Иван", "lastName": "Петров", "email": "ivan@example.com", "phone": "+77011234567", "gender": "male", "status": "active", "createdAt": "2026-09-23T10:00:00Z" } ],
  "total": 57,
  "page": 1,
  "limit": 20
}
```

Ошибки: `400 VALIDATION_ERROR` — невалидный параметр запроса.

### POST /api/users

Request: `{ firstName, lastName, email, phone, gender }`.
Response 201 — объект пользователя.
Ошибки: `400 VALIDATION_ERROR`; `409 EMAIL_TAKEN`.

### PATCH /api/users/{id}

Request — подмножество полей создания, например `{ "phone": "+77017654321", "email": "petrov@example.com" }`.
Response 200 — объект пользователя.
Ошибки: `400 VALIDATION_ERROR`; `404 USER_NOT_FOUND`; `409 EMAIL_TAKEN`.

### DELETE /api/users/{id}

Response 204 — пустое тело.
Ошибки: `404 USER_NOT_FOUND`.

### POST /api/users/{id}/block

Response 200 — объект пользователя со `"status": "blocked"`.
Ошибки: `404 USER_NOT_FOUND`; `409 ALREADY_BLOCKED`.

### POST /api/users/{id}/unblock

Response 200 — объект пользователя со `"status": "active"`.
Ошибки: `404 USER_NOT_FOUND`; `409 NOT_BLOCKED`.

## Затрагиваемые файлы

Ядро и общие слои:

- `frontend/src/core/api/types.ts` — изменить: `ApiErrorBody.error.message` сделать необязательным, добавить `error.fields?: Record<string, string>`; в `ApiError` добавить `fields?: Record<string, string>`.
- `frontend/src/core/api/errors.ts` — изменить: `hasErrorBody` должен принимать тело с `error.code` и без `message`; `toApiError` переносит `fields` в `ApiError` и подставляет `message` из `STATUS_CODES`, когда его нет. Добавить `getApiErrorFields(error): Record<string, string>`.
- `frontend/src/core/api/index.ts` — изменить: экспортировать `getApiErrorFields`.
- `frontend/src/core/env.ts` — изменить: добавить `VITE_USE_MOCKS` (строка `"true"`/`"false"`, по умолчанию `"false"`, приводится к boolean).
- `frontend/.env.example` — изменить: добавить `VITE_USE_MOCKS=true`.
- `frontend/src/core/main.tsx` — изменить: перед рендером, если `env.VITE_USE_MOCKS`, динамически импортировать и запустить MSW-воркер.
- `frontend/src/common/styles/classes.ts` — изменить: добавить `skeleton`, `tableHeadCell`, `tableCell` (строки классов, встречающиеся более одного раза).
- `frontend/src/common/components/ui/badge.tsx` — новый: cva-примитив `Badge` с вариантами `success` / `destructive` / `muted`, `rounded-md`, без тени.
- `frontend/src/common/components/ui/select.tsx` — новый: нативный `<select>` с классом `field` (без radix; см. «Решения»).
- `frontend/src/common/components/ui/index.ts` — изменить: реэкспорт `Badge`, `Select`.

Моки:

- `frontend/src/mocks/browser.ts` — новый: `setupWorker(...handlers)`.
- `frontend/src/mocks/users.data.ts` — новый: 57 сгенерированных пользователей (совпадает с `total` из примера контракта).
- `frontend/src/mocks/users.handlers.ts` — новый: обработчики всех шести эндпоинтов контракта поверх in-memory массива.
- `frontend/public/mockServiceWorker.js` — новый: генерируется командой `npx msw init public/`.

Модуль пользователей:

- `frontend/src/modules/users/api/users.ts` — новый: типы `User`, `UsersQuery`, `UsersPage`, `UserCreate`, `UserUpdate` и функции `listUsers`, `createUser`, `updateUser`, `deleteUser`, `blockUser`, `unblockUser` (этап 1 использует только `listUsers`, остальные заводятся сразу, чтобы этап 2 не трогал этот файл).
- `frontend/src/modules/users/queryKeys.ts` — новый: `usersKeys` по фабрике `.all/.lists()/.list(query)/.details()/.detail(id)`.
- `frontend/src/modules/users/hooks/useUsers.ts` — новый: `useQuery` + `keepPreviousData`.
- `frontend/src/modules/users/hooks/useDebouncedValue.ts` — новый: дебаунс значения на N мс.
- `frontend/src/modules/users/hooks/useUsersQueryState.ts` — новый: состояние `page/q/status/sort/order` и переходы между ними.
- `frontend/src/modules/users/helpers.ts` — новый: чистые функции — `formatCreatedAt`, `genderLabelKey`, `statusLabelKey`, `toListParams`, `nextSort`.
- `frontend/src/modules/users/components/UsersToolbar.tsx` — новый: поле поиска + селект статуса.
- `frontend/src/modules/users/components/UsersTable.tsx` — новый: таблица, сортируемые заголовки, колонка действий (на этапе 1 — пустая ячейка-заглушка).
- `frontend/src/modules/users/components/UsersTableSkeleton.tsx` — новый: 5 строк-скелетонов.
- `frontend/src/modules/users/components/UsersPagination.tsx` — новый: нумерованные страницы + «Всего: {total}».
- `frontend/src/modules/users/pages/UsersPage.tsx` — новый: сборка состояний loading / empty / error / success.
- `frontend/src/modules/users/index.ts` — новый: публичный баррель модуля.
- `frontend/src/core/router/appRoutes.tsx` — изменить: маршрут `users` в ветке без `RequireAuth` (рядом с `contact`).
- `frontend/src/common/components/TopBar.tsx` — изменить: пункт `{ to: "/users", key: "nav.users" }` в массиве `NAV`.
- `frontend/public/locales/{ru,en,kk}/translation.json` — изменить: ветка `users.*` и ключ `nav.users`.
- `frontend/package.json` — изменить: `msw` в `devDependencies`.

## Образцы в коде

- `frontend/src/modules/notes/` — эталон структуры модуля целиком: `api/notes.ts` → `queryKeys.ts` → `hooks/use*.ts` → `components/` → `pages/` → `index.ts`. Повторить ровно эту раскладку.
- `frontend/src/modules/notes/hooks/useNotes.ts` — `useQuery` с `placeholderData: keepPreviousData`, чтобы предыдущая страница оставалась на экране; `useUsers` делается так же.
- `frontend/src/modules/notes/queryKeys.ts` — фабрика ключей; `usersKeys.list(query)` должен включать весь объект фильтров, иначе смена `q`/`status`/`sort` не вызовет новый запрос.
- `frontend/src/modules/notes/pages/NotesPage.tsx` — разбор состояний `isPending` / `isError` (текст + кнопка «Повторить» через `refetch()`) / пусто / данные; `Page` → `Section` → контент; `Footer` в конце.
- `frontend/src/modules/notes/components/Pagination.tsx` — как модуль держит собственный пагинатор; **не переиспользовать** его (он offset-based и prev/next), но взять оттуда `tabular-nums` для чисел и `disabled` при `isPlaceholderData`.
- `frontend/src/common/components/ui/button.tsx` — образец cva-примитива для нового `Badge`.
- `frontend/src/core/api/dates.ts` — `parseApiDate` корректно разбирает и `Z`, и наивные timestamp'ы; `formatCreatedAt` строится поверх неё, а не поверх `new Date()`.
- `frontend/src/core/api/errors.ts` — `getFieldErrors` показывает, как из ошибки достают карту полей; `getApiErrorFields` — её аналог для нового формата.
- `frontend/src/modules/system/api/health.ts` — единственное место, где запрос уходит мимо `/api/v1`: в `apiClient.get()` передаётся абсолютный URL (`${API_URL}/health`), и axios игнорирует `baseURL`. Тот же приём нужен для `/api/users`.

## Шаги

1. Расширить формат ошибки в ядре: в `core/api/types.ts` сделать `message` необязательным в `ApiErrorBody` и добавить `fields`; в `core/api/errors.ts` поправить `hasErrorBody` (условие — наличие строкового `error.code`, а не `error.message`), в `toApiError` подставлять `message` из `STATUS_CODES[status]`, когда его нет, и прокидывать `fields`. Добавить `getApiErrorFields`. Экспортировать её из `core/api/index.ts`. **`getFieldErrors` не менять** — на ней держатся формы в `notes` и `auth`.
2. Добавить `VITE_USE_MOCKS` в `core/env.ts` и `.env.example`. Значение — строка, в `env` отдаётся уже как boolean.
3. Установить `msw` в devDependencies, сгенерировать воркер (`npx msw init public/ --save`), создать `src/mocks/users.data.ts` (57 записей: перемешанные фамилии/имена, оба `status`, все три `gender`, `createdAt` в разные даты), `src/mocks/users.handlers.ts` (все шесть эндпоинтов контракта: фильтрация по `q` по `firstName`/`lastName`/`email` без учёта регистра, фильтр `status`, сортировка по `sort`+`order`, срез по `page`/`limit`, ответы-ошибки в формате контракта) и `src/mocks/browser.ts`. Пути в обработчиках задавать шаблоном `*/api/users` — запросы уходят с абсолютным URL на origin бэкенда, и относительный путь их не перехватит. Запускать воркер в `core/main.tsx` до `createRoot`, только при `env.VITE_USE_MOCKS`.
4. Добавить примитивы: `Badge` (cva, варианты `success`/`destructive`/`muted` на токенах `--success`/`--destructive`/`--muted`, `rounded-md`, без тени) и `Select` (нативный `<select>` с классом `field` и `aria-invalid`-поддержкой). Реэкспортировать из `common/components/ui/index.ts`. В `common/styles/classes.ts` добавить `skeleton` (`animate-pulse rounded-md bg-muted`), `tableHeadCell`, `tableCell`.
5. Создать `modules/users/api/users.ts`: типы по контракту (camelCase, без маппинга в snake_case) и шесть функций. Все запросы идут через `apiClient`, но с абсолютным URL — константа `USERS_API_URL` (склейка `API_URL` из `@/core/api` и `/api/users`) объявляется в этом файле. Так сохраняются интерцепторы (нормализация ошибок), а путь остаётся `/api/users` по контракту. Приём тот же, что в `modules/system/api/health.ts`.
6. Создать `modules/users/queryKeys.ts` и `modules/users/helpers.ts`. В `helpers.ts`: `toListParams(state)` (выбрасывает `status`, когда фильтр «Все»; не шлёт `sort`/`order`, когда сортировка не выбрана), `nextSort(current, field)` (первый клик — `asc`, повторный — переключение `order`), `formatCreatedAt(iso)` → `ДД.ММ.ГГГГ` поверх `parseApiDate`, `genderLabelKey(gender)` и `statusLabelKey(status)` → ключи i18n. Формат даты фиксированный и **не** зависит от языка интерфейса.
7. Создать `hooks/useDebouncedValue.ts` (300 мс) и `hooks/useUsersQueryState.ts`: держит `page`, `q`, `status`, `sort`, `order`; любые сеттеры `q`/`status`/`sort` сбрасывают `page` в 1; наружу отдаёт уже дебаунснутый `q` для запроса и сырой — для инпута.
8. Создать `hooks/useUsers.ts`: `useQuery({ queryKey: usersKeys.list(params), queryFn: () => listUsers(params), placeholderData: keepPreviousData })`.
9. Собрать `UsersToolbar` (инпут поиска + `Select` со значениями «Все»/«Активные»/«Заблокированные»), `UsersTableSkeleton` (5 строк) и `UsersTable`: колонки Имя, Фамилия, Email, Телефон, Пол, Статус, Дата создания, Действия; заголовки «Фамилия», «Email», «Дата создания» — кнопки с иконкой `ArrowUp`/`ArrowDown` (`lucide-react`) у активного поля; пол и статус через `Badge` и ключи из `helpers.ts`. Колонка «Действия» на этом этапе рендерит пустую ячейку — её наполняет этап 2.
10. Собрать `UsersPagination`: номера страниц из `Math.ceil(total / limit)`, активная страница выделена, слева «Всего: {total}» (`tabular-nums`), кнопки блокируются при `isPlaceholderData`.
11. Собрать `UsersPage`: `Page` → `Section` (заголовок и описание через `pageTitle`/`pageDescription` в `prose`-стеке) → `UsersToolbar` → состояния: `isPending` → `UsersTableSkeleton`; `isError` → текст «Не удалось загрузить список» + кнопка «Повторить» (`refetch()`); `total === 0` → «Пользователи не найдены»; иначе таблица + пагинация. В конце `Footer`.
12. Завести барrель `modules/users/index.ts` (`UsersPage`, хуки, `usersKeys`, типы), добавить маршрут `users` в `core/router/appRoutes.tsx` **вне** ветки `RequireAuth` и пункт меню в `TopBar`.
13. Добавить строки в `public/locales/ru/translation.json` (ветка `users.*`, `nav.users`) и продублировать структуру в `en` и `kk`. Casing в переводах не зашивать, ключи заголовков именовать `*.title`.
14. Прогнать `npm run lint` и `npm run typecheck`.

## Решения и ограничения

- **Базовый путь `/api/users` вместо `/api/v1/users`.** Контракт задан без версии, а `apiClient` смонтирован на `/api/v1`. Передаём абсолютный URL через одну константу `USERS_API_URL` внутри `modules/users/api/users.ts` — axios в этом случае игнорирует `baseURL`, а интерцепторы (Bearer, нормализация ошибок, 401) продолжают работать. Так уже сделано в `modules/system/api/health.ts`. Если бэкенд встанет на `/api/v1/users`, правка — одна константа.
- **Формат ошибки правим в ядре, а не в модуле.** Текущий `hasErrorBody` требует `error.message`; тело контракта его не содержит, поэтому `toApiError` упал бы в fallback и потерял `code` и `fields`. Правка обратно совместима: старые ответы бэкенда (`code` + `message` + `details`) разбираются как прежде.
- **camelCase без маппинга.** В `notes`/`auth` поля snake_case, потому что так отдаёт текущий бэкенд. Контракт этой задачи — camelCase, слой преобразования не вводим: лишний маппинг спрятал бы расхождение с контрактом.
- **Свой тип страницы.** `Page<T>` из `core/api/types.ts` — это `{items,total,limit,offset}`, контракт — `{items,total,page,limit}`. Заводим локальный `UsersPage` в модуле; `Page<T>` **не трогать** — на нём висит `notes`.
- **Свой пагинатор.** `modules/notes/components/Pagination.tsx` — offset-based prev/next; контракт требует номера страниц. Новый компонент живёт в `modules/users`, старый не менять.
- **MSW вместо самодельного мок-слоя.** Мокает на уровне сети, поэтому `api/users.ts` и хуки одинаковы для моков и реального API — «подключить API» сводится к `VITE_USE_MOCKS=false`. Сценарии «вернуть 500 / 404 / 409» проверяются правкой одного обработчика. Альтернатива (подмена функций в `api/users.ts` по флагу) требовала бы отдельного механизма форсирования ошибок и оставляла бы мок-код в продовом пути.
- **`Select` — нативный, без radix.** В проекте нет ни одного radix-компонента кроме `Slot`; нативный `<select>` с классом `field` закрывает требование и не добавляет зависимость. `@radix-ui/react-dialog` в этапе 2 добавляется потому, что модалку нативно не сделать доступной.
- **Страница открыта всем** — маршрут ставится рядом с `contact`, не внутри `RequireAuth`. Ролей и проверок прав не добавлять.
- **Что не трогать:** `core/api/errors.ts::getFieldErrors`, `core/api/types.ts::Page`, `modules/notes/**`, `modules/auth/**`, `modules/dashboard/stores/useAppStore.ts`.
- **Визуальные правила** (из `frontend/AGENTS.md`): никаких теней и сырых цветов Tailwind — только токены; `font-mono` допустим лишь для чисел (`total`, телефон); `uppercase` только для `metaLabel`; заголовок секции идёт в проп `title` у `Section`, а не в `children`; радиусы — из шкалы `--radius`; проверить раскладку на 1920px.

## Критерии готовности

- `npm run lint` и `npm run typecheck` в `frontend/` завершаются без ошибок.
- `npm run build` в `frontend/` завершается успешно.
- При `VITE_USE_MOCKS=true` и `npm run dev` открытие `http://localhost:5173/users` без токена в `localStorage` показывает страницу, а не редирект на `/login`.
- На `/users` в таблице 20 строк, в подписи «Всего: 57», в панели 3 номера страниц.
- Клик по «2» → в Network один запрос с `page=2`, в таблице следующие 20 записей.
- Во время первой загрузки в DOM 5 строк-скелетонов; при пустом результате — текст «Пользователи не найдены».
- Временная правка обработчика `GET /api/users` в `src/mocks/users.handlers.ts` на статус 500 → на странице «Не удалось загрузить список» и кнопка «Повторить»; клик по ней отправляет новый запрос.
- Ввод «петр» в поиск: за 300 мс после последнего символа уходит ровно один запрос, в нём `q=петр`; `page` в запросе равен 1 даже если до этого была открыта страница 3.
- Выбор «Заблокированные» → в запросе `status=blocked`, в таблице только бейджи «Заблокирован».
- Два клика по заголовку «Email» → в первом запросе `sort=email&order=asc`, во втором `sort=email&order=desc`; у заголовка стрелка вниз.
- Значения `gender` отрисованы как «Мужской» / «Женский» / «Не указан», `createdAt` — как `23.09.2026`.
- Переключение языка в `TopBar` на `en` и `kk` не даёт пустых строк и `users.*` в интерфейсе.
- При `VITE_USE_MOCKS=false` и поднятом бэкенде (`make infra` + `make backend` из корня) страница показывает данные из реального `GET /api/users`.

Команды:

```bash
cd frontend && npm run lint && npm run typecheck && npm run build
```

```bash
cd frontend && npm run dev
```

## Открытые вопросы

- **Версия пути.** Контракт — `/api/users`, весь остальной фронт ходит в `/api/v1`. Допущение в плане: реализуем ровно по контракту, `/api/users`, через абсолютный URL. Нужно подтверждение от бэкенда, иначе правка на релизе.
- **Мок-слой.** План исходит из того, что добавление `msw` в devDependencies согласовано. Если новую зависимость добавлять нельзя — мок-слой переносится в `modules/users/api/` с подменой функций по флагу, и критерии «вернуть 500/404 в моке» переформулируются.
- **Переводы en / kk.** Строки в задаче даны только по-русски. Допущение: в `ru` кладём их дословно, в `en` — рабочий перевод, `kk` заполняем осмысленно, но эти два локаля нужно вычитать носителю.
- **Значение `q` для поиска.** Контракт не говорит, по каким полям ищет бэкенд. Мок ищет по `firstName`, `lastName`, `email`; на реальном API поведение может отличаться — на фронте это ни на что не влияет.
- **Часовой пояс даты.** `createdAt` приходит в UTC, `ДД.ММ.ГГГГ` считается по локальному времени браузера, поэтому у пользователя в UTC+6 полуночная дата сдвинется на сутки. Допущение: для демо это приемлемо; если нет — форматировать по UTC-компонентам.
