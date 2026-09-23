# AGENTS.md

Guidance for coding agents (Codex, Claude Code, etc.) working in this repository.

## What this is

A Vite + React 19 + TypeScript SPA: Tailwind 4, TanStack Query, zustand, i18next (react-i18next), axios. The active product is cookie-based business/student authentication over `/api/auth/*`, the task catalog (`/api/tasks`, `/api/industries`, saved tasks, business tasks) and the business task builder (`/api/business/tasks/*`). Development uses the FastAPI backend and PostgreSQL by default; the Vite mock server is opt-in. Node 22.12+, package manager is `yarn` (root `Makefile` uses it; `npm` scripts also work directly inside `frontend/`).

## Commands

```bash
yarn install --frozen-lockfile       # install deps
npm run dev                          # :5173, /api proxied to FastAPI :8000
AUTH_MOCKS=true npm run dev           # standalone in-memory auth/catalog mocks
npm run build                        # production build; no mock API
npm run preview                      # preview production assets; no mock API
npm run lint                         # ESLint src, dev, e2e and TS configs
npm run typecheck                    # TypeScript app, Node and E2E configs
npx playwright install chromium     # install the E2E browser once
npm run test:e2e                     # Playwright Chromium; starts Vite on :5180
API_PROXY_TARGET=http://127.0.0.1:8001 npm run test:e2e:real   # e2e/real against a running FastAPI with the demo seed; Vite on :5181
npm run format                       # Prettier src files
```

Run `lint` and `typecheck` before finishing any task. Both must pass. For authentication or catalog changes, also run `build` and the relevant Playwright tests. E2E tests cover cookie/session lifecycle, role guards, error states, validation, tags, the catalog (sort, filters, address state, pagination, task page, saving, business tasks), themes, locales and responsive widths; that suite uses mocks. `e2e/real` (`test:e2e:real`, `playwright.real.config.ts`) repeats the auth and catalog acceptance against FastAPI: run it after backend-facing changes, on a disposable seeded database, because it registers accounts.

## Architecture

```
src/
  common/
    components/layout/   Page, Section, Stack, Footer — layout primitives (barrel index.ts)
    components/ui/       shadcn-style primitives (button, card, badge, select, pagination, toaster, tooltip) via @radix-ui/react-slot + cva (barrel index.ts)
    lib/utils.ts          cn() — clsx + tailwind-merge; pageNumbers()
    lib/toast.ts          zustand toast queue + showToast(); rendered by <Toaster /> in core/App.tsx
    styles/classes.ts      shared className constants (pageTitle, sectionTitle, field, fieldLabel, ...)

  core/                   app infrastructure, not feature-specific
    api/client.ts          axios instance: baseURL = `/api`, withCredentials, JSON headers, normalized ApiError
    api/session.ts         session-expiry pub/sub + request version; removes legacy authToken at startup
    api/sse.ts               streamSse() — fetch-based SSE async generator (axios can't stream in-browser)
    api/errors.ts             toApiError / isApiError / getErrorMessage / getFieldErrors
    api/types.ts               Page<T>, ApiError, ApiErrorBody shared shapes
    query/                     QueryClient (staleTime 60s, gcTime 5m, retry:1) + QueryProvider
    router/appRoutes.tsx        single RouteObject tree, imports pages from module barrels
    env.ts                      zod-validated VITE_APP_ENV; VITE_API_URL retained for legacy health demo
    i18n.ts                     i18next + http-backend + languagedetector

  modules/                 feature modules
    auth/         typed cookie API, pure validation, in-memory user store, session bootstrap, role guards, forms, tags, section links
    catalog/      contract types, tasks/industries API, URL-state hook, catalog/task/saved/business-tasks pages, save button
    builder/      builder contract types and API, new-task page, builder page (analysis, clarification rounds, card editor, rating, publication)
    notes/        api/notes.ts (CRUD), hooks/useNotes* , components/{NoteForm,NoteList,Pagination}, pages/NotesPage
    ai/           api/chat.ts, hooks/{useChat,useChatStream}, components/ChatPanel.tsx, pages/ChatPage.tsx
    system/       api/health.ts, hooks/useHealth.ts, components/ApiStatus.tsx
    dashboard/    pages/{HomePage,ContactFormPage}, stores/useAppStore.ts
    theme/        ThemeProvider.tsx, components/ThemeToggle.tsx, stores/useThemeStore.ts

dev/authMock.ts            Vite-only middleware; accounts and HttpOnly sessions in memory; mounts the catalog mock
dev/catalogMock.ts         catalog endpoints over the auth mock's sessions; saved tasks in memory
dev/catalogData.ts         seed industries and tasks
dev/http.ts                JSON/error/cookie helpers shared by the mocks
e2e/                       Playwright browser scenarios (mock API)
e2e/real/                  mock-free acceptance against FastAPI; global setup checks /health and demo logins
playwright.config.ts       isolated mock dev server and Chromium configuration
```

Active product routes: `/login`, `/register/business`, `/register/student`; `/catalog` and `/catalog/:id` for both roles; `/business` (business "My tasks"), `/business/tasks/new` and `/business/tasks/:id/builder` (business only) and `/student` (student "Saved"). A student's home is `/catalog`, a business's is `/business` (`homeForUser`); `/` routes to login or that home, a role mismatch redirects home, and unknown and former demo routes redirect through `/`. The top bar shows `sectionLinks(role)` as `NavLink`s. Demo source modules remain in the repo but are absent from routing and navigation.

Each module follows the same internal layout: `api/<resource>.ts` (typed fetch fns over `apiClient`) → `queryKeys.ts` (key factory: `.all/.lists()/.list(filters)/.details()/.detail(id)`) → `hooks/use<Thing>.ts` (TanStack Query wrappers) → `components/` + `pages/` → public barrel `index.ts`.

## Conventions

- Path alias `@` → `src`, defined separately in `tsconfig.json`/`tsconfig.app.json` and `vite.config.ts` — keep both in sync when adding new alias roots.
- `no-restricted-imports` (see `eslint.config.js`) blocks `@/modules/*/*` deep imports and `@/common/components/{layout,ui}/*` / `@/common/styles/*` file imports — always go through the module/folder's barrel `index.ts`. Inside a module, use relative imports.
- `useAuthStore` holds `user`, bootstrap `status`, `setUser(user)` and `clearUser()` in memory. Never persist the user or authentication token in browser storage. The server owns the HttpOnly cookie; JavaScript must not read or write it.
- `AuthBootstrap` always obtains the initial session through TanStack Query and `getMe`. It withholds page rendering and redirects until lookup finishes. Initial 401 means guest; other failures show a retry screen.
- `skipAuth: true` suppresses global session-expiry handling for the initial `getMe` request; it does not disable cookies. Login failures with `INVALID_CREDENTIALS` belong to the form. A current-session `401 UNAUTHORIZED` from Axios or SSE emits a shared expiry event; 403 does not log out.
- Login/registration use the returned user without a second login or `me` request. Session transitions advance a request version, cancel outstanding queries, clear cross-user cache and synchronize the `me` cache/store. Stale responses must not restore a previous user or expire a newer session.
- Authentication mutations share a global transition lock so navigation between guest forms cannot send competing cookie-setting requests. Keep the lock until the mutation settles and use its pending state to disable submission across forms.
- Pure validation and contract types live in `modules/auth/validation.ts`, `modules/auth/types.ts` and `modules/catalog/types.ts`. The Node mocks import these files directly by relative path, avoiding the React module barrel; keep them independent of React, browser globals and application runtime code.
- Comments: only for non-obvious _why_ (a workaround, a subtle invariant, a constraint) — never restate _what_ the code already says. Default to no comment.
- Components hold only rendering/JSX logic; hooks hold only hook logic (state, effects, query/store wiring). Pull every pure function (formatting, calculations, mapping, validation) out into a `helpers.ts`/`utils.ts` inside the module (or `common/lib` if it's shared across modules) and import it in — don't inline that logic in a component or a hook body.

## Design system

Three layers. Put a rule in the lowest one that can hold it — a one-off `className` on a page is the layer of last resort, and a class string that appears twice belongs in `classes.ts`.

| Layer           | File                             | Holds                                                                     |
| --------------- | -------------------------------- | ------------------------------------------------------------------------- |
| Tokens          | `core/index.css`                 | colors, radius scale, fonts — `@theme inline` + `:root` / `.dark`         |
| Class constants | `common/styles/classes.ts`       | recurring class strings (`pageTitle`, `field`, `prose`, `metaLabel`, ...) |
| Primitives      | `common/components/{ui,layout}/` | `Button`, `Card`, `Page`, `Section`, `Stack`                              |

### Text order

Headings come first and descend: `<h1>`/`<h2>`, then the subheading, then body text. No small uppercase caption above a heading (the "eyebrow" pattern) — it looks like a heading but isn't one, so it breaks the document outline for screen readers. A section's heading goes through `Section`'s `title` prop (rendered as `<h2>`) and its subheading through `description` — never hand-written into `children`. Page heroes use `pageTitle`/`pageDescription` on their own `<h1>`/`<p>`.

### Typography

Inter, sentence case, no letter-spacing. `font-mono`, `uppercase` and `tracking-[...]` are **reserved**, not decorative:

| Treatment    | Allowed for                                                                                                       | Everything else |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | --------------- |
| `font-mono`  | machine output — stack traces, token counts, tabular numbers, the API badge                                       | Inter           |
| `uppercase`  | `metaLabel` (a chat role, a status caption), and two-letter codes like the `en`/`ru` switcher                     | sentence case   |
| `tracking-*` | `tracking-tight` on large headings, `tracking-wide` on `metaLabel`. Arbitrary `tracking-[...]` is banned outright | no tracking     |

Why: mono + uppercase + wide tracking on every label was this project's original look, and it reads as a technical demo rather than a product. Mono now carries meaning — "the machine produced this".

Localized strings are stored in sentence case; casing is never baked into a translation. A key that renders as a heading is named `*.title`, not `*.label` — key names must not contradict the rule above.

### Color

Every color goes through a token in `core/index.css`; there are no raw Tailwind palette classes anywhere in `src`. Status has its own tokens (`success`, `warning`, `caution`) next to `destructive`. `caution` is the yellow step between `warning` (orange) and `success`; the builder's four quality labels need all four.

The token set is contrast-checked **as a whole** — 24 pairs against WCAG AA. When you change a color token, re-check every pair it takes part in: text on its background, foreground on its fill, border against its surface, status dots at 3:1 or better.

Dark mode is not a flip of light mode. `--primary` is a deep blue in light and a light blue in dark, because a deep blue is unreadable on a near-black background; `--destructive` works the same way and its foreground inverts with it. `--card` sits one step off `--background` in dark so a card is visible at all — in light both are white and the border does the work.

`--chart-1..5` are a validated categorical scale (colorblind-safe adjacent pairs). Don't re-pick one to match a brand color: the set passes or fails together.

### Shape and depth

`--radius` (8px) is the single knob — the whole `rounded-*` scale is derived from it. Controls (buttons, inputs, badges, chat bubbles) use `rounded-md`; cards use `rounded-lg`, one step more. A nested element takes the next step **down**: the language switcher's inner segment is `rounded-xs` because it sits inside a `rounded-md` container with 2px of padding, and the inner radius has to be smaller by exactly that padding or the corners won't nest.

**No shadows.** Structure is carried by borders: `border` for surfaces, `border-t` / `divide-y` for separation. `border-color` is set globally in `index.css`, so a bare `border` already has the right color.

### Width and layout

Pages are full-bleed. `Page` is `w-full px-6 sm:px-10` with no `max-width`, and `TopBar`'s inner row carries the **same gutters** — that pairing is the app's only alignment contract, so change both or neither.

Width is then re-imposed per content type, never globally:

- **Prose** — `prose` (`max-w-3xl`) on the hero `Stack`. Title and lede must share one measure, or the block reads as a ragged L.
- **Forms** — a `Card` with `max-w-xl`. `field` is `w-full` by design; the cap belongs on the container, never on the field.
- **Reading surfaces** — the chat column is `max-w-4xl` and bubbles are `max-w-[60ch]`. Measure text in `ch`, not in `%` of the viewport.
- **Grids** — note cards span the full width: `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.

`flex justify-between` is a trap at full width — it pins two related things to opposite edges of a 1920px screen. Cap the row (`max-w-md`, `max-w-xs`) or lay it out differently. Always check a layout change at 1920px, not just at laptop width.

### Cards and forms

Cards are `bg-card` + `border` + `rounded-lg`, no shadow. They hold forms and the note grid — not page sections, which stay separated by `Section`'s rule.

Fields are boxed (`field`): border, `rounded-md`, `px-3 py-2`, primary border and ring on focus. The invalid state is driven by `aria-invalid={!!errors.x}` on the input, which `field` turns into a destructive border — that keeps the accessibility attribute and the visual in sync instead of threading an `isError` prop through every form.

## Authentication API and mocks

- Active API: `POST /api/auth/register/business`, `POST /api/auth/register/student`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Successful registration/login/lookup responses contain `{ user }`, unwrapped by `modules/auth/api/auth.ts`; logout returns 204/`void`.
- `User` is discriminated by `role: "business" | "student"`; `createdAt` and profile fields use camelCase and the other role's profile is `null`.
- Axios uses relative `/api`, `withCredentials: true` and JSON headers. SSE also includes credentials and uses the shared expiry event; its retained demo endpoint remains `/api/v1/ai/chat/stream`.
- Errors normalize to `{ status, code, message, fields?, details?, requestId? }`, preserving server messages and code case. `getFieldErrors` supports contract `fields` plus legacy FastAPI `details`. Field-level 409/422 errors stay in forms; preserve server text instead of translating it.
- `AUTH_MOCKS=false` is the default, including Docker Compose. Setting it to `true` opts into mocks only for Vite development serve. The plugin's `configureServer` middleware runs before the proxy; it is absent from production builds and `vite preview`. The old MSW worker is not started.
- The mock sets `access_token=<opaque session id>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`; logout clears the cookie and revokes the session. Accounts and expiring sessions are held in memory: page reload preserves login, Vite restart resets all registrations and sessions.
- Mock seed accounts: business `owner@zerno.kz` / `coffee2026` (Кофейня «Зерно»); student `arman@student.kz` / `arman2026` (Арман Сейтказы). Real backend seed uses the same emails with password `demo2026` for both. These credentials are development fixtures only.
- `AUTH_MOCKS=false` sends `/api` to `API_PROXY_TARGET` without rewriting the path. Local default: `http://127.0.0.1:8000`; Docker Compose: `http://api:8000`. These variables are Vite server settings without the `VITE_` prefix; authentication never uses `VITE_API_URL`.
- FastAPI implements the same cookie contract. Its cookie contains a JWT and logout clears the browser cookie; unlike the mock, it has no server-side revocation list. `ACCESS_TOKEN_EXPIRE_MINUTES=10080` configures the seven-day lifetime. Switch modes by signing in again; mock sessions and real JWTs are not interchangeable.
- Production hosting must route `/api` to the compatible backend and serve SPA fallback routes. Build and preview do not provide an authentication mock server.

## Catalog API and mocks

- Endpoints: `GET /api/industries`, `GET /api/tasks?sort&industry&level&page`, `GET /api/tasks/:id`, `POST|DELETE /api/tasks/:id/save`, `GET /api/me/saved-tasks`, `GET /api/business/tasks`. `modules/catalog/api/*` unwraps `{ items }` and `{ task }`; save/unsave return 204.
- Catalog sort, filters and page live in the address, parsed and built by pure helpers in `modules/catalog/helpers.ts`. `buildCatalogSearch` joins lists with a literal comma (`URLSearchParams` would write `%2C`) and omits defaults (`sort=rating`, `page=1`); the API always receives `sort` and `page`. Sort and filter changes return to page 1.
- Cards pass `{ catalogSearch }` as router state; the task page's back link rebuilds `/catalog<search>` from it and falls back to `/catalog`.
- Saving is not optimistic: the button is disabled until the 204, then `useToggleSave` patches every cached copy (catalog lists, task detail, saved list). Failures keep the old state and show a toast. The button renders only for students.
- Catalog queries do not retry 4xx (`retryUnlessClientError`). Level and the in-progress label are translated by `code`; industry and business-task status names come from the server.
- The catalog mock runs inside the auth mock plugin, so `AUTH_MOCKS` switches both. It validates query parameters (422 with `fields`), returns 401/403/404 per the contract, shows only `published`/`in_progress` tasks in the catalog and lets an owner open its draft. Seed: 26 tasks, 25 visible; Кофейня «Зерно» (the seed business) owns tasks 12 (published), 15 (draft) and 21 (in progress). Saved tasks are kept per user in memory until Vite restarts.
- A page past the end (a shared `?page=2` after the list shrank, or the 6-task demo seed) shows "На этой странице задач нет" with a way back to page 1 instead of an empty grid.
- FastAPI implements these endpoints against PostgreSQL. Its seed has 7 tasks (6 visible and an owner-only draft), with database-generated IDs; real-API tests must locate tasks by title/response rather than hardcode mock IDs (`e2e/real/helpers.ts` keeps the seed titles and compares the UI with the `/api/tasks` response). The seed command deletes existing accounts and their related data; use it only for disposable or intentionally reset demo databases.

## Builder API

- Endpoints: `POST /api/business/tasks`, `GET /api/business/tasks/:id`, `POST …/rounds`, `PUT …/rounds/:number/answers`, `POST …/card/build`, `PUT …/card`, `POST …/publish`, `POST …/unpublish`. Every response is `{ task }` in one shape, unwrapped by `modules/builder/api/builder.ts`; `useTaskCache().apply` writes it over the page state as is and marks the catalog's business list, lists and detail stale.
- `createRound`, `buildCard` and `confirmCard` wait for the AI: their timeout is 45 s (the server allows 30 s per AI call) and a timeout rejects with `code: "TIMEOUT"`. The rest keep the client's 15 s.
- The page picks its screen from `status`: `draft` → analyze the draft, `clarifying` → the last round's questions, anything later → the card editor. Steps map `draft`/`clarifying` → Clarification, `review` → Card, `published`/`in_progress`/`unpublished` → Publication.
- The answers form is mounted per round (`key={round.number}`) and the card editor per task; the editor resets only from a confirmation's response, so refetches never wipe edits. Unconfirmed edits arm `useLeaveGuard`: `beforeunload` for the tab and a capture-phase click guard for in-app links (the app uses `BrowserRouter`, so `useBlocker` is unavailable).
- Tasks created before the builder (the seed) have `card: null`; `useCardDefaults` fills the editor from `GET /api/tasks/:id` instead.
- 404 for someone else's task is by design on the server. There is no builder mock: with `AUTH_MOCKS=true` the builder routes have no API.

## ~~Don'ts~~

- Don't reintroduce Bearer tokens, `tokenStorage`, or authentication persistence in localStorage/sessionStorage. Startup removes the old `authToken` key.
- Don't import a module's internal files from outside it — use the module's `index.ts` barrel.
- Don't restore demo routes or technical API-status navigation as part of authentication work. Password recovery, email verification, profile editing and teams remain out of scope.
- Don't build on `modules/dashboard/stores/useAppStore.ts` — it's an unused starter-kit leftover (a demo counter), not real app state.

Visual rules — the reasoning for each is in **Design system** above:

- Don't reintroduce an eyebrow caption above a title, and don't pass a section's heading through `children` — it goes in `Section`'s `title` prop.
- Don't hardcode a Tailwind palette color (`bg-emerald-500`, `text-red-600`, ...). Every color goes through a token in `core/index.css` — including `success`/`warning` for status. The token values are contrast-checked as a set; a raw color silently opts out of that and out of dark mode.
- Don't put `font-mono`, `uppercase` or `tracking-[...]` on a label, button, nav item or body copy. Mono is for machine output, `uppercase` is for `metaLabel`, and custom tracking is for nothing.
- Don't add a shadow to make something stand out — give it a border, or put it in a `Card`.
- Don't hardcode a radius on a component (`rounded-[6px]`, `rounded-xl` "just for this card"). Move `--radius` or pick an existing step.
- Don't add a `max-width` to `Page`, and don't change the gutter on `Page` or `TopBar` alone — they have to match.
- Don't leave `flex justify-between` unbounded on a full-width page, and don't ship a layout change without looking at it at 1920px.
- Don't name an i18n key `*.label` when it renders as a heading, and don't bake casing into a translation string.
