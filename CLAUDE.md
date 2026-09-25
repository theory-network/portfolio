<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Portfolio project — "what's next"

When asked something like "what's next" for the portfolio site (this repo),
don't guess from the code or from memory — check the **Portfolio** project
in Linear (Theory Network team,
`linear.app/theory-network/project/portfolio-*`). Linear is the source of
truth for planning, scope and architecture decisions for this site, not any
file in this repo. The project's own description there has the site map and
stack.

Only use the Portfolio project for this repo. Nexus lives in `theory-apps`
and has its own Linear project and its own "what's next" rules; don't pull
issues from it, even though the site links to Nexus (5.3 uses its
screenshots).

Algorithm:

1. **Check for an In Progress issue first, project-wide.** If exactly one
   exists, that's "what's next" — finishing started work outranks an
   untouched item in an earlier epic, even one with a lower number. (If
   somehow more than one is In Progress, fall through to step 2 among just
   those.)
2. Otherwise, walk the epics in order — **Epic 1 (Repo & Tooling) → Epic 2
   (Architecture Spikes) → Epic 3 (Brand & Design System) → Epic 4 (Site
   Shell, Home & About) → Epic 5 (Portfolio) → Epic 6 (Services) → Epic 7
   (QA & Launch)** — and within the first epic that has any non-Done
   sub-issue, take the lowest-numbered one (1.1, 1.2, ... then 2.1, 2.2,
   ...).

Issues with no epic parent aren't part of the walk.

This works because the epic order already reflects real priority and the
X.Y numbers within each epic are kept in genuine dependency order — no
extra Linear `priority` field or other state needed. The epic order is also
written in the Linear project's description; if it changes, update both
places. If a change makes an epic's numbering non-sequential (a gap, a
duplicate, or an inserted item), fix the numbering (and any in-description
cross-references to the old numbers, e.g. "depends on 2.3") as part of that
change, so this keeps working.

## Keeping Linear in sync as you work

Update the relevant Portfolio issue/sub-issue in Linear as part of the same
session that does the work — don't leave it for a separate "update Linear"
pass, and don't wait to be asked. Concretely:

- **Starting work on an issue** (not just reading it): set its status to
  **In Progress** if it's still Backlog/Todo. This is what makes the
  In-Progress-first rule above actually work for the next session.
- **Finishing work**: set status to **Done** only once it's actually
  verified — built/linted/tested clean at minimum, and checked in a browser
  or against the deployed result where that's feasible, not assumed.
  Update the issue's description with what was actually built (file paths,
  what changed, what's still open) — don't just flip the status and leave
  stale pre-work text as the only description.
- **Partially done**: leave it In Progress, and write the description so
  it clearly separates what's done from what's still open — don't mark an
  issue Done because most of it is finished.
- **Discovering new concrete work while implementing something else**
  (a real gap, not a vague TODO): don't silently expand scope — check with
  the user before creating new Linear issues or renumbering existing ones.
- If a description references other issues by number (e.g. "depends on
  2.3", "see 4.1"), and a renumber or a new issue changes what those
  numbers point to, fix those cross-references in the same pass — see the
  numbering-integrity note above.
- **Any commit that does work toward a Portfolio issue must be paired with
  a Linear update in the same pass** — set/confirm status (In Progress
  while work is ongoing, Done only once verified per the "Finishing work"
  rule above) and update the description to reflect what that commit
  actually changed. Don't commit code against an issue and leave Linear
  stale for a later pass.

## Commit messages

Every commit's description (the message body, not just the subject line)
must carry the AI-generated summary written in the session that made the
change: what changed, why, and how it was verified. Don't leave the body
empty or a one-liner. Put the Linear issue id in the subject (e.g.
`(THE-494)`), and pass the message from a file (`git commit -F <file>`) so
the multi-line body keeps its formatting.

## Branches and pull requests

- **One branch and one PR per Linear issue.** When told to start work on an
  issue, create its branch right away from an up-to-date `main`. Name it
  `feature/<issue-id>-<short-description>` for new work or
  `bug/<issue-id>-<short-description>` for fixes, with the issue id in
  lowercase (e.g. `feature/the-494-repo-housekeeping` for THE-494). Don't
  bundle several issues into one branch or PR, so each issue stays separate
  in the git history.
- **One-off tasks with no Linear issue** (docs, config, housekeeping) use
  `chore/<short-description>` (e.g. `chore/branch-naming-rules`). They still
  get their own PR and follow the same squash-merge rules. If the work turns
  out to be real project scope, check with the user about creating an issue
  instead.
- **Squash merge only.** `main` requires a PR and linear history, so each PR
  lands as a single commit. Make the PR title the issue's title with the id
  in parentheses (e.g. `1.1 Repo housekeeping: README (THE-494)`), and build
  the PR body from the commit summaries (what, why, how verified).
- **Dependent issues are stacked.** Base the next branch and PR on the
  previous issue's branch, and merge them bottom-up. After each squash merge,
  rebase the next branch onto `main` and retarget its PR to `main`, since the
  squash rewrites the commits the branch was built on.
- **Delete the branch after merging.** The repo's "Automatically delete head
  branches" setting does this.
- **Prune merged local branches when creating a new branch.** First run
  `git fetch --prune`. A local branch is safe to delete when its PR was
  merged and nothing local is unpushed: check
  `gh pr list --state merged --head <branch> --json number,headRefOid` and
  make sure the local tip (`git rev-parse <branch>`) equals that
  `headRefOid`. This covers branches whose remote is gone (`git branch -vv`
  shows `: gone]`) and branches that never had a remote tracked. Squash and
  rebase merges aren't detected by `git branch --merged`, so delete with
  `git branch -D`. Leave any branch with an open or unmerged PR, no PR, or a
  tip that differs from the PR's head, and tell the user about it. Never
  delete the current branch or `main`.
- Don't push, open a PR or merge one unless asked.

## Formatting

Prettier is the formatter, run through Nx: `npx nx format:write --all` to fix
and `npx nx format:check --all` to check (CI runs the check). Generated or
tool-managed files go in `.prettierignore`. `@aws/nx-plugin` still installs
Biome and formats the code its generators create with it, so run
`npx nx format:write --all` after using a generator. Biome is not enforced.
