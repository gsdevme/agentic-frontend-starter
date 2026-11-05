# Scopes registry

Every library carries exactly one `scope:*` tag. A scope is a bounded business domain owned by
one team (or, in an agent-maintained repo, one spec area). `shared` is reserved for cross-cutting
code and may never own a feature.

**To add a scope** (humans only — this is an architectural decision):

1. Add a row below.
2. Add the scope to `SCOPES` in `eslint.config.mjs`.
3. Record the decision in `docs/adr/`.

The `feature` generator refuses scopes that are not in this table.

| Scope | Owner | Description |
| --- | --- | --- |
| `shared` | platform | Cross-cutting: design tokens, UI library, utilities. Cannot contain features. |
| `shell` | platform | The root application: layout, routing, auth plumbing, server entry. |
