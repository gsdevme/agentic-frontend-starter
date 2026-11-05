# @starter/shared/design-tokens

Design tokens are the only source of colour, spacing, radius and typography values in this repo
(tags: `scope:shared`, `type:tokens`).

```
tokens/*.json      DTCG (Design Tokens Community Group, 2025.10) source — EDIT THESE
build.mjs          Style Dictionary 5 build
src/tokens.css     generated: `:root { --ds-… }` custom properties (loaded globally by apps/shell)
src/tokens.ts      generated: JS constants
src/tokens.d.ts    generated: string-literal types (use for typed token props in components)
```

## Importing your Claude design system

1. Export the design system's tokens as DTCG JSON (one file per group is fine) into `tokens/`.
   Keep the top-level groups `color`, `space`, `radius`, `font` so the generated variable names
   (`--ds-color-*`, `--ds-space-*`, …) stay stable for existing CSS.
2. `pnpm tokens` → regenerates `src/`. Commit the output; `pnpm verify` fails if it is stale.
3. Implement each component spec from the design system in `packages/shared/ui`, styling with
   `var(--ds-*)` only. The UI conformance test rejects raw colours and px sizes.

The placeholder values shipped here are intentionally bland so that a page styled with them is
obviously "unthemed".

## Rules

- Never edit `src/` by hand (hook-blocked). Never reference a hex colour outside this package.
- Adding a token is a design decision: do it in the design system first, then export.
