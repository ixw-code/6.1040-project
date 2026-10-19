# Checkpointing

## Purpose

Define stable, ordered progress positions within a scope and identify which positions are completed.

## Principle

An organizer initializes a sequence, then appends two checkpoints. Selecting the second yields NotStarted and both ordinary checkpoints in its prefix. Selecting NotStarted yields its own token. Relabeling a checkpoint changes its label without changing its identity or its prefix.

## Types

```types
external Scope
  The context in which progress positions are ordered.

opaque TokenSet
  An array of checkpoint identities to validate within one sequence.
```

## State

```state
a set of Sequences with
  a unique scope Scope
  a unique label String
  a start Checkpoint
  a checkpoints seq of Checkpoint

a set of Checkpoints with
  a label String
  a position Number

Rule: Each Checkpoint belongs to exactly one Sequence.
Rule: Each sequence has at least one checkpoint at its beginning, labelled 'NotStarted'.
Rule: Checkpoints have zero-indexed positions, with 0 representing 'NotStarted'.
Rule: Checkpoints have nonblank, trimmed labels, not necessarily unique.
Rule: Checkpoint identities and order never change. Only their labels may change.
```

## Actions

```actions
create(scope: Scope, label: String) : returns (sequence: Sequence)
  where a Sequence with scope and label exists
  then
    select that existing sequence without changing state
    returns sequence
  where no Sequence with scope and label exists
  then
    allocate a sequence with label, and its distinct start checkpoint labelled NotStarted
    add sequence with scope, start and an empty ordinary checkpoint sequence
    returns sequence

append(sequence: Sequence, label: String): returns (checkpoint: Checkpoint)
  where sequence is not in Sequences
  then
    refuses SEQUENCE_NOT_FOUND "There is no such checkpoint sequence."
  where sequence is in Sequences and label is blank after trimming
  then
    refuses CHECKPOINT_LABEL_REQUIRED "A checkpoint label is required."
  where sequence is in Sequences and label is nonblank after trimming
  then
    allocate a checkpoint with the trimmed label
    append checkpoint to sequence's ordinary checkpoints
    returns checkpoint

relabel(scope: Scope, checkpoint: Checkpoint, label: String) : returns (checkpoint: Checkpoint)
  where checkpoint does not belong to a Sequence in scope
  then
    refuses CHECKPOINT_NOT_FOUND "This checkpoint does not belong to the scope."
  where checkpoint is the start of a Sequence in scope
  then
    refuses START_LABEL_FIXED "The NotStarted checkpoint cannot be relabelled."
  where checkpoint is an ordinary checkpoint in scope and label is blank after trimming
  then
    refuses CHECKPOINT_RENAME_LABEL_REQUIRED "A replacement checkpoint label is required."
  where checkpoint is a checkpoint in scope and label is nonblank after trimming
  then
    replace only checkpoint's label with the trimmed label
    returns checkpoint
```

## Queries

```queries
_sequences(scope: Scope) : many (sequence: Sequence)
  answers the scope's set of checkpoint sequences
  answers no rows if no sequences initialized.

_checkpoints(scope: Scope, sequence: Sequence) : many (checkpoint: Checkpoint, label: String, position: Number)
  answers the Sequence's checkpoints, their labels, and their positions in sequence
  orders rows by ascending position
  answers no rows for an unknown sequence or a sequence not belonging to scope

_prefix(scope: Scope, sequence: Sequence, checkpoint: Checkpoint) : many (checkpoint: Checkpoint)
  answers every checkpoint from the beginning of the Sequence, through to the supplied Checkpoint, inclusive
  orders rows by ascending position
  answers no rows for an unknown sequence, wrong scope, or checkpoint outside the sequence.

_prefixTokens(scope: Scope, sequence: Sequence, checkpoint: Checkpoint) : optional (tokens: TokenSet)
  answers the same inclusive, ordered prefix as _prefix in one token array
  answers no row for an unknown sequence, wrong scope, or checkpoint outside the sequence.

_contains(scope: Scope, sequence: Sequence, tokens: TokenSet) : one (valid: Flag)
  answers true exactly when the sequence belongs to the scope and every supplied token is one of its checkpoints, including NotStarted
  answers false for an unknown sequence, wrong scope, or any unknown token
```
