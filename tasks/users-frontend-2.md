# Задача: Пользователи — создание, редактирование, удаление, блокировка (Frontend, этап 2)

## Цель
На реализованную страницу `/users` (этап 1, `tasks/users-frontend-1.md`) добавляются мутации: создание и редактирование пользователя в модалке, удаление с подтверждением, блокировка и разблокировка прямо из строки таблицы. Каждая операция показывает тост и приводит список в актуальное состояние по ответу сервера.

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

## Что уже готово с этапа 1

Проверено в коде — переделывать не нужно:

- `frontend/src/modules/users/api/users.ts` — все шесть функций (`listUsers`, `createUser`, `updateUser`, `deleteUser`, `blockUser`, `unblockUser`) и типы `User`, `UserCreate`, `UserUpdate = Partial<UserCreate>`, `Gender`, `UserStatus` уже написаны.
- `frontend/src/core/api/errors.ts` — `getApiErrorFields(error): Record<string, string>` есть и экспортируется из `@/core/api`; `toApiError` уже кладёт `fields` в `ApiError`.
- `frontend/src/mocks/users.handlers.ts` — обработчики `POST`, `PATCH`, `DELETE`, `block`, `unblock` уже возвращают `VALIDATION_ERROR` с `fields`, `EMAIL_TAKEN`, `USER_NOT_FOUND`, `ALREADY_BLOCKED`, `NOT_BLOCKED` по контракту. Мок-данные живут в памяти и мутируются, поэтому список после мутации меняется по-настоящему.
- `frontend/src/common/components/ui/select.tsx`, `badge.tsx` — примитивы для поля «Пол» и бейджа статуса.
- `frontend/src/modules/users/components/UsersTable.tsx` — колонка «Действия» существует и рендерит пустой `<td>` с комментарием `{/* Row actions land here in stage 2. */}`.
- `frontend/src/modules/users/hooks/useUsersQueryState.ts` — отдаёт `page` и `changePage`, которыми делается откат на предыдущую страницу.

## Затрагиваемые файлы

Общие примитивы и инфраструктура:

- `frontend/src/common/components/ui/dialog.tsx` — новый: обёртка над `@radix-ui/react-dialog` (`Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogFooter`) в стиле проекта: `bg-card`, `border`, `rounded-lg`, без тени.
- `frontend/src/common/components/ui/spinner.tsx` — новый: `Loader2` из `lucide-react` с `animate-spin`, размер наследуется от кнопки.
- `frontend/src/common/components/ui/index.ts` — изменить: реэкспорт диалога и спиннера рядом с уже имеющимися `Badge`, `Button`, `Card`, `Select`.
- `frontend/src/modules/toast/stores/useToastStore.ts` — новый: zustand-стор очереди (`items`, `push(message, variant?)`, `dismiss(id)`, автоудаление).
- `frontend/src/modules/toast/components/Toaster.tsx` — новый: рендер очереди в фиксированном контейнере.
- `frontend/src/modules/toast/index.ts` — новый: баррель (`Toaster`, `useToastStore`, `toast`).
- `frontend/src/core/main.tsx` — изменить: смонтировать `<Toaster />` внутри `ThemeProvider` рядом с `<BrowserRouter>`. Функцию `startMocks` и порядок рендера не трогать.
- `frontend/package.json` — изменить: `@radix-ui/react-dialog` в `dependencies`.

Модуль пользователей:

- `frontend/src/modules/users/hooks/useCreateUser.ts` — новый.
- `frontend/src/modules/users/hooks/useUpdateUser.ts` — новый.
- `frontend/src/modules/users/hooks/useDeleteUser.ts` — новый.
- `frontend/src/modules/users/hooks/useUserStatus.ts` — новый: одна мутация с параметром `action: "block" | "unblock"`.
- `frontend/src/modules/users/helpers.ts` — изменить: добавить `PHONE_PATTERN`, `NAME_MAX_LENGTH`, `EMAIL_PATTERN`, `diffUserFields(initial, values)`, `fieldErrorKey(code)`. Существующие функции не трогать.
- `frontend/src/modules/users/components/UserFormDialog.tsx` — новый: модалка с формой на `react-hook-form`, режимы create / edit.
- `frontend/src/modules/users/components/DeleteUserDialog.tsx` — новый: подтверждение удаления.
- `frontend/src/modules/users/components/UserRowActions.tsx` — новый: три кнопки строки.
- `frontend/src/modules/users/components/UsersTable.tsx` — изменить: новые пропы (`onEdit`, `onDelete`, `pendingId`, `onToggleStatus`), в колонке «Действия» вместо пустого `<td>` — `UserRowActions`.
- `frontend/src/modules/users/pages/UsersPage.tsx` — изменить: кнопка «Добавить пользователя», состояние открытого диалога, откат на предыдущую страницу после опустошения последней.
- `frontend/src/modules/users/index.ts` — изменить: добавить экспорт новых хуков. **Существующие экспорты типов не удалять** — `src/mocks/users.data.ts` и `src/mocks/users.handlers.ts` импортируют `Gender`, `User`, `UserStatus`, `UserCreate`, `UsersSort`, `SortOrder` именно из этой баррели.
- `frontend/public/locales/{ru,en,kk}/translation.json` — изменить: ветки `users.form.*`, `users.actions.*`, `users.toast.*`, `users.errors.*` внутри существующего блока `users`.

## Образцы в коде

- `frontend/src/modules/notes/components/NoteForm.tsx` — эталон формы: `react-hook-form`, `aria-invalid={!!errors.x}` на инпуте (класс `field` сам превращает это в destructive-рамку), `setError` по ответу сервера, `root`-ошибка для всего, что не ложится на поле, `isSubmitting` на кнопке. Повторить механику, заменив `getFieldErrors` на `getApiErrorFields`.
- `frontend/src/modules/notes/hooks/useUpdateNote.ts` — `onSuccess` кладёт ответ сервера в кэш детали через `setQueryData` и инвалидирует списки; ровно это нужно `useUpdateUser` и `useUserStatus`.
- `frontend/src/modules/notes/hooks/useDeleteNote.ts` — `removeQueries` по детали + `invalidateQueries` по спискам.
- `frontend/src/modules/notes/hooks/useCreateNote.ts` — минимальная мутация с одной инвалидацией.
- `frontend/src/modules/notes/pages/NotesPage.tsx:33` — `useEffect`, отступающий на страницу назад, когда после удаления текущая страница опустела. Логика та же, но считать нужно в `page`, а не в `offset`, и опираться на `usersQuery.isPlaceholderData`.
- `frontend/src/modules/users/components/UsersToolbar.tsx` — как в этом модуле связаны `label` + `field` + `Select`; поля формы верстаются так же.
- `frontend/src/modules/theme/stores/useThemeStore.ts` — минимальный zustand-стор, образец для `useToastStore`; `frontend/src/modules/theme/index.ts` — раскладка модуля «стор + компонент + баррель», которую копирует `modules/toast`.
- `frontend/src/common/components/ui/badge.tsx` — свежий cva-примитив этого проекта; `dialog.tsx` и `spinner.tsx` пишутся в том же стиле (`forwardRef`, `displayName`, экспорт из баррели).
- `frontend/src/common/components/ui/button.tsx` — `disabled:pointer-events-none disabled:opacity-50` уже в базовых классах: для заблокированной кнопки достаточно пропа `disabled`.
- `frontend/src/common/components/ui/card.tsx` — поверхность `bg-card` + `border` + `rounded-lg` без тени; `DialogContent` повторяет её.

## Шаги

1. Добавить `@radix-ui/react-dialog` в `dependencies` и собрать `common/components/ui/dialog.tsx`: оверлей — `bg-background/80` с `backdrop-blur`, контент — по центру, `bg-card border rounded-lg p-6`, ширина задаётся снаружи (`max-w-xl` для формы). `DialogTitle` обязателен, иначе radix пишет предупреждение в консоль. Теней не добавлять. Рядом — `spinner.tsx`. Оба реэкспортировать из `common/components/ui/index.ts`.
2. Создать модуль `modules/toast` по раскладке `modules/theme`: стор с массивом `{ id, message, variant }`, `push` ставит таймер на автоудаление (~4 с), `dismiss` снимает вручную. `Toaster` рисует стек в правом нижнем углу (`fixed`, `z-50`, `gap`), каждый тост — `bg-card border rounded-md`, вариант `destructive` подсвечивает рамку и текст токеном `--destructive`. Смонтировать `<Toaster />` в `core/main.tsx` внутри `ThemeProvider`.
3. Дописать в `modules/users/helpers.ts`: `PHONE_PATTERN = /^\+7\d{10}$/`, `NAME_MAX_LENGTH = 50`, `EMAIL_PATTERN`; `diffUserFields(initial, values): UserUpdate` — только изменившиеся поля (строки сравнивать после `trim`); `fieldErrorKey(code)` — `REQUIRED` и `INVALID_FORMAT` в ключи i18n, для любого другого кода общий ключ `users.errors.invalidValue`.
4. Создать `hooks/useCreateUser.ts`, `useUpdateUser.ts`, `useDeleteUser.ts`, `useUserStatus.ts`. Во всех `onSuccess` — `invalidateQueries({ queryKey: usersKeys.lists() })`. В `useUpdateUser` и `useUserStatus` дополнительно `setQueryData(usersKeys.detail(user.id), user)`. `useUserStatus` принимает `{ id, action }` и вызывает `blockUser`/`unblockUser`. Оптимистичных обновлений не делать.
5. Собрать `UserFormDialog` с пропами `open`, `user?: User`, `onOpenChange`. Поля: Имя, Фамилия, Email, Телефон, Пол (`Select` со значениями `male`/`female`/`unknown` и подписями из `users.gender.*`). Клиентская валидация до отправки: все поля обязательны, имя и фамилия 1–`NAME_MAX_LENGTH` символов, email по `EMAIL_PATTERN`, телефон по `PHONE_PATTERN`; под полем телефона — подсказка `+7XXXXXXXXXX`.
6. Разделить режимы в `UserFormDialog`: без `user` — `useCreateUser` и весь объект формы; с `user` — `defaultValues` из строки, отправляется результат `diffUserFields`, кнопка «Сохранить» заблокирована, когда diff пустой. Опираться именно на diff, а не на `formState.isDirty`: RHF считает поле грязным и после возврата к исходному значению.
7. Обработка ответа в форме: `getApiErrorFields(err)` → на каждое поле `setError(name, { message: t(fieldErrorKey(code)) })`; `code === "EMAIL_TAKEN"` → `setError("email", ...)` с «Email уже занят» и модалка остаётся открытой; `code === "USER_NOT_FOUND"` (только режим редактирования) → закрыть модалку, тост «Пользователь не найден», инвалидация списков; всё прочее → `setError("root", ...)`. Успех — закрыть модалку, тост «Пользователь создан» / «Изменения сохранены». Во время запроса кнопка «Сохранить» `disabled` и показывает спиннер.
8. Собрать `DeleteUserDialog`: `DialogTitle` — «Удалить пользователя {Имя} {Фамилия}?», кнопки «Удалить» (`variant="destructive"`) и «Отмена». На время запроса «Удалить» `disabled` + спиннер. `404` → тост «Пользователь не найден» + инвалидация; успех → закрыть, тост «Пользователь удалён», инвалидация.
9. Собрать `UserRowActions` с пропами `user`, `onEdit`, `onDelete`, `isPending`: «Редактировать»; «Заблокировать» при `status === "active"` и «Разблокировать» при `status === "blocked"` (вызывает `useUserStatus`); «Удалить». Кнопки — `Button` размера `sm`, вариант `ghost`/`outline`; блокируется и показывает спиннер только та строка, чей `id` сейчас в мутации. Ошибки статуса: `409` (`ALREADY_BLOCKED` или `NOT_BLOCKED`) → тост «Статус уже изменён» + инвалидация; `404` → тост «Пользователь не найден» + инвалидация; успех → тост «Пользователь заблокирован» / «Пользователь разблокирован», бейдж и подпись кнопки перерисовываются по ответу.
10. Обновить `UsersTable`: добавить пропы `onEdit`, `onDelete`, `pendingId`, заменить пустой `<td className={tableCell} />` на ячейку с `UserRowActions`. Остальную разметку, сортируемые заголовки и бейджи не трогать.
11. Обновить `UsersPage`: кнопка «Добавить пользователя» в одной строке с `UsersToolbar` (не `justify-between` на всю ширину — ряд ограничить, см. `AGENTS.md`); состояние `dialog: { type: "create" | "edit" | "delete"; user?: User } | null`; `useEffect` по образцу `NotesPage`, который при `page.items.length === 0 && page.total > 0 && state.page > 1 && !usersQuery.isPlaceholderData` вызывает `state.changePage(state.page - 1)`.
12. Добавить строки в `public/locales/ru/translation.json` в существующий блок `users` и продублировать структуру в `en` и `kk`. Casing в переводы не зашивать; ключ, который рендерится заголовком диалога, называть `*.title`.
13. Прогнать `npm run lint`, `npm run typecheck`, `npm run build`.

## Решения и ограничения

- **Поля ошибок читаем через `getApiErrorFields`**, которая добавлена в ядро на этапе 1 и уже экспортируется из `@/core/api`. `getFieldErrors` разбирает FastAPI-шный `details` с `loc` — её не трогать, на ней держатся формы `notes` и `auth`.
- **«Сохранить» блокируется по diff, а не по `isDirty`.** `react-hook-form` помечает поле грязным при любом изменении, включая возврат к прежнему значению, — это разошлось бы с требованием «без изменений кнопка заблокирована».
- **Оптимистичных обновлений нет.** После каждой мутации список инвалидируется, строку обновляет ответ сервера. Так критерий «список перезапрошен» проверяется напрямую и не нужен откат при ошибке.
- **Состояние загрузки привязано к строке** через `pendingId`: блокируется только нажатая кнопка. В `NoteList` мутация блокирует все карточки сразу — в таблице на 20 строк это выглядит как зависание всей страницы.
- **Свой тост вместо библиотеки.** `sonner` и `react-hot-toast` тянут собственные тени и палитру, что прямо запрещено дизайн-системой (`frontend/AGENTS.md`: теней нет, цвет только через токены). Модуль на zustand повторяет раскладку `modules/theme` и обходится без новой зависимости.
- **`@radix-ui/react-dialog` добавляем.** Доступная модалка — это фокус-ловушка, `Esc`, `aria-modal`, возврат фокуса и блокировка скролла; вручную это воспроизводится плохо, а radix в проекте уже есть (`@radix-ui/react-slot`).
- **Мок-обработчики не переписывать** — они уже соответствуют контракту. Сценарии ошибок для проверки форсируются временной правкой конкретного обработчика, которая откатывается перед сдачей.
- **Восстановление удалённых пользователей и проверка ролей в объём не входят** — кнопок «Восстановить» и проверок прав не добавлять.
- **Что не трогать:** `core/api/errors.ts::getFieldErrors`, `core/api/types.ts::Page`, `modules/users/api/users.ts`, `modules/users/queryKeys.ts`, `modules/users/hooks/useUsers.ts`, `modules/notes/**`, `modules/auth/**`, `modules/dashboard/stores/useAppStore.ts`.
- **Визуальные правила** (`frontend/AGENTS.md`): форма в диалоге — одна колонка, `field` остаётся `w-full`, ширину ограничивает `DialogContent`; никаких теней и сырых цветов Tailwind; заголовок диалога — `DialogTitle`, а не абзац с классами заголовка; радиусы — из шкалы `--radius`; проверить ряд с кнопкой «Добавить пользователя» на 1920px.

## Критерии готовности

- `npm run lint`, `npm run typecheck` и `npm run build` в `frontend/` завершаются без ошибок.
- Отправка пустой формы создания: под всеми пятью полями «Обязательное поле», в Network нет запроса `POST /api/users`.
- Телефон `87011234567` → под полем «Неверный формат», запроса нет; `+77011234567` проходит валидацию.
- Имя из 51 символа → сообщение о длине, запроса нет.
- Создание с email существующего пользователя (мок отвечает `409 EMAIL_TAKEN`) → под полем Email «Email уже занят», модалка открыта, тоста об успехе нет.
- Успешное создание → модалка закрыта, тост «Пользователь создан», в Network новый `GET /api/users`, новая запись видна в таблице.
- В модалке редактирования изменить только телефон → в теле `PATCH` ровно один ключ `phone`; после ответа в строке новый телефон, тост «Изменения сохранены».
- Открыть модалку редактирования и ничего не менять → «Сохранить» `disabled`; изменить поле и вернуть прежнее значение → снова `disabled`.
- Временно заменить тело обработчика `http.patch` в `src/mocks/users.handlers.ts` на `errorResponse(404, "USER_NOT_FOUND")` → модалка закрывается, тост «Пользователь не найден», уходит новый `GET /api/users`. Правку откатить.
- «Удалить» → «Отмена»: запроса `DELETE` нет, строка на месте.
- «Удалить» → подтверждение: строки нет, значение «Всего» уменьшилось на 1, тост «Пользователь удалён».
- Удалить единственную запись на последней странице (при 57 записях это страница 3 после удаления 16 записей) → открыта предыдущая страница, в запросе `page` на 1 меньше.
- «Заблокировать» → бейдж «Заблокирован» (destructive), подпись кнопки «Разблокировать», тост «Пользователь заблокирован»; обратное действие возвращает бейдж «Активен» и тост «Пользователь разблокирован».
- Временно заменить проверку статуса в обработчике `block` на безусловный `errorResponse(409, "ALREADY_BLOCKED")` → тост «Статус уже изменён» и новый `GET /api/users`. Правку откатить.
- Во время каждой мутации нажатая кнопка `disabled` и показывает спиннер; кнопки соседних строк остаются активными.
- Модалка закрывается по `Esc` и по клику вне контента; после закрытия фокус возвращается на кнопку, которая её открыла.
- Переключение языка в `TopBar` на `en` и `kk` не даёт пустых строк и сырых ключей `users.*`.
- При `VITE_USE_MOCKS=false` и поднятом бэкенде (`make infra` + `make backend` из корня) все пять операций проходят против реального API.

Команды:

```bash
cd frontend && npm run lint && npm run typecheck && npm run build
```

```bash
cd frontend && npm run dev
```

## Открытые вопросы

- **Телефон в моке валидируется мягче контракта.** В `src/mocks/users.handlers.ts` стоит `PHONE_RE = /^\+?\d{10,15}$/`, а контракт требует `^\+7\d{10}$`. Клиентская валидация строгая, поэтому в обычном сценарии расхождение не видно. Допущение: оставляем как есть; чтобы проверить серверный `INVALID_FORMAT`, нужно временно ослабить правило на форме. Если серверные сообщения о формате телефона важны — ужесточить регулярку в моке.
- **Поведение `gender` при редактировании.** Контракт `PATCH` допускает частичное обновление, но не уточняет, можно ли перевести пользователя в `unknown`. Допущение: можно, селект в режиме редактирования содержит все три значения.
- **Текст тоста для 409 по статусу.** Задача просит один текст «Статус уже изменён» и для `ALREADY_BLOCKED`, и для `NOT_BLOCKED`. Допущение: текст общий для обоих кодов.
- **Неизвестный код в `fields`.** Контракт перечисляет только `REQUIRED` и `INVALID_FORMAT`, но мок уже умеет отдавать `fields` и для параметров запроса. Допущение: любой другой код показывается как «Неверное значение»; полный список кодов стоит зафиксировать с бэкендом.
- **`VALIDATION_ERROR` без `fields`.** Формат ошибки это допускает. Допущение: показываем `root`-ошибку под формой, модалка остаётся открытой.
- **Позиция и время жизни тостов** дизайном не заданы. Допущение: правый нижний угол, автоскрытие через 4 секунды, стек сверху вниз.
