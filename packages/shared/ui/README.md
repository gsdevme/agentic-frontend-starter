# @starter/shared/ui

Design-system component library (tags: `scope:shared`, `type:ui`).

- Components may depend only on `type:ui`, `type:util` and `type:tokens` libraries.
- Styling uses token custom properties (`var(--ds-*)`) only. Raw colour literals, pixel
  spacing and font sizes are rejected by the `design-tokens` Stylelint rules.
- Every component ships with a spec (`*.spec.ts`) covering render, inputs and accessibility.
- Import this library from a feature as `@starter/shared/ui`; never import `src/lib/**` paths.

Populate it from your Claude design system: export the tokens into
`packages/shared/design-tokens/tokens/*.json`, then implement each component spec here.
