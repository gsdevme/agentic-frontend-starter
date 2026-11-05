# Library layers and boundaries

Two tag dimensions on every project (`project.json` → `tags`):

| `type:`   | Lives in                                                              | May depend on                   | Purpose                                                  |
| --------- | --------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------- |
| `app`     | `apps/shell`                                                          | feature, ui, data, util, tokens | Layout, routing, server entry. No business logic.        |
| `feature` | `packages/<scope>/feature-<name>`                                     | ui, data, util, tokens          | A routed slice of the product. Leaf: nothing imports it. |
| `ui`      | `packages/shared/ui` (and `packages/<scope>/ui-*` for scope-specific) | ui, util, tokens                | Presentational components. No HTTP, no state stores.     |
| `data`    | `packages/<scope>/data`                                               | data, util                      | API clients, stores, mappers. No DOM.                    |
| `util`    | `packages/<scope>/util-*`                                             | util                            | Pure functions and types.                                |
| `tokens`  | `packages/shared/design-tokens`                                       | —                               | Design tokens.                                           |
| `e2e`     | `apps/*-e2e`                                                          | util                            | Acceptance tests.                                        |
| `tooling` | `tools/*`                                                             | tooling                         | Generators and scripts.                                  |

| `scope:`   | Rule                                                          |
| ---------- | ------------------------------------------------------------- |
| `shared`   | May depend only on `shared`. Cannot own features.             |
| `<domain>` | May depend on itself and `shared`. Registered in `scopes.md`. |

Enforced twice: `@nx/enforce-module-boundaries` in `eslint.config.mjs` (fast, per import) and
`.dependency-cruiser.cjs` in `pnpm verify` (whole graph: cycles, orphans, features-are-leaves,
server-only code).

## Import rules

- Only through the alias: `import { X } from '@starter/<scope>/<lib>'`. Deep paths are linted out.
- `index.ts` lists named exports; `export *` is banned so the public API is reviewable.
- Features are mounted by the shell via `loadChildren` only (the generator writes this).

## Adding things

| Want           | Do                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A new feature  | `pnpm nx g @starter/tools:feature <name> --scope=<scope> --spec=<approved spec>`                                                                                          |
| A UI component | `pnpm nx g @nx/angular:component --path=packages/shared/ui/src/lib/<name>/<name> --export`                                                                                |
| A data library | `pnpm nx g @nx/angular:library --directory=packages/<scope>/data --name=<scope>-data --tags=scope:<scope>,type:data --buildable` (a dedicated generator is a planned ADR) |
| A new scope    | Human: row in `scopes.md`, entry in `SCOPES` in `eslint.config.mjs`, ADR.                                                                                                 |
