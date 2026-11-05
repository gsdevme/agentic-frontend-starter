---
name: writing-requirements
description: How to write requirement lines (EARS style, REQ ids) and acceptance scenarios (Given/When/Then) in specs so they are testable and traceable in this repo. Use while brainstorming or writing a design doc.
---

# Writing requirements that agents can verify

## Requirement ids

`REQ-<AREA>-NNN` — AREA is UPPER-KEBAB (`INVOICE-LIST`), NNN is zero-padded and never reused.
Every `it(`/`test(` title starts with the id in square brackets. `scripts/verify/require-req-ids.mjs`
fails the build when an approved REQ has no test, or a test has no REQ.

## EARS patterns (one requirement = one assertion)

- Ubiquitous: `The <feature> SHALL <response>.`
- Event-driven: `WHEN <trigger> the <feature> SHALL <response>.`
- State-driven: `WHILE <state> the <feature> SHALL <response>.`
- Unwanted: `IF <condition> THEN the <feature> SHALL <response>.`
- Optional: `WHERE <option enabled> the <feature> SHALL <response>.`

Good: `REQ-INVOICE-LIST-003 — WHEN the API returns 0 invoices the list SHALL show the empty state "No invoices yet" and no table.`
Bad: `The list should handle empty data gracefully.` (not observable, not assertable)

## Acceptance scenarios (end-to-end oracle)

```
Given <state, in user terms>
When <one user action>
Then <observable outcome: text, URL, ARIA state, HTTP response>
```

One scenario per primary path, one per listed failure mode. Each cites the REQ ids it covers.
Scenarios become Playwright tests written by the `acceptance-author` subagent before implementation.

## Mandatory sections in every spec

Intent · Goals/Non-goals/Anti-goals · Constraints · Requirements · Acceptance scenarios ·
Approaches considered · Left to the builder · `Status:` line. Render mode other than `server`
needs a sentence of justification under Constraints.

## Mark ambiguity, don't resolve it

Write `[NEEDS CLARIFICATION: …]` inline. The spec cannot be approved while any remain.
