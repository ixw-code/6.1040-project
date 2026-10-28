# Wikiplotter - Beta Design

## Summary
In the previous design under [ALPHA.md](./ALPHA.md), Wikiplotter's implemented functionality was:

1. Record, retrieve, change, and clear readers' progress within a hub.
2. Define an ordered checkpoint sequence for each hub.
3. Create scoped documents with required titles and ordered text and image blocks.
4. Assign requirements to documents and blocks before readers can see them.
5. Establish and discover named spaces (wiki hubs) as the shared scope.
6. Browse eligible article titles and read only eligible content.

Alpha used dummy reader identities (e.g. browser storage) and premade hub/document assemblies. While implemented on the backend, user endpoints on the frontend didn't include the (3) creation of documents, or (4) content tagging. Alpha also limited the functionality of concepts within ContentManagement and HubManagement, preventing unauthorized deletion mechanisms.

In the Beta, the following features will be implemented:

1. Expand current functionality (e.g. deletion).
2. Reader accounts/authentication + Sessioning for local data
3. Enable media asset uploading and management. 
4. Live article editing with naming, asset references, and tag assignment
5. Polished UI and UX design (intuitive interface for all features listed)
6. Application deployment (+ better paths)

Deferred features:

- Contribution roles and rules
    - *Current design*: hard-coded rule: only allow edit access to original creators (e.g. hubs, documents, assets), no rule editing or access granting
- Richer article editing (i.e. markup language and template rendering)
    - *Current design*: no markup language or templates, each block is rendered the same way, line-separated.
- Article version history
    - *Current design*: only store and serve the latest version of an article
- Nested directory grouping
    - *Current design*: all documents and content belong to the hub, with no organizational structure within hubs
- Filtered search within groups
    - *Current design*: no search function, just list articles on the main page
- Commenting
    - *Current design*: none
- Scalable design considerations (e.g. database indexing, subdomain deployment)

## Beta Design Overview

### Concept Design
The following are both new additions and updates to the current concept design. new concepts have the core outline detailed, while ommitting action parameters and bodies. updated concepts have modifications to their design, ommitting what is unchanged.

#### Registering (new)
**Purpose**: Allow users to register identity through a third-party authentication service.
**State**:
- a set of Users
    - a unique username String
    - a provider Provider (Provider is GOOGLE | COMMONS)
    - a providerSubject Subject

**Actions**:
- register(username, provider, providerSubject): (user)
- update(user, username): (user)
- unregister(user): (user)

**Queries**:
- _user(user): optional (username, provider, providerSubject)
- _byProvider(provider, providerSubject): optional (user)

**Invariants**: Usernames are alphanumeric strings length 3-20 characters long; no passwords or OAuth credentials stored. Provider identity is verified externally.

#### Sessioning (new)
**Purpose**: Allow users to maintain their information across requests without needing to authenticate every time.
**State**:
- a set of Sessions with
    - a user User
    - an expiresAt DateTime

**Actions**:
- start(user): (session, expiresAt)
- use(session): (user)
- end(session): deleted (session)

**Queries**: N/A

**Invariants**: Sessions themselves are unguessable identities; Sessions expire server-side, after 7 days from initialization date; HTTP handles secure HttpOnly cookies; Sessioning stores no raw cookie secrets. Unauthorized progress cookies will live entirely client-side with no state in Sessioning.

#### MediaAssetManaging (new)
**Purpose**: Allow users to upload, retrieve, and manage assets within the application.
**State**:
- a set of Assets with
    - an uploader User
    - a filename String 
    - a storage key String
    - a kind AssetType (IMAGE | VIDEO)
    - a status (PENDING | READY)

**Actions**:
- create(uploader, filename, storageKey, kind) : (asset)
- finalize(asset): (asset)
- delete(asset): deleted (asset)

**Queries**:
- _get(asset): optional (uploader, filename, storageKey, kind, status)

**Invariants**: Concept stores metadata and references; resolves to actual file bytes handled by a storage adapter. Only ready assets may be retrieved and referenced by published content.

#### HubCataloguing (update)
**State**:
- a set of Hubs with
    - a creator User
    - unique slug String

**Actions:**
- delete(hub): deleted (hub)
- updateSlug(hub. slug): (slug)

**Queries:**
- _bySlug(slug): optional (hub)

**Invariants**: Readable slug for the hub becomes the URL path for the hub. Readable slug is initialized as the hub's title by default. Update operations on the title don't update the slug. 

#### Checkpointing (update)
**Actions:**
- delete(scope, sequence): deleted (scope, sequence)

#### RequirementTagging (update)
**Queries:**
- _rulesForItems(items): many (item, tokens)
- _itemsRequiringToken(token): many (item)

**Invariant**: Removing an invalidated rule must leave the item *untagged* (ineligible), never replace it with an explicit empty rule (eligible).

#### Documenting (update)
**State:**
- BlockType is TEXT or IMAGE or VIDEO
- a set of Documents with
    - an author User
    - unique scope and title

**Actions:**
- update(scope, document, blocks): (document, blocks)
- rename(scope, document, title): (title)
- delete(scope, document): (scope, document)

**Queries:**
- _documentForEditing(scope, document): optional (title, author, blocks)

**Invariants**: Document and surviving block IDs persist across edits; no version history. New blocks receive new IDs. Documenting owns document state, not media bytes or authorization rules. Document blocks remain immutable, with any changes to a document replacing them entirely. 

### Compositions
The following are new compositions to support new features, as well as updated compositions (unchanged parts ommitted).

#### Accounts (new)
- Start and resolve expiring cookie sessions registered users.
- Verify third-party login at the HTTP boundary; find or register a corresponding User and rotate/associate the session.
- Coordinate login-triggered synchronization through ReaderProgress; expire/logout sessions and clean up expired sessions.

#### MediaAssets (new)
- Require the uploader's registered identity; validate and store uploads via a storage adapter.
- Register asset metadata with MediaAssetManaging.
- Retrieve assets independently of articles, returning their metadata and a retrievable media reference.
- Authorize management and deletion by uploader.
- Prevent deletion of assets still referenced by articles, or explicitly coordinate cleanup.
- Provide authorized endpoints for listing uploaded assets and retrieving individual assets for preview.

#### Articles (update)
- Require the original article author for editing/deletion.
- Require authentication for creation (any users can create an article within any hub).
- Create and retrieve for editing, rename, update ordered blocks, and delete articles.
- Assign, inspect, replace, and remove document/block requirements; validate checkpoint membership.
- Provide endpoints for uploading assets; check against MediaAssetManaging to prevent duplicate names. 
- Validate non-TEXT block references against MediaAssetManaging before saving, must resolve to READY assets.

#### Hubs (update)
- Require authentication for hub creation.
- Require original creator identity for renaming, checkpoint changes, and deletion.
- Coordinate full hub deletion across associated documents, requirements, checkpoint sequence, and progress without granting unintended access during partial failure.
- Support readable hub URLs, endpoints for updating the slug separately from the hub's title. 

#### ReaderProgress (update)
- For registered users, resolve the authenticated user from Sessioning for ProgressRecording operations.
- For unregistered users, accept verified progress cookie data, validate selections with server data, and return the updated progress cookie. 
- On login reaction, receive any unregistered progress and import only into hubs where the registered User has no progress; preserve existing account progress on conflicts.
- Do not store progress inside Registering or Sessioning.

#### Reading (update)
- For registered users, resolve user from browser cookie through Sessioning, obtain ProgressRecording state.
- For unregistered users, resolve reader's progress solely from a validated progress cookie.
- Retain Alpha's server-side checkpoint eligibility checks and spoiler filtering.

### UI / UX
The following are ideas for what features the UI/UX design should include, not final or definitive. 

1. Wikiplotter Homepage (/)
    - Top-level Navigation bar: Wikiplotter logo, Log-in button
    - "Start a wiki" section on the side
    - "Browse hubs" section in the center (e.g. Non-functional search bar for a hub, popular hubs, trending hubs, random hub)

2. Hub Homepage (/hub-slug)
    - Top-level Navigation bar: Wikiplotter
    - Second-level Navigation bar: Hub logo, Non-functional search bar, Hub settings button, Profile button
    - Content area (Center): "Browse articles" section (e.g. popular articles, or create an article) OR "Set your progress" prompt

3. Hub Settings page (/hub-slug/settings)
    - Rename the hub
    - Modify checkpoints
    - Delete the hub

4. Hub Article page (/hub-slug/article-title)
    - Top level (Wikiplotter) and Second level (Hub) navigation bars
    - Content area (Center): Article content
    - Edit button
    - Delete article button

5. Hub Article Editing page (/hub-slug/article-title/edit)
    - Edit button -> Edit blocks and assign checkpoints
    - Create an article -> Blank page for adding blocks/checkpoints
    - Add media button -> Opens menu to browse asset library or upload directly
    - Save to apply changes

6. Asset Preview page (/hub-slug/assets/)
    - Simple layout, asset filename and uploader
    - Dedicated route for each 
   
7. Sign-in page (/login, /register) -- same layout each
    - Navigate to from log-in button
    - Sign in with Google or Commons, or Continue as guest button
    - Redirects to third-party service, redirects back to /register if new account 
    - If new account, prompts for username -> Create account button (nothing stored server-side until this endpoint is used)
    - Redirects to original page where log-in button was clicked

8. User Settings page (/account/settings, /account/data) -- different paths, but same layout
    - Profile icon (opens a panel) in top-right if logged in 
        - Panel: Account, Manage Data, and Log out buttons 
    - Settings tab: 
        - Display empty profile pic (read-only), Display provider (read-only)
        - Change username, Delete account, Log out buttons
    - Data tab: 
        - Sidebar with list of hubs registered to, click to open larger hub menu to right
        - Menu has a top bar with Update Progress dropdown and Clear progress buttons
        - Articles tab with list of articles authored, with View (sends to article page) and Edit (sends to article edit page) buttons, and New Article button
        - Asset Library tab with a list view of assets uploaded, with Preview (opens the preview page) and Delete buttons, and Upload button 


*On every hub page, three dots for updating reader progress.*

*Confirmation message for every sensitive change, e.g. hub deletion or progress update.*

*Every page performs a safety check before allowing users to observe any content, to protect against accessing a path directory directly.*
- *If part of a hub is accessed without recording progress first, it redirects to the home page with the Set Progress prompt.*

---

### Application Bindings and Ownership

| Parameter or relationship | Binding / owner |
| --- | --- |
| Documenting.Scope, Checkpointing.Scope, ProgressRecording.Scope | HubCataloguing.Hub |
| ProgressRecording.Reader | Registering.User |
| ProgressRecording.Checkpoint | Checkpointing.Checkpoint |
| RequirementTagging.Token | Checkpointing.Checkpoint |
| RequirementTagging.Item | Documenting.Document or Documenting.Block |
| Sessioning.User | Registering.User |
| HubCataloguing.Creator, Documenting.Author, MediaAssetManaging.Uploader | Registering.User |
| Session / provider identity | Sessioning owns session validity; Registering owns provider identity mapping; external login service verifies credentials |
| Cookies | HTTP adapter logic handles all cookie operations (e.g. issuance, read/writes, clearing)  |
| Document-to-hub association | Documenting only |
| Document-level requirements | Rule keyed by document ID |
| Block-level requirements | Rule keyed by block ID |
| Documenting.Block, Uploaded assets | Documenting uses asset ID, MediaAssetManaging stores metadata; external storage holds bytes |
| Authorization | Creator/author/uploader checks in compositions, using verified session identity |

### Reactions and Compositions

| Composition module | Feature / flow | Required coordination |
| --- | --- | --- |
| `Hubs` (formerly `HubManagement`) | Establish a hub | Resolve registered User → HubCataloguing.create with creator → Checkpointing.create; expose hub only after initialization succeeds. |
| `Hubs` | Manage checkpoints | Verify hub creator; resolve hub/sequence before append or relabel. |
| `Hubs` | **Delete a hub** | Verify creator → make hub inaccessible during cleanup → remove related checkpoints, articles, and assets; clear related progress. Handle partial failure without making hidden content public. |
| `Articles` (formerly `ContentManagement`) | Create an article | **Verify registered User and hub** → Documenting.create with author and ordered blocks → assign requirements before exposing article. |
| `Articles` | **Edit article** and classify items | Verify original author → load full document and rules → validate blocks/tokens/assets → save updated content and rules with fail-closed visibility. |
| `Articles` | **Delete article** | Verify original author → make article inaccessible during deletion → remove associated rules and document, then clean up unreferenced media as permitted. |
| `Accounts` | **unregistered session** | Register from unregistered session → read secure cookie data → verify provider identity → Registering lookup → Registering.register new user → ReaderProgress.importProgress. |
| `Accounts` | **Login / registration** | Verify third-party identity → Registering lookup/register → Sessioning.start with registered User → issue authenticated cookie → trigger ReaderProgress import from validated anonymous cookie. |
| `Accounts` | **Logout / expiration** | Logout → revoke and expire session; clear old cookies and issue new cookie when browsing continues; clean up expired sessions. |
| `MediaAssets` | **Upload media** | Verify registered User → authorize uploader → store bytes and record asset metadata.|
| `MediaAssets` | **Retrieve / delete media** | Verify uploader → make asset inaccessible during deletion → remove asset from database; reject deletion while referenced unless references are removed.
| `ReaderProgress` | Get/select/reset progress | Resolve session User and progress **from browser cookie**; validate hub/checkpoint; persist progress. Missing progress remains distinct from NotStarted. |
| `ReaderProgress` | **Import progress on login** | Import unregistered progress for hubs without registered progress; preserve existing account choices. |
| `Reading` | Browse/read | Resolve session User and progress **from browser cookie** → derive inclusive checkpoint tokens → expose only eligible titles and blocks, preserving Alpha spoiler rules. |

**bold**: updates / new changes

### Project Structure

```text
design/
  types.md                         # Updated identities and concept bindings
  concepts/                        # Existing five + Registering, Sessioning, MediaAssetManaging
  compositions/                    # Hubs, Articles, ReaderProgress, Reading, Accounts, MediaAssets
src/
  concepts/                        # Concept implementations and registries
  compositions/                    # Composition implementations
  assembly.ts                      # Reader and protected authoring assemblies
  edge.ts / http-policy.ts         # Route access and trusted identity
  db.ts                            # Guarded MongoDB setup
  auth/                             # Third-party login/cookie integration
  storage/                          # Asset storage adapter
frontend/src/                     # Reader, profile, hub settings, article editor
scripts/                           # Development fixtures and utilities
tests/                             # Concept, composition, HTTP, acceptance tests
docs/decisions/BETA.md
```

## Implementation Plan
The implementation for the Beta will happen in the following incremental steps:

1. **Design contracts:** Finalize concept specifications, bindings, composition reactions, and invariants. Refactor the repository to align with the accepted Beta architecture.
2. **Identity concepts:** Implement Registering for provider-backed accounts and Sessioning for expiring authenticated sessions, with independent MongoDB persistence tests. 
3. **Account workflow:** Implement Accounts, Google/Wikimedia authentication, explicit first-time registration, authenticated session cookies, expiration, and logout.
4. **Reader integration:** Extend ReaderProgress and Reading for anonymous cookie-backed progress, authenticated ProgressRecording state, and progress synchronization on login.
5. **Hub management:** Extend HubCataloguing, Checkpointing, and Hubs with creator ownership, readable slugs, protected operations, and coordinated deletion.
6. **Article management:** Extend Documenting, RequirementTagging, and Articles with authenticated creation, full-document editing, requirement assignment, deletion, and spoiler-safe saving.
7. **Media management:** Implement MediaAssetManaging, persistent file storage with MongoDB, reusable asset references, MediaAssets workflows, and dedicated asset preview/retrieval routes.
8. **Frontend:** Implement the Beta account, hub, article, and asset pages in Vue, integrating editing, media insertion, progress management, and authorization-aware navigation.
9. **Deployment:** Configure readable routes, production services, database and asset persistence, HTTPS, OAuth callbacks, and the public domain.
10. **Acceptance:** Verify session security, creator permissions, progress synchronization, content editing, deletion, media access, and spoiler filtering across the deployed application.

### Next Steps

- **Code complete** (P4): Iterate on test suites, perform validation checks for any leftover state invariant violations; finalize deployment environment with introducing S3 for media, etc; polish visual design and/or flow of frontend components.
- **User testing**(P5): Populate production databases with realistic hubs, articles, and assets; perform user testing and report findings.  

### Potential Future Expansions

- Contributor roles, shared hub ownership, invitations and granular permissions.
- Rich text/markup, templates, article version history and collaborative editing.
- Search, nested organization, comments and checkpoint reordering.
- Hub subdomains/customization, media access policies and broader scalability work.
- Profile and account customization, including adding login options
