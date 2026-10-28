# MediaAssetManaging

## Purpose

Track uploaded media identities and their storage references independently of documents.

## Principle

A user starts an image upload, then finalizes it after its bytes have been stored and validated. The ready asset can be referenced by several documents without duplicating its bytes. Deleting its metadata makes it unavailable for future retrieval.

## Types

```types
external User
  The registered uploader of an asset.

AssetType is IMAGE or VIDEO
  The supported media kinds.

AssetStatus is PENDING or READY
  Whether an asset's bytes have been validated and made available.

opaque StorageKey
  A storage-adapter reference, never a public file path.
```

## State

```state
a set of Assets with
  an uploader User
  a filename String
  a storageKey StorageKey
  a kind AssetType
  a status AssetStatus
  a referenceRevision Number
  unique uploader and filename

Rule: The storage key is unique across assets.
Rule: Filenames are unique per uploader by exact case-sensitive comparison.
Rule: Asset identities remain stable across document edits and references.
Rule: MediaAssetManaging stores metadata and storage references, never media bytes.
Rule: A reference validation writes the asset record so it conflicts with concurrent deletion in the same transaction domain.
```

## Actions

```actions
create(uploader: User, filename: String, storageKey: StorageKey, kind: AssetType): returns (asset: Asset)
  where filename is blank after trimming or kind is unsupported
  then
    refuses INVALID_ASSET "Provide a filename and supported media kind."
  where storageKey is already used
  then
    refuses STORAGE_KEY_TAKEN "The storage key is already registered."
  where uploader already has an asset with the trimmed filename
  then
    refuses ASSET_FILENAME_TAKEN "You already have an asset with this filename."
  where input is valid and storageKey is unused
  then
    create a PENDING Asset with the trimmed filename and referenceRevision zero
    returns asset

finalize(asset: Asset): returns (asset: Asset)
  where asset does not exist
  then
    refuses ASSET_NOT_FOUND "There is no such asset."
  where asset exists
  then
    set status to READY, leaving an already READY asset unchanged
    returns asset

confirmReadyReference(asset: Asset, kind: AssetType): returns (asset: Asset)
  where asset does not exist or is not READY or its kind differs
  then
    refuses ASSET_NOT_READY "This media asset is unavailable for the requested kind."
  where asset is READY and its kind matches
  then
    increment referenceRevision atomically on the asset record
    returns asset

delete(asset: Asset): returns (asset: Asset)
  where asset does not exist
  then
    refuses ASSET_NOT_FOUND "There is no such asset."
  where asset exists
  then
    remove the Asset metadata
    returns asset
```

## Queries

```queries
_get(asset: Asset): optional (uploader: User, filename: String, storageKey: StorageKey, kind: AssetType, status: AssetStatus)
  answers the Asset metadata
  answers no row for an unknown Asset.

_uploadedBy(uploader: User): many (asset: Asset, filename: String, kind: AssetType, status: AssetStatus)
  answers Assets uploaded by the user
  orders rows by asset identity
  answers no rows when the user has uploaded no assets.
```

