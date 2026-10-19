# ContentManagement

Content Management composes article creation and validation, and assigns checkpoint requirements to documents and blocks.

**Create a document.** The [create-document endpoint](reaction:ContentManagement.CreateDocument) accepts `{ hub, blocks }`. Runtime input validation checks the block records before creation; each has a supported kind, body, and alt. The [existing-hub view](view:ContentManagement.ExistingHub) checks HubCataloguing._hub, then the endpoint invokes Documenting.create with `scope = hub`. The [created-document former](former:ContentManagement.CreatedDocument) retrieves the new blocks through Documenting._blocks and returns `{ document, blocks }`, where blocks contains their IDs in stored order. A TITLE block is optional, so a document can contain just an image. Documents and blocks remain ineligible until explicitly tagged.

```endpoints
ContentManagement.CreateDocument at /setup/documents/create
```

**Tag an item.** The [tag endpoint](reaction:ContentManagement.TagItem) accepts `{ hub, item, required }`. The [scoped-item view](view:ContentManagement.ScopedItem) uses the [existing hub](view:ContentManagement.ExistingHub), Documenting._documents, and Documenting._blocks to verify that the item is a document or block in that hub. The [allowed-requirements view](view:ContentManagement.AllowedRequirements) resolves the hub's sequence and checks that every supplied token is one of its checkpoints. The endpoint invokes RequirementTagging.tag and returns `{ item }`. Tagging replaces the item's entire requirement set; an empty set imposes no checkpoint requirement.

```endpoints
ContentManagement.TagItem at /setup/items/tag
```

**Untag an item.** The [untag endpoint](reaction:ContentManagement.UntagItem) accepts `{ hub, item }`. The [scoped-item view](view:ContentManagement.ScopedItem) checks membership before the endpoint invokes RequirementTagging.untag and returns `{ item }`. Removing the rule makes the item ineligible.

```endpoints
ContentManagement.UntagItem at /setup/items/untag
```
