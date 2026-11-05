# ADR 0002 — Node.js: always the newest Active LTS, pinned in `.nvmrc`

Date: 2026-11-05 · Status: accepted

## Context

The shell ships as a container image (`Dockerfile`) and is built and tested locally, in CI and in
that image. Until now nothing pinned Node: developers, CI and the image could run different majors,
and a bug that only shows on one of them shows up late. Node 26 (Lithium) became Active LTS on
2026-10-28. Angular 22 supports `^22.22.3 || ^24.15.0 || ^26.0.0`. The repo targets a 3–5 year
horizon (ADR 0001), so it will go through several Node LTS lines.

## Decision

- **Always the newest Active LTS line.** Node promotes a new LTS every October. Bump to it within
  one sprint of the promotion.
- **`.nvmrc` is the only place the major is written in full.** Everything else either reads it
  (`actions/setup-node` via `node-version-file`, nvm, fnm) or is checked against it:
  - `package.json#engines` (`>=26 <27`) with `engine-strict=true` in `.npmrc`, so `pnpm install`
    refuses another major;
  - the `Dockerfile` `NODE_MAJOR` build argument used by both `FROM` lines (Docker cannot read
    `.nvmrc`);
  - the `node version` stage of `pnpm verify` (`scripts/verify/node-version.mjs`), which fails when
    the running Node or the `Dockerfile` disagrees with `.nvmrc`.
- **Only Angular's supported Node range may delay a bump.** If the current Angular major does not
  yet support the new LTS, stay on the previous one until it does, then bump.

## Alternatives

- **Pin to the oldest supported LTS:** each line lasts longer, but the repo always lags. When the
  forced upgrade comes, it is two majors behind and takes two majors of breaking changes at once.
- **Follow Current:** newest features, but Current lines change every six months, odd majors never
  become LTS, and Angular rarely supports a major on its release day.
- **No pin:** whatever each machine has installed. This is the drift the decision exists to remove.

## Consequences

- Once a year, the bump touches `.nvmrc`, `package.json#engines`, the `Dockerfile` `NODE_MAJOR`
  argument and CI together, in one PR. `pnpm verify` fails until they agree.
- Contributors must run `nvm use` (or `fnm use`) before `pnpm install`. Node >= 25 no longer ships
  corepack, so pnpm is installed with `npm i -g pnpm@<packageManager version>`.
- Follow-up: Renovate (or Dependabot) for the base-image digests, so patch and security releases of
  `node:<major>-slim` and the distroless runtime arrive without manual work.
