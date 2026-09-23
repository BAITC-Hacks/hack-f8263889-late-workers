# AGENTS.md

Guidance for coding agents (Codex, Claude Code, etc.) working in this repository.

## What this is

A Vite + React 19 + TypeScript SPA: Tailwind 4, TanStack Query, zustand, i18next (react-i18next), axios. Talks to the FastAPI backend (see `../backend/AGENTS.md`) over `/api/v1`. Node 20+, package manager is `yarn` (root `Makefile` uses it; `npm` scripts also work directly inside `frontend/`).

## Commands

```bash
yarn install --frozen-lockfile      # install deps
npm run dev                         # run on :5173 (Vite HMR)
npm run build                       # production build
npm run lint                        # eslint src/**/*.{ts,tsx}
npm run typecheck                   # tsc --noEmit -p tsconfig.app.json
npm run format                      # prettier --write
```

Run `lint` and `typecheck` before finishing any task. Both must pass. There is no test runner configured yet (no vitest/jest, no `test` script).

## Architecture

```
src/
  common/
    components/layout/   Page, Section, Stack, Footer — layout primitives (barrel index.ts)
    components/ui/       shadcn-style primitives (button.tsx, card.tsx) via @radix-ui/react-slot + cva (barrel index.ts)
    lib/utils.ts          cn() — clsx + tailwind-merge
    styles/classes.ts      shared className constants (pageTitle, sectionTitle, field, fieldLabel, ...)

  core/                   app infrastructure, not feature-specific
    api/client.ts          axios instance: baseURL = `${VITE_API_URL}/api/v1`, injects Bearer token, normalizes errors to ApiError, clears token on 401
    api/token.ts            tokenStorage — localStorage + in-memory fallback, pub/sub listeners
    api/sse.ts               streamSse() — fetch-based SSE async generator (axios can't stream in-browser)
    api/errors.ts             toApiError / isApiError / getErrorMessage / getFieldErrors
    api/types.ts               Page<T>, ApiError, ApiErrorBody shared shapes
    query/                     QueryClient (staleTime 60s, gcTime 5m, retry:1) + QueryProvider
    router/appRoutes.tsx        single RouteObject tree, imports pages from module barrels
    env.ts                      zod-validated env: VITE_API_URL (url, default localhost:8000), VITE_APP_ENV
    i18n.ts                     i18next + http-backend + languagedetector

  modules/                 feature modules
    auth/         api/auth.ts, stores/useAuthStore.ts, hooks/{useLogin,useLogout,useMe,useRegister}, components/RequireAuth.tsx, pages/{Login,Register}Page
    notes/        api/notes.ts (CRUD), hooks/useNotes* , components/{NoteForm,NoteList,Pagination}, pages/NotesPage
    ai/           api/chat.ts, hooks/{useChat,useChatStream}, components/ChatPanel.tsx, pages/ChatPage.tsx
    system/       api/health.ts, hooks/useHealth.ts, components/ApiStatus.tsx
    dashboard/    pages/{HomePage,ContactFormPage}, stores/useAppStore.ts
    theme/        ThemeProvider.tsx, components/ThemeToggle.tsx, stores/useThemeStore.ts
```

Each module follows the same internal layout: `api/<resource>.ts` (typed fetch fns over `apiClient`) → `queryKeys.ts` (key factory: `.all/.lists()/.list(filters)/.details()/.detail(id)`) → `hooks/use<Thing>.ts` (TanStack Query wrappers) → `components/` + `pages/` → public barrel `index.ts`.

## Conventions

- Path alias `@` → `src`, defined separately in `tsconfig.json`/`tsconfig.app.json` and `vite.config.ts` — keep both in sync when adding new alias roots.
- `no-restricted-imports` (see `eslint.config.js`) blocks `@/modules/*/*` deep imports and `@/common/components/{layout,ui}/*` / `@/common/styles/*` file imports — always go through the module/folder's barrel `index.ts`. Inside a module, use relative imports.
- `tokenStorage` (`src/core/api/token.ts`) is the source of truth for the auth token. `useAuthStore` (zustand) only mirrors it via subscription — read/write auth state through `tokenStorage`, not the store.
- Requests that must skip auth (login, register, health) pass `skipAuth: true` in the axios config so a stale token isn't attached and a 401 there doesn't trigger logout.
- A 401 on any authenticated request clears the token in the response interceptor (`core/api/client.ts`), which propagates through `tokenStorage`'s listeners into `useAuthStore`, which `RequireAuth` reacts to.
- `useLogin`/`useLogout` call `queryClient.clear()` to purge cross-user cache.
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

Every color goes through a token in `core/index.css`; there are no raw Tailwind palette classes anywhere in `src`. Status has its own tokens (`success`, `warning`) next to `destructive`.

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

## Backend integration

- Base URL: `VITE_API_URL` (validated in `core/env.ts`) + `/api/v1`, except `/health` which is hit directly. `VITE_API_URL` must be in the backend's `CORS_ORIGINS`.
- Error shape: backend returns `{"error": {"code", "message", "details"}}`; `toApiError()` normalizes it (whether from axios or the SSE fetch path) into `ApiError { status, code, message, details?, requestId? }`.
- `getFieldErrors(err)` maps FastAPI 422 `details` (`{loc: ["body", "field"], msg}`) into a `{field: message}` record for `react-hook-form`'s `setError`.
- SSE: `streamSse()` POSTs via raw `fetch` (not axios) to `${API_V1_URL}<path>`, parses `event:`/`data:` blocks, yields typed events. Used by `modules/ai/hooks/useChatStream.ts` against `POST /ai/chat/stream`; event contract is `delta` / `done` (with usage) / `error`, matching `backend/app/services/ai.py`.

## ~~Don'ts~~

- Don't bypass `tokenStorage` to read/write the auth token directly from components or stores.
- Don't import a module's internal files from outside it — use the module's `index.ts` barrel.
- Don't trust `frontend/README.md` for the current module/stack list — it's stale (describes a "quotes" module that doesn't exist and Tailwind 3; the real modules are `auth`, `notes`, `ai`, `system`, `dashboard`, `theme`, and the stack uses Tailwind 4).
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
