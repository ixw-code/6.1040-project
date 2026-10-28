# ContentManagement

Compose article creation and validation, and assigns checkpoint requirements to documents and blocks. Handles the live editing flow for authenticated users.

**Create a document.** The [create-document endpoint](reaction:ContentManagement.CreateDocument) accepts `{ hub, title, blocks }`. Runtime input validation checks the nonblank title and block records before creation; each input block is TEXT or IMAGE with a string body and alt, and IMAGE alt text is nonblank. The [existing-hub view](view:ContentManagement.ExistingHub) checks HubCataloguing._hubs for the hub ID, then the endpoint invokes Documenting.create with `scope = hub`. The [created-document former](former:ContentManagement.CreatedDocument) retrieves the new blocks through Documenting._blocks and returns `{ document, blocks }`, where blocks contains their IDs in stored order. The title is stored separately on the document. Documents and blocks remain ineligible until explicitly tagged.

```endpoints
ContentManagement.CreateDocument at /setup/documents/create
```

**Tag an item.** The [tag endpoint](reaction:ContentManagement.TagItem) accepts `{ hub, item, required }`. The [scoped-document view](view:ContentManagement.ScopedDocument) and [scoped-block view](view:ContentManagement.ScopedBlock) use the [existing hub](view:ContentManagement.ExistingHub), Documenting._documents, and Documenting._blocks to verify that the item belongs to that hub. The [allowed-requirements view](view:ContentManagement.AllowedRequirements) resolves the hub's sequence and checks every supplied token through Checkpointing._contains. The endpoint invokes RequirementTagging.tag and returns `{ item }`. Tagging replaces the item's entire requirement set; an empty set imposes no checkpoint requirement. Invalid item and token references are refused without changing a rule.

```endpoints
ContentManagement.TagItem at /setup/items/tag
```

**Untag an item.** The [untag endpoint](reaction:ContentManagement.UntagItem) accepts `{ hub, item }`. The [scoped-document](view:ContentManagement.ScopedDocument) or [scoped-block](view:ContentManagement.ScopedBlock) view checks membership before the endpoint invokes RequirementTagging.untag and returns `{ item }`. Removing the rule makes the item ineligible.

```endpoints
ContentManagement.UntagItem at /setup/items/untag
```
