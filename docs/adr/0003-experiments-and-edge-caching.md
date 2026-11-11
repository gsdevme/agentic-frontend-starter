# ADR 0003 — Experiments are a spec-level decision; cached pages vary on one boolean cookie

Date: 2026-11-11 · Status: proposed

## Context

We want A/B testing available to almost every feature, not bolted on per page. Three facts shape
how:

- Every route renders on the server by default (rule 3.2), so a variant has to be known during the
  server render or the page flickers on hydration.
- Some pages will sit behind CloudFront. A cached page that varies by anything outside the cache
  key serves one visitor's variant to everyone, and a cached `Set-Cookie` header gives every
  visitor the same cookie. Both fail without any visible error.
- This repo enforces rules through specs, generators and `pnpm verify`. A convention with no gate
  does not hold in an agent-maintained codebase.

## Decision

- **Every feature spec decides.** A spec declares an experiment (hypothesis, variants, primary
  metric, split, expiry date) or states why it has none. Variants are ordinary `REQ` lines, so the
  existing traceability gate requires a test for each.
- **Every route has one cache class:** `uncached`, `cached` or `cached-varied`. The spec declares
  it and `app.routes.server.ts` carries it.
  - `uncached`: the server assigns. `server.ts` mints a visitor id cookie and the variant is a
    pure hash of that id and the experiment key.
  - `cached`: no experiments. Prerendered routes are in this class.
  - `cached-varied`: the CDN cache key includes one boolean treatment cookie, set by browser code
    after hydration and only for treatment visitors. The CDN holds two copies per page. One
    experiment per page at a time, taking effect from the visitor's second page view.
- **No edge code.** The CDN configuration is a one-time change: the treatment cookie in the cache
  key, lifetimes taken from the origin's `Cache-Control`. It does not change per experiment.
- **The origin never sends `Set-Cookie` on a cacheable response**, and the HTML of a cached route
  depends only on the URL and the treatment cookie.
- **The runtime is two `scope:shared` libraries** (`util-experiments`, `data-experiments`) created
  by generators. Experiment definitions live in the feature that runs them.
- **Experiments expire.** A verify stage fails on an experiment past its expiry date.

The full model is in `docs/architecture/experiments.md`.

## Alternatives

- **Edge-cached pages never run experiments:** the simplest rule, and still the default class
  (`cached`). Rejected as the only option because the most-visited pages are usually the cached
  ones.
- **Assign at the edge with CloudFront Functions:** allows first-view tests on cached pages, but
  puts bucketing logic in two places and adds edge code to maintain. Revisit with a new ADR if a
  cached page needs a first-impression test.
- **A numeric bucket cookie (`0`–`9`):** finer splits, but the policy applies to every cached page,
  so each would be stored eleven times whether or not it runs an experiment.
- **Visitor id in the cache key:** one cache entry per visitor, which is no cache.
- **Apply variants in the browser only:** keeps one cached copy, but anything above the fold
  flickers after hydration.

## Consequences

- On `cached-varied` pages the first page view is always control, only visitors with a second page
  view are in the experiment, and all such pages share one treatment group and one split.
- Each variant doubles that feature's acceptance tests and counts against the bundle budget.
- Prerequisites that do not exist yet: an analytics port for exposure events, and a decision on
  cookie consent.
- Follow-up, in order: a platform spec (`REQ-EXP-NNN`); the two libraries and the `server.ts`
  change; then the spec template section, spec gate check, feature generator option, verify stage
  and constitution rule. The template, generator templates, constitution and e2e fixtures are
  human-owned, so those edits need explicit sign-off.
- The CDN configuration lives outside this repo and must follow the contract in
  `docs/architecture/experiments.md`.
