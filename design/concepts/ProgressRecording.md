# ProgressRecording

## Purpose

Remember one reader's selected progress position in each scope without affecting other readers or scopes.

## Principle

A reader records a position in one scope, then replaces it with an earlier position. Retrieval returns the replacement while other records remain unchanged. Clearing removes the selection; clearing again succeeds without creating a record.

## Types

```types
external Scope
  The context in which a reader records a position.
external Reader
  The identity whose selected position is remembered.
external Checkpoint
  An opaque position selected by the reader.
```

## State

```state
a set of Records with
  a scope Scope
  a reader Reader
  a checkpoint Checkpoint
  unique scope and reader
```

## Actions

```actions
record(scope: Scope, reader: Reader, checkpoint: Checkpoint): returns ()
  where a Record with scope and reader exists
  then
    replace that Record's checkpoint with checkpoint
    returns
  where no Record with scope and reader exists
  then
    add a new Record with scope, reader and checkpoint
    returns

recordIfAbsent(scope: Scope, reader: Reader, checkpoint: Checkpoint): returns (recorded: Flag)
  where a Record with scope and reader exists
  then
    leave the Record unchanged and set recorded to false
    returns recorded
  where no Record with scope and reader exists
  then
    add a Record with scope, reader and checkpoint atomically and set recorded to true
    returns recorded

clear(scope: Scope, reader: Reader) : returns (cleared: Flag)
  where a Record with scope and reader exists
  then
    remove that Record and set cleared to true
    returns cleared
  where no Record with scope and reader exists
  then
    leave state unchanged and set cleared to false
    returns cleared

clearScope(scope: Scope): returns ()
  where Records belong to scope
  then
    remove all Records in scope
    returns
  where no Records belong to scope
  then
    leave state unchanged
    returns
```

## Queries

```queries
_checkpoint(scope: Scope, reader: Reader) : optional (checkpoint: Checkpoint)
  answers the Reader's checkpoint for this scope
  answers no row for unknown scope or unknown reader in scope.

_scopesForReader(reader: Reader): many (scope: Scope)
  answers scopes for which the reader has a stored checkpoint
  orders rows by scope identity
  answers no rows when the reader has no records.
```
