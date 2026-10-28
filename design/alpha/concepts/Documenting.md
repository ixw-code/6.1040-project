# Documenting

## Purpose

Keep complete documents within a scope and preserve the order and identities of their content blocks.

## Principle

A maintainer creates a document containing a title, text and an image. Retrieving the document in its scope returns the same blocks in the submitted order. Looking for it in another scope returns nothing.

## Types

```types
external Scope
  The context to which a document belongs.

BlockType is TEXT or IMAGE or VIDEO
  The supported content forms.

opaque Content
  The serializable String representation of the content of a block intended to be displayed.
opaque BlockInputs
  An ordered sequence of records containing kind: BlockType, body: Content, and alt: String.
```

## State

```state
a set of Documents with
  a scope Scope
  a title String
  a blocks seq of Block
  unique scope and title

a set of Blocks with
  a kind BlockType
  a body Content
  an alt String

Rule: Each Block occurs exactly once in exactly one Document's block sequence.
Rule: Each Block with a BlockType IMAGE must have alt text.
Rule: Document titles are trimmed and unique within their scope, with exact case-sensitive comparison.
Rule: Every document is created complete and immutable.
```

## Actions

```actions
create(scope: Scope, title: String, blocks: BlockInputs) : returns (document: Document)
  where title is blank after trimming
  then
    refuses DOCUMENT_TITLE_REQUIRED "A document title is required."
  where title is nonblank and a Document in scope has the trimmed title
  then
    refuses DOCUMENT_TITLE_TAKEN "This document title is already used in the scope."
  where title is nonblank and unused in scope, and any of blocks is not a valid text or image block
  then
    refuses INVALID_DOCUMENT_BLOCKS "Provide valid text or image blocks."
  where title is nonblank and unused in scope, and blocks is a complete valid ordered document
  then
    create a new document identity with scope and trimmed title
    create a new block identity for every input entry in blocks with their kind, body, and alt
    add document with the block identities in input order
    returns document
```

## Queries

```queries
_documents(scope: Scope) : many (document: Document)
  answers the Scope's documents 
  answers no rows for an unknown scope or a scope with no documents

_title(scope: Scope, document: Document) : optional (title: String)
  answers the Document's title within the supplied scope
  answers no row for an unknown scope, unknown document, or legacy document without a title

_blocks(scope: Scope, document: Document) : many (block: Block, kind: BlockType, body: Content, alt: String)
  answers the Document's blocks with their kind, body, and alt
  orders rows by sequence order upon document creation
  answers no rows for an unknown scope, or unknown document in scope
```
