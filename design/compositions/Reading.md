# Reading

Serve a list of hubs, a list of documents in a hub, and a document's eligible blocks. Hidden content is excluded from the server response.

**List hubs.** The [hub-list endpoint](reaction:Reading.ListHubs) accepts `{}`. The [hub directory former](former:Reading.HubDirectory) queries HubCataloguing._hubs and returns `{ hubs: [{ hub, name }] }` in hub identity order, including an empty list when no hubs exist.

```endpoints
Reading.ListHubs at /hubs/list
```

**Browse a hub.** The [browse endpoint](reaction:Reading.BrowseHub) accepts `{ hub, reader }`. The [existing-hub view](view:Reading.ExistingHub) checks hub ID membership. The [reader-selection view](view:Reading.ReaderSelection) resolves the hub's single sequence, retrieves the reader's saved checkpoint through ProgressRecording, and obtains its inclusive token array through Checkpointing._prefixTokens. The selected checkpoint must belong to that sequence; NotStarted contributes its own token. Using only those server-derived tokens, the [readable-document view](view:Reading.ReadableDocument) selects documents belonging to the hub for which RequirementTagging._eligible is true. The [document-directory former](former:Reading.DocumentDirectory) supplies `{ documents: [{ document, title }] }` in document identity order, reading each title from Documenting._title only for eligible documents. A missing document rule hides its title. An unknown hub returns `HUB_NOT_FOUND`; a missing or invalid saved selection returns `PROGRESS_NOT_SET`.

```endpoints
Reading.BrowseHub at /hubs/browse
```

**View a document.** The [document-read endpoint](reaction:Reading.ReadDocument) accepts `{ hub, reader, document }`. It uses the same [reader selection](view:Reading.ReaderSelection) and [document eligibility](view:Reading.ReadableDocument). The [document-content former](former:Reading.DocumentContent) assembles `{ document, title, blocks: [{ block, kind, body, alt }] }` from Documenting._title and [eligible blocks](view:Reading.EligibleBlock), preserving their stored order. The endpoint returns `{ content }`, or `{ content: null }` for an unavailable document after valid hub and progress checks. Filtering may expose only an image or no currently eligible blocks. Missing rules make items ineligible, while empty rules impose no checkpoint requirement.

```endpoints
Reading.ReadDocument at /content/documents/read
```
