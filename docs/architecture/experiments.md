# Experiments (A/B testing) and edge caching

> **Status: design only.** Decided in `docs/adr/0003-experiments-and-edge-caching.md` (proposed).
> None of this is built and `pnpm verify` enforces none of it yet. Do not add experiment code to a
> feature until the platform spec is approved. Until then this file is the reference for writing
> that spec, and for any spec that mentions caching.

## The model

An experiment shows different visitors different variants of a page and compares a metric between
them. In this repo:

- every feature spec decides whether it runs an experiment, or says why not;
- each variant is an ordinary requirement with its own `REQ` id and tests;
- one shared runtime tells a feature which variant to render.

Which pages can run experiments, and how, depends on whether a CDN (CloudFront) caches the page's
HTML. That is what the cache class records.

## Cache classes

Every route has exactly one cache class. The spec declares it under Constraints, next to the render
mode.

| Class           | What the CDN holds                                                | Experiments                                                     | Who assigns the visitor  |
| --------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------ |
| `uncached`      | Nothing. The origin renders every request.                        | Any number, any split, from the first page view.                | The server (`server.ts`) |
| `cached`        | One copy per URL, shared by everyone. Includes prerendered pages. | None.                                                           | —                        |
| `cached-varied` | Two copies per URL: default and treatment.                        | One at a time per page, from the visitor's second page view on. | The browser              |

**The rule for both cached classes:** the HTML may depend only on the URL and, for `cached-varied`,
on the treatment cookie. It must not depend on the visitor id, a session, sign-in state, or any
other cookie or header. A page that needs any of those is `uncached`.

## Two failures this design prevents

Both are silent: the page works, and the experiment data is wrong.

1. **Everyone gets one variant.** If a cached page varies by something outside the cache key, the
   CDN stores whichever variant the first visitor got and serves it to everyone.
2. **Everyone gets one visitor id.** If the origin sends `Set-Cookie` on a cacheable response,
   CloudFront caches that header and hands the same cookie to every visitor. The origin therefore
   never sets a cookie on a `cached` or `cached-varied` route.

## How `uncached` routes assign a variant

1. `apps/shell/src/server.ts` reads the visitor id cookie, or mints one, and passes the id into the
   render. Rule 3.3 of the constitution puts Node APIs only in that file.
2. The variant is a pure function: hash of visitor id plus experiment key, mapped onto the
   experiment's split. Server and browser compute the same answer, so hydration does not flicker.
3. The response carries `Cache-Control: private, no-store`.

## How `cached-varied` routes assign a variant

There is no edge code. The CDN's cache key includes one boolean cookie, the treatment cookie.

1. A visitor without the treatment cookie gets the default copy, which is the control variant.
2. After hydration, browser code assigns the visitor once: treatment or control.
   - Treatment: it writes the treatment cookie with the value `1`.
   - Control: it writes no treatment cookie. It records the assignment in a separate marker that is
     not in the cache key, so exposure tracking can still count the visitor.
3. The page already on screen stays as the server rendered it. The assignment applies from the next
   navigation.
4. Later, in-app navigations render the variant in the browser from the cookie, and full page loads
   receive the cached copy that matches the cookie.

Limits that come with this, accepted in the ADR:

- **No first-impression tests.** The first page view is always control. A test that must reach
  visitors who leave after one view needs an `uncached` route.
- **A narrower population.** Only visitors who reach a second page view are in the experiment.
  Exposure is counted only when a variant renders for an assigned visitor, so results stay valid
  for that population.
- **One treatment group and one split for the whole site.** The cookie is generic, so a visitor in
  treatment is in treatment on every `cached-varied` page. Run one experiment per page, and run
  experiments whose effects could interact one after the other.
- **Shorter assignment on Safari.** Safari caps cookies written by script at about seven days, so
  some visitors are assigned again.
- **Unknown cookie values.** The CDN stores a separate copy for any value it is sent. The origin
  treats every value other than `1` as control. A WAF rule on the cookie value stops junk values
  from bypassing the cache.

## CDN contract

Configured once in infrastructure code, which lives outside this repo. It does not change when
experiments start or stop.

- The cache key is the URL plus the treatment cookie, and no other cookie.
- The CDN takes each page's lifetime from the origin's `Cache-Control` header, so the route decides
  whether it is cached. `uncached` routes send `private, no-store`.
- The origin never sends `Set-Cookie` on a cacheable response.
- Optional: a WAF rule that rejects treatment cookie values other than `1`.

## Where the code will live

| Piece                                               | Where                                            | Why there                                                                       |
| --------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Visitor id cookie                                   | `apps/shell/src/server.ts`                       | Node APIs live only here (rule 3.3).                                            |
| Bucketing function, experiment definition type      | `packages/shared/util-experiments` (`type:util`) | Pure logic, covered by the mutation gate (rule 5.5).                            |
| Variant signal, browser assignment, exposure events | `packages/shared/data-experiments` (`type:data`) | Features may import `data`, so they branch with `@if` in their own template.    |
| Cache class and `Cache-Control` per route           | `apps/shell/src/app/app.routes.server.ts`        | Sits beside the render mode; the feature generator writes it.                   |
| Experiment definitions                              | Inside the feature library that runs them        | A central registry in `shared` would make every experiment affect every project |
| Forcing a variant in acceptance tests               | A fixture in `apps/shell-e2e/src/fixtures/`      | Each variant gets the same axe and no-JavaScript checks.                        |
| Analytics adapter for exposure events               | Provided by the shell behind a port in `shared`  | The repo has no analytics yet; this is a prerequisite.                          |

`packages/shared/ui` gets no variant directive: `ui` may not depend on `data`.

## How it enters the workflow

Planned, in this order. Each needs the platform spec first.

1. Spec template: a cache class line under Constraints and an `Experiment` section with hypothesis,
   variants, primary metric, split and expiry date, or "none, because …".
2. Spec gate: refuses approval when that section is missing.
3. Requirements: one EARS line per variant, for example "WHILE the visitor is in variant `b` of
   `<key>` the page SHALL …". The traceability gate then demands a test per variant.
4. Feature generator: an `--experiment=<key>` option that scaffolds the definition, the variant
   signal and a test stub per variant.
5. A verify stage that fails when an experiment key is undeclared, points at no approved spec, is
   past its expiry date, or sits on a `cached` route, and when a `cached-varied` page has more than
   one running experiment.
6. Constitution: a rule naming those mechanisms.

## Not decided yet

These are human decisions for the platform spec:

- Cookie consent: whether the visitor id and treatment cookies need consent before they are set.
- In-house runtime only, or a vendor (GrowthBook, Statsig, LaunchDarkly) behind the same port. A
  vendor SDK is a runtime dependency and needs its own ADR (rule 2.5).
- Cookie names, lifetimes and the site-wide split for `cached-varied`.
- The analytics destination for exposure events.
