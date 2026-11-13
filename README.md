# Askwell

An AI support chat widget for any website. See `docs/project.md` for what we build and `docs/plan.md` for the phases.

## Prerequisites

- Node 24 (`.nvmrc`)
- pnpm 10 (pinned in `package.json` → `packageManager`; `corepack enable` picks it up)

## Install

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in values; never commit it
```

## Layout

| Path | What |
|---|---|
| `apps/web` | Next.js app: landing, dashboard, `/embed`, `/api` |
| `apps/widget` | Vanilla TS loader, bundled to `dist/widget.js` (under 5 KB) |
| `packages/shared` | Shared contract: types, API shapes, plan limits, `APP_NAME` |
| `packages/db` | Generated Supabase types |

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | Run the app locally (http://localhost:3000) |
| `pnpm typecheck` | Type-check every package |
| `pnpm lint` | Lint every package |
| `pnpm test` | Run every package's Vitest tests |
| `pnpm build` | Build every package (web app + widget bundle) |
| `pnpm --filter @askwell/widget build` | Build only the widget; fails if over 5 KB |
