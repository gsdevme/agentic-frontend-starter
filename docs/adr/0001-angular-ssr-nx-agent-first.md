# ADR 0001 — Angular 22 SSR in an Nx monorepo as the agent-first frontend platform

Date: 2026-11-05 · Status: accepted

## Context

Consolidating several Angular 20 and Next.js applications into one codebase written almost entirely
by AI agents. Hard requirements: SSR, 3–5 year horizon, stability and governance over novelty,
machine-enforceable structure, a design system as the agents' only UI vocabulary.

## Decision

- **Angular 22** with `@angular/ssr` (Node engine, per-route render modes), zoneless, standalone,
  signals. Chosen for its published 24-month support window per major, yearly majors with
  `ng update` migrations, hosting-vendor-neutral SSR, one component model (no per-file server/client
  boundary), and first-party machine-readable agent guidance.
- **Nx 24** classic layout (`tsconfig.base.json` paths) for tag-based module boundaries, generators,
  affected-only runs and the project-graph MCP.
- **Spec-driven** via the Superpowers plugin conventions (`docs/superpowers/specs|plans`), with
  repo-specific gates (REQ traceability, approved-spec immutability, acceptance-tests-first).
- **Verification** as a single `pnpm verify` entry point used by Claude Code hooks, git hooks and CI.

## Alternatives

- Next.js 16: largest corpus, but Vercel-coupled SSR features, breaking changes allowed in minors,
  frequent security releases, per-file RSC boundary decisions agents get wrong.
- React Router v8 framework mode: credible runner-up (open governance, stable non-RSC SSR); loses on
  first-party agent assets and LTS policy. Revisit if the design system turns out to be React code.
- TanStack Start: best type safety, but 1.0 only weeks old.

## Consequences

- Agents spend more tokens per component than on Svelte/React; mitigated by passive context
  (`AGENTS.md`, `docs/references/angular-v22-rules.md`) rather than on-demand skills.
- No public agent-first Angular case study exists; this repo is one. Measure: verify pass rate per
  task, review touch rate, mutation score, Faros-style defect counts.
