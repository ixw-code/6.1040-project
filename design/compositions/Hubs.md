# Hubs

Authorized users can manage their hubs' operations, from creation to deletion, as well as its checkpoints.

**Create a hub.** The [create-hub endpoint](reaction:Hubs.CreateHub) accepts `{ name, label }`. It invokes HubCataloguing.create, passes the returned hub ID and supplied label to Checkpointing.create, then [appends](reaction:HubManagement.AppendCheckpoint) the first ordinary checkpoint with that label. Return `{ hub, sequence }` after these actions succeed. This endpoint chain connects the concepts; no separate initialization reaction repeats it. The new hub initially has no documents, and its frontend landing page displays the document list supplied by Reading.

**Rename a hub.** The [rename-hub endpoint](reaction:Hubs.RenameHub) accepts `{ hub, name }`, invokes HubCataloguing.rename, and returns `{ hub }`. The hub's identity and scoped data remain unchanged.

```endpoints
Hubs.CreateHub at /hubs/create
Hubs.RenameHub at /hubs/rename
```

**List sequences.** The [sequence-list endpoint](reaction:Hubs.GetSequences) accepts `{ hub }`. The [existing-hub view](view:HubManagement.ExistingHub) checks membership through HubCataloguing._hubs. The [sequence-list former](former:HubManagement.SequenceList) collects Checkpointing._sequences rows with `scope = hub`; the endpoint returns `{ sequences: [{ sequence }] }`.

```endpoints
Hubs.GetSequences at /hubs/sequences
```

**List checkpoints.** The [checkpoint-list endpoint](reaction:Hubs.ListCheckpoints) accepts `{ hub }`. The [hub-sequence view](view:HubManagement.HubSequence) relates the [existing hub](view:HubManagement.ExistingHub) to its sequence through Checkpointing._sequences; Alpha uses one sequence per hub. The [checkpoint-list former](former:HubManagement.CheckpointChoices) collects Checkpointing._checkpoints rows in checkpoint order; the endpoint returns `{ sequence, checkpoints: [{ checkpoint, label, position }] }`. This supplies both the progress picker and checkpoint-management controls.

**Append a checkpoint.** The [append endpoint](reaction:Hubs.AppendCheckpoint) accepts `{ hub, sequence, label }`. The [hub-sequence view](view:HubManagement.HubSequence) checks that the sequence belongs to the hub. The endpoint invokes Checkpointing.append and returns `{ checkpoint }`.

**Relabel a checkpoint.** The [relabel endpoint](reaction:Hubs.RelabelCheckpoint) accepts `{ hub, checkpoint, label }`. The [hub-checkpoint view](view:HubManagement.HubCheckpoint) checks membership through the [hub's sequence](view:HubManagement.HubSequence) and Checkpointing._checkpoints. The endpoint invokes Checkpointing.relabel with `scope = hub` and returns `{ checkpoint }`, preserving its identity and position.

```endpoints
Hubs.ListCheckpoints at /checkpoints/list
Hubs.AppendCheckpoint at /checkpoints/append
Hubs.RelabelCheckpoint at /checkpoints/relabel
```
