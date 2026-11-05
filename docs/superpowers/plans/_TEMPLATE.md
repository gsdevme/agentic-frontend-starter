# <Feature> Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (or
> `superpowers:executing-plans`) to implement this plan task by task. Steps use checkbox syntax.

**Goal:** one sentence.
**Architecture:** 2–3 sentences (which libraries, which layer each piece lives in).
**Tech Stack:** Angular 22 SSR, signals, Signal Forms, `httpResource`, design-system components.
**Spec:** docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
**Global Constraints:** (copied verbatim from the spec, one per line)
**Review Focus:** the 5 most likely failure modes, each paired with the test that covers it.

---

### Task 0: Acceptance tests (acceptance-author subagent, separate commit)

**Files:** Create `apps/shell-e2e/src/<feature>.spec.ts`
**Closes:** REQ-… (scenarios only; they must fail at this point)

### Task 1: Scaffold

- [ ] `pnpm nx g @starter/tools:feature <name> --scope=<scope> --spec=<spec path>`
- [ ] `pnpm verify:quick` passes
- [ ] commit `feat(<feature>): scaffold`

### Task N: <Component / service>

**Files:** Create …, Modify … (line ranges), Test …
**Interfaces:** Consumes …; Produces … (exact signatures)
**Closes:** REQ-<AREA>-00X, REQ-<AREA>-00Y

- [ ] write failing test `[REQ-…] …`
- [ ] `pnpm nx test <project>` — red
- [ ] implement
- [ ] `pnpm nx test <project>` — green
- [ ] `pnpm verify:quick`
- [ ] commit

### Final: gate and review

- [ ] `pnpm verify` (full) — paste summary line
- [ ] `spec-reviewer` subagent → APPROVE
- [ ] `superpowers:finishing-a-development-branch`
