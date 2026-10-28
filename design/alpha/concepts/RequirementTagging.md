# RequirementTagging

## Purpose

Classify items by required tokens so eligibility can be determined from a supplied set of tokens.

## Principle

An item is tagged with two required tokens. Supplying only one does not make it eligible; supplying both does. Replacing the rule with an empty set makes it eligible with no tokens. Removing the rule makes it ineligible again.

## Types

```types
external Item
  The identity being classified.
external Token
  An opaque identity that may be required or supplied.

opaque TokenSet
  An array of Token identities interpreted as a set; duplicates and order do not affect membership.
```

## State

```state
a set of Rules with
  a unique item Item
  a required set of Token
```

## Actions

```actions
tag(item: Item, required: TokenSet) : returns ()
  where a Rule for item exists
  then
    replace that Rule's required set with the distinct tokens in required
    returns
  where no Rule for item exists
  then
    add a Rule for item with the distinct tokens in required
    returns

untag(item: Item) : returns ()
  where a Rule for item exists
  then
    remove that Rule
    returns
  where no Rule for item exists
  then
    refuses REQUIREMENT_RULE_NOT_FOUND "This item has no requirement rule."
```

## Queries

```queries
_rule(item: Item) : optional (required: TokenSet)
  answers Item's required tokens
  answers no row if item has no rule

_eligible(item: Item, tokens: TokenSet) : one (eligible: Flag)
  answers true exactly when item's rule exists and every required token occurs in tokens, including an empty set of required tokens
  answers false for an unclassified item
```
