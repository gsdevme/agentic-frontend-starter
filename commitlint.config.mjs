/**
 * Commit-message convention for this repo: the Angular preset, enforced by
 * commitlint in three places — the `commit-msg` git hook (each commit), the
 * "commit messages" stage of `pnpm verify` (every commit since the merge-base
 * with main) and CI. Rationale lives in ADR 0003; formats and fix recipes in
 * docs/references/commits.md.
 *
 * - Types are Angular's: build, ci, docs, feat, fix, perf, refactor, revert,
 *   style, test. There is no `chore`.
 * - Breaking changes use a `BREAKING CHANGE:` footer; `feat!:` is rejected.
 * - Scopes are free-form kebab-case (an nx project name or an area such as
 *   `hooks`, `verify`, `docker`).
 * - `defaultIgnores: false` so merge, `Revert "…"`, `fixup!` and `squash!`
 *   commits fail the range lint: history reaching main must be atomic. The
 *   commit-msg hook lets `fixup!`/`squash!`/`amend!` through locally so the
 *   autosquash workflow still works.
 * - Long body lines only warn, because trailers and URLs cannot be wrapped.
 */

const reviewNoise = [
  /\bwip\b/i,
  /\bfix-?ups?\b/i,
  /\baddress(es|ed|ing)?\b.*\b(review|feedback|comments?)\b/i,
  /\bapply(ing)?\b.*\bsuggestions?\b/i,
  /\breview (fixes|feedback|comments?|changes)\b/i,
  /\bpr (fixes|feedback|comments?)\b/i,
];

/**
 * Rejects subjects that describe the review process instead of the change
 * ("wip", "address review comments", "apply suggestions"). Such commits are
 * follow-ups that belong squashed into the commit they fix.
 *
 * @param {{ subject: string | null }} commit parsed commit
 * @returns {[boolean, string]} commitlint rule outcome
 */
function subjectNoReviewNoise({ subject }) {
  const hit = reviewNoise.find((re) => re.test(subject ?? ''));
  return [
    !hit,
    'subject describes review churn, not a change; squash it into the commit it fixes (git commit --fixup=<sha> && git rebase --autosquash)',
  ];
}

export default {
  extends: ['@commitlint/config-angular'],
  defaultIgnores: false,
  plugins: [{ rules: { 'subject-no-review-noise': subjectNoReviewNoise } }],
  rules: {
    'header-max-length': [2, 'always', 72],
    'scope-case': [2, 'always', 'kebab-case'],
    'body-max-line-length': [1, 'always', 100],
    'subject-no-review-noise': [2, 'always'],
  },
};
