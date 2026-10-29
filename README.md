# Wikiplotter

Wikiplotter is a spoiler-aware wiki for narrative fiction. Each series has a hub with an ordered set of reading checkpoints. Readers record their progress, while contributors organize articles into versioned content blocks and assign checkpoint requirements to articles, titles, text, and images. The intended experience is a wiki that reveals information as the reader advances, based on contributors' spoiler classifications.

**A reader's journey:** Bob finishes chapter 50 and visits the series hub to look up an artifact mentioned earlier in the series. As this is his first time visiting, before he is allowed to view any pages, he is prompted to select his latest completed chapter. The site refreshes and he can now browse all the articles and content available up to that point in the story. Whether browsing or reading an article, any later revelations remain hidden, including any revealing article titles or passages. When Bob reaches chapter 70, he can update his progress at the click of a button and the site will refresh with newly available information up until that point. There's no stress involved with navigating vague spoiler warnings.

After reaching chapter 90, Bob learned new lore about the artifact, but found that the relevant information wasn't updated on the article page. Since he's been using Wikiplotter for a while now, he thinks it's worthwhile to finally create an account. "Log in" redirects him to use a Google or Commons account to access the wiki, and to register his username as a new user. The progress from his browsing session up to Chapter 90 as a guest is automatically updated to his new account. He quickly finds the article page and clicks on the edit button. Bob decides to append a block about the artifact, setting the checkpoint to Chapter 90. He also thinks an image of the updated form of the artifact would fit well here, so he uploads it directly in the editor as another block after the explanation, and saves the edits. The article updates, and the site refreshes for Bob, reflecting the changes. 

### Beta 

See [BETA.md](./docs/decisions/BETA.md) for the full specification and aaccepted feature scope.

#### Features

- Spoiler-aware reading: Browse articles and view content filtered by ordered reading checkpoints, including NotStarted.
- Reader progress: Record progress anonymously through browser cookies or persist it with an account. Guest progress is synchronized on login without overwriting existing account progress.
- Accounts: Authenticate with Google or Commons, register a username, manage account information, and maintain expiring sessions.
- Hubs: Create and manage hubs with readable URLs, ordered checkpoints, and creator-restricted settings.
- Articles: Create and edit articles using ordered text, image, and video blocks, with checkpoint requirements controlling visibility.
- Media: Upload, preview, reuse, and manage image/video assets stored through MongoDB GridFS.
- Authorization and safety: Enforce account and resource permissions, protect spoiler-restricted content, and confirm destructive actions.

The project is built with Vue, TypeScript, Bun, sync-engine **1.1.0**, and MongoDB.

### Demo 
**Click the thumbnail below!**
<p align="center">
TBA
  <!-- <a href="https://drive.google.com/file/d/1YOJrL5zgmGN7S9tEPsCWyqzui64yi_4r/view" target="_blank" rel="noopener noreferrer"> -->
  <!--   <img src="./docs/assets/thumbnails/alpha-demo.png" alt="Wikiplotter Alpha Demo"> -->
  </a>
</p>

## Getting Started

### Prerequisites

- [Bun 1.x](https://bun.sh)
- Podman, for the local MongoDB container
- MongoDB with replica-set support for transactional operations
- Google OAuth credentials and/or Commons authentication configuration for sign-in

Install project dependencies:

```sh
bun install
```

### Environment Configuration

Wikiplotter uses separate environments and databases:

| Environment | Configuration | Database |
|---|---|---|
| Development | `.env.development.local` | `wikiplotter_dev` |
| Testing | `.env.test.local` | `wikiplotter_test_*` |
| Production | `.env` | `wikiplotter` |

Database names are validated against `WIKIPLOTTER_ENV` to prevent cross-environment access.

Configure MongoDB credentials and the following authentication variables:

- `PUBLIC_ORIGIN`: The exact URL used to access Wikiplotter, including scheme and port (e.g. `http://localhost:5174` locally or `https://wikiplotter.com` in production).
- `AUTH_COOKIE_KEY`: A secret used to sign authentication cookies. Generate a separate key for each environment:

  ```sh
  openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n'
  ```

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Credentials for OAuth Web Application client through Google Cloud Console. Register `${PUBLIC_ORIGIN}/auth/google/callback` as an authorized redirect URI.
- `COMMONS_ORIGIN`: The Commons identity provider's origin, normally `https://class.mit-sdg.dev`. This is **not** the Wikiplotter URL.

Keep environment files and secrets out of version control. On hosting platforms, configure production variables through the provider's environment settings.

### Development

Configure `.env.development.local`, then run:

```sh
bun install
bun run dev
```

Starts the local MongoDB container, Bun backend, and Vite frontend.

```sh
bun run check
``` 

Tests application build in development.

### Testing

Configure `.env.test.local` and ensure MongoDB is running, then run:

```sh
bun run test
bun run check:static
```

Runs design/framework checks, typechecking, frontend build validation, and isolated tests using disposable `wikiplotter_test_*` databases. Runs sync-engine static design contract validation checks.

### Production

Configure production variables in `.env` or your hosting provider's environment settings.

```sh
bun run generate
bun run check:prod
bun run start
```

Build and serve the compiled Vue frontend alongside the Bun API under the same public HTTPS origin. Configure your hosting platform's port to match the backend's `PORT` setting (or the actual port variable used by the server).

Production checks must not run destructive tests against the production database.

## Project Structure

| Location | Purpose |
|---|---|
| `docs/decisions/` | Architectural decisions, Beta specifications, and scope |
| `design/concepts/` | Independent concept specifications |
| `design/compositions/` | Workflow specifications and endpoint contracts |
| `design/types.md` | Concept instances and application type bindings |
| `src/concepts/`, `src/concepts.ts` | Concept implementations and registrations |
| `src/compositions/` | Composition implementations |
| `src/http/`, `src/assembly.ts` | HTTP integration, authentication, and application assembly |
| `src/main.ts`, `src/db.ts` | Backend startup and database connectivity |
| `frontend/` | Vue application, routes, components, API modules, and styles |
| `scripts/` | Local fixtures and development utilities |
| `tests/` | Concept, composition, HTTP, and persistence tests |
| `generated/`, `generated*.config.ts` | Generated contracts and sync-engine configuration |

---

## Disclaimer

**AI assistance:** This README and portions of the project design were generated or revised with AI assistance. Generated material requires review and testing; this documentation is not evidence that the application has been fully implemented or verified.
