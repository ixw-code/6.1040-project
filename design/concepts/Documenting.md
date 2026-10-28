# Documenting

## Purpose

Keep complete documents within a scope and preserve the order and identities of their content blocks.

## Principle

A maintainer creates a document containing a title, text and an image. Retrieving the document in its scope returns the same blocks in the submitted order. Looking for it in another scope returns nothing.

## Types

```types
external Scope
  The context to which a document belongs.

external User
  The registered original author of a document.

BlockType is TEXT or IMAGE or VIDEO
  The supported content forms.

opaque Content
  The serializable String representation of the content of a block intended to be displayed.
opaque BlockInputs
  An ordered sequence of records containing kind: BlockType, body: Content, alt: String, and, only for update, an optional existing block identity.
```

## State

```state
a set of Documents with
  a scope Scope
  a title String
  an author User
  a blocks seq of Block
  unique scope and title

a set of Blocks with
  a kind BlockType
  a body Content
  an alt String

Rule: Each Block occurs exactly once in exactly one Document's block sequence.
Rule: Each Block with a BlockType IMAGE must have alt text.
Rule: Document titles are trimmed and unique within their scope, with exact case-sensitive comparison.
Rule: Document and surviving Block identities remain stable across edits; newly inserted blocks receive new identities.
Rule: TEXT bodies are literal text. IMAGE and VIDEO bodies are asset identities, not media bytes or URLs.
Rule: Documenting owns content and scope but does not decide reader visibility.
```

## Actions

```actions
create(scope: Scope, author: User, title: String, blocks: BlockInputs) : returns (document: Document)
  where title is blank after trimming
  then
    refuses DOCUMENT_TITLE_REQUIRED "A document title is required."
  where title is nonblank and a Document in scope has the trimmed title
  then
    refuses DOCUMENT_TITLE_TAKEN "This document title is already used in the scope."
  where title is nonblank and unused in scope, and any block is invalid or supplies an existing block identity
  then
    refuses INVALID_DOCUMENT_BLOCKS "Provide valid text, image, or video blocks."
  where title is nonblank and unused in scope, and blocks is a complete valid ordered document
  then
    create a new document identity with scope, author, and trimmed title
    create a new block identity for every input entry in blocks with their kind, body, and alt
    add document with the block identities in input order
    returns document

update(scope: Scope, document: Document, blocks: BlockInputs): returns (document: Document, blocks: BlockInputs)
  where document does not belong to scope
  then
    refuses DOCUMENT_NOT_FOUND "There is no such document in the scope."
  where blocks are invalid or reuse an existing block identity from another document or twice
  then
    refuses INVALID_DOCUMENT_BLOCKS "Provide valid text, image, or video blocks."
  where document belongs to scope and blocks are valid
  then
    replace its ordered block sequence and values as one Documenting state change
    preserve identities for supplied existing blocks and allocate identities for new blocks
    remove omitted blocks from document state
    returns document, blocks

rename(scope: Scope, document: Document, title: String): returns (title: String)
  where document does not belong to scope
  then
    refuses DOCUMENT_NOT_FOUND "There is no such document in the scope."
  where title is blank after trimming
  then
    refuses DOCUMENT_TITLE_REQUIRED "A document title is required."
  where another Document in scope has the trimmed title
  then
    refuses DOCUMENT_TITLE_TAKEN "This document title is already used in the scope."
  where document belongs to scope and title is available
  then
    replace its title while retaining identity
    returns title

delete(scope: Scope, document: Document): returns (document: Document)
  where document does not belong to scope
  then
    refuses DOCUMENT_NOT_FOUND "There is no such document in the scope."
  where document belongs to scope
  then
    remove the document and its blocks
    returns document
```

## Queries

```queries
_documents(scope: Scope) : many (document: Document)
  answers the Scope's documents in document identity order
  answers no rows for an unknown scope or a scope with no documents.

_title(scope: Scope, document: Document) : optional (title: String)
  answers the Document's title within the supplied scope
  answers no row for an unknown scope, unknown document, or legacy document without a title.

_blocks(scope: Scope, document: Document) : many (block: Block, kind: BlockType, body: Content, alt: String)
  answers the Document's blocks with their kind, body, and alt
  orders rows by current document sequence
  answers no rows for an unknown scope, or unknown document in scope.

_documentForEditing(scope: Scope, document: Document): optional (title: String, author: User, blocks: BlockInputs)
  answers the full document in its scope for authorized composition workflows
  answers no row for an unknown document or wrong scope.

_authoredBy(author: User): many (scope: Scope, document: Document)
  answers documents authored by the User
  orders rows by document identity
  answers no rows when the user has authored no documents.
```
