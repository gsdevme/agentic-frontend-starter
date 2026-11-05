# Shell application — design

Status: approved
Owner: platform
Approved by: (template author) · 2026-11-05

## Intent

A single SSR Angular application ("shell") that owns layout, routing and server entry, and
mounts every business feature as a lazy-loaded library. It is the only deployable.

## Goals / non-goals / anti-goals

- Goals: server-rendered first paint on every route; accessible landmarks; one place for auth and
  session plumbing; zero business logic.
- Non-goals: micro-frontends, runtime module federation, multiple deployables.
- Anti-goals: feature code in `apps/shell`; UI primitives outside `packages/shared/ui`.

## Constraints

- Angular 22, zoneless, OnPush everywhere, standalone only (lint-enforced).
- SSR via `@angular/ssr` Node engine; per-route render mode in `app.routes.server.ts`.
- Styling through design tokens only.

## Requirements

- REQ-SHELL-001 — The shell renders a `<main id="main">` landmark containing the router outlet.
- REQ-SHELL-002 — The first focusable element is a skip link targeting `#main`.
- REQ-SHELL-003 — The default route `/` renders a placeholder page with a single h1 until a feature redirects it.
- REQ-SHELL-004 — Unknown URLs render a not-found page and the server responds with HTTP 404.
- REQ-SSR-001 — Every route renders meaningful HTML with JavaScript disabled.
- REQ-SSR-002 — Hydration completes with no console or page errors.
- REQ-SSR-003 — Rendered pages have no WCAG 2.2 AA violations (axe-core).
- REQ-SSR-004 — `GET /healthz` returns `200 {"status":"ok"}`.
- REQ-DS-001 — Every design-system component has a colocated spec.
- REQ-DS-002 — Design-system stylesheets reference tokens only (no raw colours or px sizes).
- REQ-DS-003 — Every design-system component is exported from the library's public index.

## Acceptance scenarios

Given the production SSR server is running
When a client with JavaScript disabled requests `/`
Then the response is 200 and contains the rendered `<main>` landmark.

Given a browser loads `/`
When Angular hydrates
Then no console errors are emitted and axe reports zero violations.

## Approaches considered

1. Angular SSR with lazy feature libraries (chosen): one build, one deploy, boundaries by tags.
2. Module Federation: rejected — the Angular team does not support it and the repo has one owner.

## Left to the builder

Header content, navigation and auth are specified per feature; the shell exposes slots only.
