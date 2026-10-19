# HubManagement

Users with access to hub management can coordinate their hub cataloguing and checkpoint management. 

**Create a hub.** The [create-hub endpoint](reaction:HubManagement.CreateHub) accepts `{ name, label }`. It invokes HubCataloguing.create, passes the returned hub ID and supplied label to Checkpointing.create, then [appends](reaction:HubManagement.AppendCheckpoint) the first ordinary checkpoint with that label. Return `{ hub, sequence }` after these actions succeed. This endpoint chain connects the concepts; no separate initialization reaction repeats it. The new hub initially has no documents, and its frontend landing page displays the document list supplied by Reading.

**Rename a hub.** The [rename-hub endpoint](reaction:HubManagement.RenameHub) accepts `{ hub, name }`, invokes HubCataloguing.rename, and returns `{ hub }`. The hub's identity and scoped data remain unchanged.

```endpoints
HubManagement.CreateHub at /hubs/create
HubManagement.RenameHub at /hubs/rename
```

**List sequences.** The [sequence-list endpoint](reaction:HubManagement.GetSequences) accepts `{ hub }`. The [existing-hub view](view:HubManagement.ExistingHub) checks HubCataloguing._hub. The [sequence-list former](former:HubManagement.SequenceList) queries Checkpointing._sequences with `scope = hub` and returns `{ sequences: [{ sequence }] }`.

```endpoints
HubManagement.GetSequences at /hubs/sequences
```

**List checkpoints.** The [checkpoint-list endpoint](reaction:HubManagement.ListCheckpoints) accepts `{ hub }`. The [hub-sequence view](view:HubManagement.HubSequence) relates the [existing hub](view:HubManagement.ExistingHub) to its sequence through Checkpointing._sequences; Alpha uses one sequence per hub. The [checkpoint-list former](former:HubManagement.CheckpointChoices) queries Checkpointing._checkpoints and returns `{ sequence, checkpoints: [{ checkpoint, label, position }] }` in checkpoint order. This supplies both the progress picker and checkpoint-management controls.

**Append a checkpoint.** The [append endpoint](reaction:HubManagement.AppendCheckpoint) accepts `{ hub, sequence, label }`. The [hub-sequence view](view:HubManagement.HubSequence) checks that the sequence belongs to the hub. The endpoint invokes Checkpointing.append and returns `{ checkpoint }`.

**Relabel a checkpoint.** The [relabel endpoint](reaction:HubManagement.RelabelCheckpoint) accepts `{ hub, checkpoint, label }`. The [hub-checkpoint view](view:HubManagement.HubCheckpoint) checks membership through the [hub's sequence](view:HubManagement.HubSequence) and Checkpointing._checkpoints. The endpoint invokes Checkpointing.relabel with `scope = hub` and returns `{ checkpoint }`, preserving its identity and position.

```endpoints
HubManagement.ListCheckpoints at /checkpoints/list
HubManagement.AppendCheckpoint at /checkpoints/append
HubManagement.RelabelCheckpoint at /checkpoints/relabel
```
