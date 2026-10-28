# Wikiplotter Beta — implementation status

Milestone 1 contracts are accepted. Milestone 2 implements the Registering and Sessioning concepts independently. The running application and HTTP boundary remain Alpha.

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

## Proposed API names

These accepted Beta composition names remain future work; Alpha HTTP paths are unchanged. Article is the public noun, while Documenting remains the internal state owner.

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

With `HOST=127.0.0.1 PORT=3000 FRONTEND_HOST=127.0.0.1 FRONTEND_PORT=5173`, `bun run check` passed: design, framework, artifacts, backend/frontend typechecks, frontend build, and **55 tests across 16 files**. The six new MongoDB tests passed; the Alpha suite remains green. Both new registries also imported successfully, checking their methods and refusals against the accepted specifications. Framework assembly checks still cover the five Alpha concepts and retain 21 setup and 17 reader advisories. The first full-check attempt stopped at the frontend build because the four environment values were unset; rerunning with documented values passed. No contract deviations were proposed or made.

Milestone 3 must assemble these concepts and implement externally verified provider login, cookies, account workflows, redaction of session secrets, and HTTP integration. Later milestones must implement coordinated transactions and spoiler-safe snapshot reads. The stored session record key and verifierHash must never be a bearer secret.

## Proposed commit message

```text
feat(beta): implement Registering and Sessioning concepts

- Add Mongo-backed provider accounts with exact usernames and concurrent unique indexes
- Issue seven-day sessions while storing only hashed bearer verifiers
- Test identity persistence, invalid credentials, expiry, and revocation
- Preserve the Alpha assembly and condense the Beta implementation status
```
