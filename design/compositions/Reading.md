# Reading

Serve a list of hubs, a list of documents in a hub, and a document's eligible blocks. Hidden content is excluded from the server response.

**List hubs.** The [hub-list endpoint](reaction:Reading.ListHubs) accepts `{}`. The [hub directory former](former:Reading.HubDirectory) queries HubCataloguing._hubs and returns `{ hubs: [{ hub, name }] }` in hub identity order, including an empty list when no hubs exist.

```endpoints
Reading.ListHubs at /hubs/list
```

**Browse a hub.** The [browse endpoint](reaction:Reading.BrowseHub) accepts `{ hub, reader }`. The [reader-selection view](view:Reading.ReaderSelection) resolves the existing hub's single sequence, retrieves the reader's saved checkpoint through ProgressRecording, and verifies that it belongs to that sequence. The [progress-token former](former:Reading.ProgressTokens) collects Checkpointing._prefix rows into `{ tokens }`, including the selected checkpoint when it is ordinary; NotStarted yields no completed tokens. Using those server-derived tokens, the [readable-document view](view:Reading.ReadableDocument) selects documents belonging to the hub for which RequirementTagging._eligible is true. The [document-directory former](former:Reading.DocumentDirectory) returns `{ documents: [{ document, title }] }` in document identity order. It uses the [eligible-block view](view:Reading.EligibleBlock), which selects Documenting._blocks rows whose requirements are satisfied, to find the eligible TITLE body; otherwise the title is null. A document can appear with a null title when its TITLE block is ineligible.

```endpoints
Reading.BrowseHub at /hubs/browse
```

**View a document.** The [document-read endpoint](reaction:Reading.ReadDocument) accepts `{ hub, reader, document }`. It uses the same [reader selection](view:Reading.ReaderSelection), [progress tokens](former:Reading.ProgressTokens), and [document eligibility](view:Reading.ReadableDocument). The [document-content former](former:Reading.DocumentContent) assembles `{ document, blocks: [{ block, kind, body, alt }] }` from [eligible blocks](view:Reading.EligibleBlock), preserving their stored order and including any supported block kind. The endpoint returns `{ content }`, or `{ content: null }` for an unavailable document after valid hub and progress checks. Eligible TITLE blocks remain in the block list; filtering may expose only an image or no currently eligible blocks. Missing rules make items ineligible, while empty rules impose no checkpoint requirement.

```endpoints
Reading.ReadDocument at /content/documents/read
```
