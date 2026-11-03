# Wikiplotter Code Complete — implementation status

## Milestones

| Increment | Outcome |
| --- | --- |
| 1A–1B — Account deletion | Authenticated self-deletion refuses accounts that own hubs and journals retryable cleanup of sessions, registration, progress, and media. The UI explains consequences, requires typed confirmation, and returns home after success. |
| 2A–2B — Hub flow and navigation | Hub creation is name-only; missing reading progress opens the welcome page. Login return paths are restricted to internal URLs, progress changes warn before advancing, and hub settings use staged edits and confirmations. |
| 2C — Media uploads | The uploads page and picker use bounded lists and authorized previews. Account settings shows a clipped preview list and View All navigation. |
| 2D — Final frontend additions | Adds a shared loading spinner, a centered login-width not-found card, Created Hubs account section, and bounded four-row Reading Progress and Created Hubs lists. |

## Milestone 2D changes

| File | Responsibility |
| --- | --- |
| `frontend/src/App.vue`, `frontend/src/lib/routes.ts`, `frontend/src/pages/NotFound/PageNotFound.vue` | Render a dedicated 404 for unknown frontend routes and missing hubs/articles while keeping authorization, missing progress, and API failures distinct. API and OAuth routes remain handled by the backend. |
| `frontend/src/components/LoadingSpinner.vue`, `frontend/src/styles/features.css` | Provide a delayed, accessible CSS spinner with reduced-motion support. Use it for initial page loading and pending page or section data. |
| `frontend/src/pages/Account/AccountPage.vue`, `frontend/src/styles/features.css`, `frontend/src/styles/responsive.css` | Replace Authored Articles with creator-owned Created Hubs. Reading Progress and Created Hubs share 50px rows and scroll after four rows; native scrollbars and normal scroll chaining are retained. |
| `src/compositions/Hubs.ts`, `src/http/hubs.ts`, `frontend/src/api/Hubs.ts`, `design/compositions/Hubs.md` | Add authenticated `POST /api/hubs/created`, returning only the current user's hub IDs, names, and current slugs. No concept or API identity input was added. |
| `tests/http/HubsHttp.test.ts`, `frontend/tests/routes.test.ts` | Cover creator-only results, forged identity rejection, renamed hub slugs, and route matching/not-found helpers. |

The account list displays hubs using authoritative creator data; Manage resolves the current slug to the hub's stable ID before navigating to settings. The media preview list remains clipped at 3.5 rows. Frontend source, tests, and implementation-status references now use the renamed `frontend/src/pages` directory.

## Verification

- `bun run check:static` — passed: design and framework checks, generated-artifact checks, backend typecheck, and frontend typecheck. The framework checker reports 10 configured advisories.
- `bun test frontend/tests` — passed: **26 tests, 85 expectations**.
- `bun --env-file=.env.test.local test` — passed: **111 tests, 713 expectations**.
- `bun run build:frontend:prod` — passed. Vite reports existing `node:util` and `node:crypto` browser-externalization warnings from sync-engine dependencies.
- `git diff --check` — passed.
- Desktop and narrow viewport visual checks were not performed.

## Suggested commit message

```text
feat(ui): finalize loading, not-found routing, and account hub management

- Add a reusable accessible loading spinner and a centered not-found page.
- List a user's created hubs through an authenticated endpoint and add Manage links in account settings.
- Bound Reading Progress and Created Hubs lists to four rows with native scrolling.
- Move frontend pages and update source, test, and status-document references.
```
