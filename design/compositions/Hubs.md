# Hubs

Hubs coordinates hub creation and management. HubCataloguing owns each hub's creator, display name, stable identity, and URL slug. Checkpointing owns its one ordered sequence. A hub's creator alone may rename it, change its slug, modify checkpoints, or delete it. Any registered User may create a hub. Reading remains available to guests.

The [create endpoint](reaction:Hubs.CreateHub) obtains the User from Sessioning.use, calls HubCataloguing.create with that creator, creates the hub's checkpoint sequence, and appends its first ordinary checkpoint. These changes commit together in an application-coordinated MongoDB transaction, so a visible hub always has its sequence and NotStarted position. A duplicate name or derived slug refuses creation without a partial hub. The [rename endpoint](reaction:Hubs.RenameHub) and [slug endpoint](reaction:Hubs.UpdateSlug) use the [creator view](view:Hubs.IsCreator) before changing HubCataloguing state. Renaming never changes the slug; changing the slug never changes the name. The access endpoint resolves the current User from Sessioning and returns only whether the user is the hub creator, allowing the UI to display protected controls without exposing creator identity.

```endpoints
Hubs.CreateHub at /hubs/create
Hubs.RenameHub at /hubs/rename
Hubs.UpdateSlug at /hubs/slug
Hubs.GetHubAccess at /hubs/access
```

The [sequence-list endpoint](reaction:Hubs.GetSequences) and [checkpoint-list endpoint](reaction:Hubs.ListCheckpoints) use the [existing-hub view](view:Hubs.ExistingHub) and [hub-sequence view](view:Hubs.HubSequence). The [sequence former](former:Hubs.SequenceList) and [checkpoint former](former:Hubs.CheckpointChoices) return deterministic order. The [append endpoint](reaction:Hubs.AppendCheckpoint) and [relabel endpoint](reaction:Hubs.RelabelCheckpoint) require the creator, validate hub/sequence/checkpoint membership, then invoke Checkpointing. NotStarted cannot be relabeled. Deleting or reordering an individual checkpoint is outside Beta: a stored selection or requirement token must not silently change meaning.

```endpoints
Hubs.GetSequences at /hubs/sequences
Hubs.ListCheckpoints at /checkpoints/list
Hubs.AppendCheckpoint at /checkpoints/append
Hubs.RelabelCheckpoint at /checkpoints/relabel
```

The [delete endpoint](reaction:Hubs.DeleteHub) verifies the creator, then removes every article in the hub and its article/block requirement rules, the hub's ProgressRecording records, its checkpoint sequence, and the HubCataloguing entry in one database transaction. The composition obtains all dependent IDs before deleting them. Failure rolls back all database changes; a retry starts from the intact hub. Readers build a response from a consistent snapshot and require an existing hub, so they see either the prior valid hub or no hub. Uploader-owned assets remain in their libraries. Their bytes and metadata are not hub-scoped; article references disappear with the deleted articles. No persistent DELETING state is needed.

```endpoints
Hubs.DeleteHub at /hubs/delete
```

These transaction and read-snapshot requirements are application storage coordination, not guarantees supplied by sync-engine. Each concept still owns and executes its own state operations; the composition controls their order and the shared MongoDB transaction boundary.
