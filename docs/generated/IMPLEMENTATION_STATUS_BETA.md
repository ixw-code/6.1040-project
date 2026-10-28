# Wikiplotter Beta — implementation status

Milestones 1–2 established the Beta contracts and identity concepts. Milestone 3 adds the account gateway, verified Google and MIT SDG Commons sign-in, and a minimal registration UI. Existing reader and authoring flows still use the Alpha assembly.

## Milestone 1 file summary

### Beta contracts

| Files | Decision and purpose |
| --- | --- |
| `design/types.md`; `design/concepts/{Registering,Sessioning,HubCataloguing,Documenting,Checkpointing,ProgressRecording,RequirementTagging,MediaAssetManaging}.md` | Bind registered Users, sessions, anonymous cookie progress, articles, and uploader-owned assets to independent concept state. Keep hub and article edits/deletions direct; only uploads retain PENDING/READY. |
| `design/compositions/{Accounts,Articles,Hubs,MediaAssets,ReaderProgress,Reading}.md` | Specify authenticated ownership, article-facing APIs, anonymous progress import, coordinated deletion, transactional article saves, and spoiler-safe snapshot reads. |

### Alpha compatibility and checks

| Files | Decision and purpose |
| --- | --- |
| `design/alpha/{types.md,concepts/*.md,compositions/*.md}`; five Alpha concept registries; `generated*.config.ts` | Preserve specifications matching the five implemented Alpha concepts and assemblies until Beta replaces them. |
| `generated/{setup,reader}/*`; three corrected Alpha tests | Regenerate existing artifacts and correct stale DOCUMENT_TITLE refusal names. |

Milestone 1 passed design, framework, artifact, backend/frontend type checks, and 49 regression tests. An independent design review resolved seven contract concerns. The five Alpha concepts were subsequently grouped under `src/concepts/<Name>/` with their registries; their behavior was unchanged.

## Milestone 2 file summary

| File | Change and purpose |
| --- | --- |
| `src/concepts/Registering/Registering.ts` | Implements MongoDB-backed registration, exact 3–20 ASCII alphanumeric usernames, provider association lookup, username updates, and unregister. Unique indexes enforce username and provider/subject exclusivity under concurrent writes. |
| `src/concepts/Registering/registry.ts` | Registers the accepted Beta specification and its four refusal classes without adding Registering to the Alpha assembly. |
| `src/concepts/Sessioning/Sessioning.ts` | Issues random 256-bit bearer secrets, persists only SHA-256 verifier hashes, checks fixed seven-day expiry on every lookup, and supports single-session and per-user revocation. An injectable clock makes the expiry boundary testable. |
| `src/concepts/Sessioning/registry.ts` | Registers the accepted Beta specification and SESSION_INVALID refusal without adding Sessioning to the Alpha assembly. |
| `tests/concepts/Registering.test.ts` | Tests persistence across reconnection, exact and concurrent uniqueness, invalid usernames, updates, and unregister. |
| `tests/concepts/Sessioning.test.ts` | Tests hash-only persistence, invalid credentials, exact expiration without renewal, and single/per-user revocation. |
| `docs/generated/IMPLEMENTATION_STATUS_BETA.md` | Condenses completed history and records Milestone 2 decisions, verification, and next work. |

Milestone 2 passed the full check with 55 tests across 16 files. Sessioning stores only verifier hashes and checks expiry on every lookup; Registering owns exact username and provider identity uniqueness. Neither concept was added to the Alpha assembly.

## Milestone 3 file summary

| File | Change and purpose |
| --- | --- |
| `src/account-concepts.ts` | Selects Registering and Sessioning for the local account composition without exposing trusted identity inputs through reader HTTP. |
| `src/compositions/Accounts.ts` | Coordinates returning-user login, explicit registration, current account, logout, and username changes through concept actions and queries. Progress import remains deferred. |
| `src/accounts.ts` | Assembles the local Accounts gateway with Mongo instances and occurrence-field redaction for session and provider values. |
| `src/auth/providers.ts` | Implements Google authorization-code OIDC with ID-token signature, issuer, audience, expiry, and nonce checks; implements MIT SDG Commons' documented connect/redeem exchange with S256 code binding. |
| `src/auth/sealed-cookie.ts` | Encrypts and authenticates short-lived OAuth attempt and pending-registration cookies with AES-256-GCM. |
| `src/auth/http.ts` | Handles provider callbacks and account HTTP routes; enforces state, Secure HttpOnly SameSite cookies, Origin checks on mutations, session rotation, expiry, logout, and trusted server-side identity. Account deletion fails closed until ownership checks exist. |
| `src/edge.ts` | Dispatches only account and callback paths to the trusted account boundary; preserves the sync-engine HTTP adapter for existing reader routes. |
| `frontend/src/App.vue` | Adds minimal `/login` and `/register` pages with an explicit Create account action and current-account/logout controls. |
| `frontend/vite.config.ts` | Proxies `/auth` callbacks to the backend during local development. |
| `frontend/index.html` | Prevents provider callback details from leaking through referrer headers. |
| `.env.example` | Documents production origin, cookie key, Google client credentials, and Commons origin requirements. |
| `.env.development.example` | Documents corresponding local development settings; actual secrets remain uncommitted. |
| `tests/compositions/Accounts.test.ts` | Tests explicit registration, returning login, current identity, rename, and logout through the local gateway. |
| `tests/http/AccountsHttp.test.ts` | Tests pending registration, trusted identity, cookie attributes, CSRF rejection, rotation, logout, expiry, and fail-closed deletion using a provider mock. |
| `tests/http/AuthProviders.test.ts` | Tests Commons request shape and Google signed-token validation, including nonce, audience, expiry, and signature rejection. |
| `docs/generated/IMPLEMENTATION_STATUS_BETA.md` | Records Milestone 3 files, verified behavior, and deployment blockers while retaining the established report structure. |

## Proposed API names

These accepted Beta composition names guide ongoing work. The Accounts names are now implemented in a local composition; Alpha reader HTTP paths are unchanged. Article is the public noun, while Documenting remains the internal state owner.

| API family | Naming reason |
| --- | --- |
| Accounts.Login and Accounts.Register | Distinguish returning provider identities from explicit first-time registration. |
| Hubs.CreateHub, RenameHub, UpdateSlug, DeleteHub | Name creator-controlled hub changes directly. |
| Articles.CreateArticle, GetArticleForEditing, SaveArticle, DeleteArticle | Use the reader-facing noun; editing is author-only and save replaces the full blocks-and-rules set. |
| Articles.TagItem and UntagItem | Item covers either an article or a block. |
| Reading.BrowseHub and ReadArticle | Read returns spoiler-filtered content, separate from author editing. |
| MediaAssets.StartUpload, FinishUpload, MyAssets, ReadAsset | Distinguish upload validation, the uploader library, and reader-eligible retrieval. |
| ReaderProgress.GetProgress, RecordProgress, ClearProgress, ImportAnonymousProgress | Name selection operations; import remains local-only. |

## Verification and remaining work

With `HOST=127.0.0.1 PORT=3000 FRONTEND_HOST=127.0.0.1 FRONTEND_PORT=5173`, `bun run check` passed: design, Alpha framework/artifact checks, backend/frontend typechecks, frontend build, and **61 tests across 19 files**. Six focused Milestone 3 tests passed; Alpha regressions remain green. Framework assembly checks retain 21 setup and 17 reader advisories. The separate Accounts assembly is verified through its gateway and HTTP tests, not yet pinned as a generated artifact. Intermediate composition and test assertions were corrected before the final passing run.

Live Google sign-in needs a Google OAuth web client ID/secret and an exact `PUBLIC_ORIGIN/auth/google/callback` redirect registration. Live MIT SDG Commons needs a configured `COMMONS_ORIGIN` and confirmation that the deployed app origin is allowed; its public service was unavailable for live verification. `AUTH_COOKIE_KEY` must be a stable random 32-byte base64url key. No provider credentials or key are committed. The protocol follows [Google OIDC documentation](https://developers.google.com/identity/openid-connect/openid-connect) and [ConceptBox's MIT SDG Commons provider](https://github.com/mit-sdg/conceptbox/blob/main/src/concepts/Federating/provider.ts); both provider adapters were tested with mocks.

`Accounts.md` calls the provider “Wikimedia Commons,” while the explicit Milestone 3 requirement specifies MIT SDG Commons. The implementation uses MIT SDG Commons and retains the `COMMONS` concept value; the accepted contract text was not changed. This terminology needs a contract correction. `Accounts.DeleteAccount` remains unavailable and returns 501 because ownership checks for hubs, articles, and assets do not yet exist. Progress importing remains Milestone 4. Alpha's existing creation routes remain as implemented until their Beta ownership milestones; the new account identity is not yet used to protect them. Later milestones must implement coordinated transactions and spoiler-safe snapshot reads.

## Proposed commit message

```text
feat(beta): add verified account sign-in and explicit registration

- Add local Accounts composition backed by Registering and Sessioning
- Verify Google OIDC and MIT SDG Commons callbacks before issuing encrypted-flow and session cookies
- Add explicit pending registration, current account, logout, and protected username changes
- Cover provider validation, CSRF, session rotation, expiry, and Alpha regression behavior
- Record provider setup requirements and fail-closed account deletion blocker
```
