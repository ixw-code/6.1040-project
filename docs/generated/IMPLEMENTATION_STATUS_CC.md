# Wikiplotter Code Complete — implementation status

## Milestone summary

| Increment | Outcome and decisions |
| --- | --- |
| 1A — Account deletion backend | Adds authenticated self-deletion, refuses accounts that own hubs, and journals retryable cleanup of sessions, registration, progress, and media. Existing articles remain; unavailable-media placeholders handle references to removed files. |
| 1B — Account deletion frontend | Adds eligibility-first messaging, typed confirmation, retryable errors, and redirect home after deletion. The delete endpoint repeats authorization and ownership checks. |
| 2A — Hub flow | Adds a name-only hub creation page; new hubs start at NotStarted. The app checks progress before rendering a hub and directs readers without saved progress to welcome. |
| 2B — Progress and return navigation | Shares spoiler-aware progress controls between hub and account pages, warns before advancing, and preserves safe internal return paths through login and registration. |
| 2C — Media uploads | Narrows and bounds the uploads page, adds authorized image previews and video placeholders, and adds a clipped account preview list with View All navigation. |

## Key behavior

- Account deletion derives identity from the trusted session. Hub ownership blocks deletion before cleanup; eligible cleanup is recoverable and cannot leave a usable registered identity with partially removed data.
- Hub settings retain staged edits and destructive confirmations. Missing progress and NotStarted remain distinct; spoiler-sensitive content continues to use existing filtered reader responses.
- Login and registration return paths are restricted to safe internal destinations. Clearing progress in hub navigation opens welcome; clearing it from account data reloads that page.

## Milestone 2C files and responsibilities

| File | Responsibility updated |
| --- | --- |
| `frontend/src/features/Media/MediaLibrary.vue` | Adds Back to settings inside the white content panel; separates upload controls from a bounded, scrollable library with loading, empty, error, success, preview, and delete states. |
| `frontend/src/features/Media/MediaPicker.vue` | Disables filename search while keeping the authorized uploads list selectable; upload controls remain available. |
| `frontend/src/features/Media/MediaThumbnail.vue` | Lazily fetches image thumbnails through the authenticated preview endpoint, revokes object URLs, and shows pending, unavailable, or video placeholders. |
| `frontend/src/features/Account/AccountPage.vue` | Shows up to four small media rows clipped at 3.5 rows, removes per-asset links, and centers a small View All link over the list’s lower border. |
| `frontend/src/features/Hub/HubSettings.vue` | Adds a left arrow to Back to hub. |
| `frontend/src/styles/features.css`, `frontend/src/styles/responsive.css` | Constrains media and article-editor previews, bounds the media library and modal to available viewport space, and styles responsive rows and navigation. The modal scrolls only when it exceeds its available height. |

The uploads page has no search control; the modal’s filename filter is disabled. Image previews use the existing authenticated `/api/assets/preview` endpoint. The asset API provides neither upload timestamps nor video posters: the account list uses existing API order, not a verifiable recency sort, and videos use a play-icon placeholder. Adding timestamp or poster support would require backend changes and is deferred.

## Verification

- `bun run typecheck:frontend` — passed after the media search and navigation updates.
- `bun test frontend/tests` — passed: **24 tests, 80 assertions**.
- `bun --env-file=.env.test.local test tests/http/MediaHttp.test.ts` — passed: **1 test, 19 assertions**, covering owner preview, unauthorized preview denial, spoiler-filtered reads, upload, and deletion.
- `bun run build:frontend:prod` — passed; Vite reports existing sync-engine `node:util` and `node:crypto` browser externalization warnings.
- `git diff --check` — passed.
- Desktop and narrow viewport visual checks were not performed.

Earlier milestones passed their documented design, framework, artifact, typecheck, and test checks. The last full-suite baseline recorded **109 tests, 701 assertions**; it was not rerun for the focused Milestone 2C UI changes.

## Suggested commit message

`feat(ui): improve media uploads layout and previews`
