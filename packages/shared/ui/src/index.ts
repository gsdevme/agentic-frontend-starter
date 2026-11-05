/**
 * @starter/shared/ui — the design-system component library.
 *
 * This is the ONLY place UI primitives may live (enforced by `type:ui` boundary
 * rules in eslint.config.mjs). Components here consume design tokens exclusively
 * via `var(--ds-*)` custom properties from @starter/shared/design-tokens.
 *
 * Add a component with:
 *   pnpm nx g @nx/angular:component --path=packages/shared/ui/src/lib/<name>/<name> --export
 * and give it a `*.spec.ts` plus a `*.stories.ts` when Storybook is enabled.
 */
export {};
