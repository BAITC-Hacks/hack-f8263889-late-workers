# React Starter Kit

A lean, opinionated **Vite + React 19 + TypeScript** template. Everything real apps need — routing, state, data, forms, i18n, theming, error handling — wired up and ready to ship.

```
rsk /
```

---

## Features

**Core**

- **Vite 7** with SWC — instant HMR and fast builds
- **React 19** + **TypeScript** strict
- **React Router** for client-side routing

**Styling & design**

- **Tailwind CSS 3** with a full design-token system (light / dark / system)
- **shadcn/ui** primitives you own in-repo
- **JetBrains Mono** for code & UI eyebrows, **Inter** for body
- Subtle fixed dot-grid background, tuned per theme
- Reusable layout primitives: `Page`, `Section`, `Stack`, `Footer`

**State & data**

- **Zustand** for UI / global state
- **TanStack Query** + **axios** for server state, with a typed `apiClient`, request/response interceptors, normalized errors, and DevTools in dev

**Forms & validation**

- **React Hook Form** for performant forms
- **Zod** for runtime validation — schema-driven env vars, reusable across forms

**Internationalization**

- **i18next** + browser language detection, HTTP backend, localStorage persistence
- Ships with **English**, **Russian** and **Kazakh** locales

**Reliability**

- **Zod-validated environment** — app refuses to boot on missing / malformed env vars
- **Error boundary** around the whole tree with a styled fallback + dev stack trace

**DX & conventions**

- **Public API barrels** per module with lint-enforced boundaries
- **Husky** + **lint-staged** pre-commit hook running ESLint + Prettier on staged files
- Prettier with import sorting and Tailwind class sorting
- `@` → `src` path alias

---

## Quick start

```bash
# 1. install deps
yarn install   # or npm install

# 2. copy envs
cp .env.example .env

# 3. run
yarn dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Environment variables

All envs are validated with Zod at boot — a missing or malformed value fails fast with a clear message.

| Variable       | Type                                   | Default                 | Notes                     |
| -------------- | -------------------------------------- | ----------------------- | ------------------------- |
| `VITE_API_URL` | URL                                    | `https://dummyjson.com` | Base URL for `apiClient`. |
| `VITE_APP_ENV` | `development \| staging \| production` | `development`           | Build environment tag.    |

Schema lives in [`src/core/env.ts`](src/core/env.ts). To add a new variable:

1. Add it to the schema with the right Zod type (`z.url()`, `z.coerce.number()`, `z.enum([...])`, etc.)
2. Document it in `.env.example`
3. Use it anywhere via `import { env } from "@/core/env"` — fully typed.

---

## Project structure

```
src/
  common/
    components/
      layout/        Page · Section · Stack · Footer
      ui/            shadcn primitives (Button, Card, …)
      TopBar.tsx
    lib/             utils (cn helper)
    styles/          class-name constants (eyebrow, field, …)

  core/
    api/             axios instance + interceptors
    query/           TanStack QueryClient + Provider
    router/          appRoutes
    env.ts           Zod-validated env
    ErrorBoundary.tsx
    i18n.ts
    main.tsx · App.tsx · index.css

  modules/
    dashboard/       HomePage, AboutPage, useAppStore
    quotes/          Random-quote demo — the reference data-fetching module
    theme/           light / dark / system switcher

public/
  locales/           en, ru, kk translation JSON
```

Each module and folder with multiple exports has an **`index.ts` public API**. Cross-module imports go through the barrel; same-module imports use relative paths.

---

## Conventions

### Module public APIs

```ts
// ✅ from outside the module — use the barrel
import { ThemeProvider, ThemeToggle } from "@/modules/theme";

// ❌ reaching into internals — blocked by ESLint
import { ThemeProvider } from "@/modules/theme/ThemeProvider";
```

Enforced by `no-restricted-imports` in [`eslint.config.js`](eslint.config.js). Same rule applies to `@/common/components/layout/*`, `@/common/components/ui/*`, `@/common/styles/*`.

### Styling

- **Layout primitives first** — reach for `Page` / `Section` / `Stack` before writing ad-hoc containers.
- **`cva` for component variants** — see [`button.tsx`](src/common/components/ui/button.tsx). This is the Tailwind equivalent of MUI's `styled()`.
- **Class-name constants** — if you write the same long `className` twice, lift it to [`src/common/styles/classes.ts`](src/common/styles/classes.ts).
- **Theme tokens over raw colors** — use `bg-background`, `text-foreground`, `border-input`, etc. They automatically adapt to light / dark.

### Data fetching

Every server-state feature follows this shape:

```
src/modules/<feature>/
  api/<resource>.ts        # typed fetch functions using apiClient
  queryKeys.ts             # key factory: keys.all, .detail(id), .list(filters)
  hooks/use<Thing>.ts      # useQuery / useMutation wrappers
  components/<Thing>.tsx   # UI with loading / error / success states
  index.ts                 # public barrel
```

Reference implementation: [`src/modules/quotes/`](src/modules/quotes/).

### Forms

- Controlled via `react-hook-form`
- Use class constants `field` / `fieldLabel` / `fieldError` from `@/common/styles`
- For complex validation, add a Zod schema and plug it in with `@hookform/resolvers/zod` (not installed by default — `yarn add @hookform/resolvers`)

---

## Scripts

| Script         | What it does                                         |
| -------------- | ---------------------------------------------------- |
| `yarn dev`     | Vite dev server with HMR                             |
| `yarn build`   | Production build                                     |
| `yarn preview` | Preview the production build locally                 |
| `yarn lint`    | ESLint over `src/**/*.{ts,tsx}`                      |
| `yarn format`  | Prettier over `src/**/*.{ts,tsx,js,jsx,json,css,md}` |

A **pre-commit hook** (Husky + lint-staged) runs `eslint --fix` and `prettier --write` on staged files automatically. Bypass with `--no-verify` only in emergencies.

---

## Theming

Dark / light / system switcher in the top bar. Theme is:

- Persisted to `localStorage` under `theme`
- Applied via a `.dark` class on `<html>`
- Anti-flash: an inline script in [`index.html`](index.html) sets the class **before** React mounts

Tokens live in [`src/core/index.css`](src/core/index.css) — edit once, the whole app follows.

---

## Error handling

Outer [`ErrorBoundary`](src/core/ErrorBoundary.tsx) wraps the entire app. On any render error it shows:

- A mono eyebrow + large heading
- The error message in a `<pre>`
- A collapsible stack trace (dev-only)
- `Reload` and `Try again` actions

Test it: go to Home → click **Trigger boom**.

---

## i18n

Languages load lazily from `public/locales/<lng>/translation.json`. Switch with the segmented control in the top bar.

To add a new language:

1. Create `public/locales/<lng>/translation.json`
2. Add the code to `supportedLngs` in [`src/core/i18n.ts`](src/core/i18n.ts)
3. Add it to `LANGS` in [`src/common/components/TopBar.tsx`](src/common/components/TopBar.tsx)

---

## License

MIT.
