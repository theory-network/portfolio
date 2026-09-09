# Command Center — Planning Context

This file is a handoff from a planning conversation in claude.ai into this
Claude Code session. It covers what the app is, every architecture decision
made, what's already built, and exactly what's left — so a fresh Claude
Code session can pick up here without re-deriving any of it.

If you're Claude Code reading this: treat this as trustworthy background,
but verify current file contents before editing anything — this doc
describes state as of hand-off and could drift from the repo.

## What this app is

A "command center" app: a center-pane, context-aware AI chat flanked by two
independently swappable list "slots" — each showing projects from a
todo-tracking source (Roam or Linear) with optional counts/badges. Bottom
tabs: Work / Dashboard / Approvals. Tapping a project resumes its chat
context (or all-tasks by default); tapping a project's count badge (or
long-pressing the tile, as a fallback for zero-count projects) opens a
task picker to scope the conversation to one specific item, with its own
separate thread and a breadcrumb ("Project / Task") to jump back to
all-tasks mid-chat.

## Rollout sequencing

- **Iteration 1** (current focus): Angular + Ionic Angular/Capacitor,
  NGXS deferred (using Angular signals for now per explicit instruction —
  NGXS can be layered in later if still wanted).
- **Iteration 2**: React Native + React Native Reusables.
- **Iteration 3**: Ionic React + shadcn/ui.

The backend (`nexus-core` — types, adapters, MCP routing, orchestrator,
model-provider abstraction) is framework-agnostic TypeScript specifically
so iterations 2–3 don't require rewriting it.

## Visual design

Dark theme, ported verbatim as real CSS (not re-derived) into the Angular
app's `styles.scss`: bg `#101216`, panels `#181b21`/`#1e222a`, lines
`#2a2f38`, text `#e7e6e2`. Personal accent amber `#d9944f`, professional
accent teal `#49c2c2`. IBM Plex Mono for labels/metadata, Inter for body.

## Architecture

**Hybrid pipeline design:** structured adapters (direct REST against Roam,
Linear, GitHub) handle fast reads — counts, badges, summaries, no LLM
cost. MCP-driven chat handles freeform mutations via the active model's
own tool-calling. Both normalize into one `PipelineItem` shape.
`syncAfterChatTurn()` re-hits the structured adapter after a chat mutation
so badges update immediately rather than waiting on the next poll.

**Model swappability:** the backend (not the model vendor) owns the MCP
connections. A chat turn forwards tool calls over the backend's own MCP
connection using scoped credentials; the model never talks to a vendor API
(Linear, GitHub, etc.) directly. This is what makes swapping models (Claude,
OpenAI, DeepSeek, self-hosted) possible without re-plumbing every
integration. `ModelProvider` is the seam — Claude gets its own provider
file (genuinely different API shape); OpenAI, DeepSeek, Groq, Together,
and self-hosted endpoints all share one `openai-compatible.provider.ts`
factory via a `baseURL` override.

**Dual-slot project connections:** each project can have up to two
independent, optional connections — `todo` (Roam/Linear — tracking,
status, drives badges) and `work` (GitHub/GitLab — where the work
happens: code, PRs, deploys). `chat-context.ts` fans out MCP
servers/system-prompt scoping across whichever are configured;
`chat-orchestrator.ts` tracks which role a tool call mutated so the right
connection's counts get refreshed.

**Task-scoped chat + `TaskScope`:** `buildProjectSystemContext(project, task?)`
takes an optional `TaskScope { itemId, title }` and appends a line
restricting the model to that one item when the conversation is
task-scoped — without this, a task-scoped conversation would only be
scoped cosmetically in the UI. `runChatTurn(project, history, userMessage, taskId?)`
resolves a bare `taskId` against the project's `todo` connection's
structured adapter (tasks live on Roam/Linear, not GitHub/GitLab). A stale
or unresolvable `taskId` silently falls back to project-wide scope.

**Pipeline instances, not bare type strings:** the admin UI configures
named `PipelineInstance { id, type, label, config }` records (e.g. two
separate Roam graphs, or a personal vs. client GitHub token), each with
its own credentials — decoupled from any single project. A project
references instances by ID, not by raw type. **This concept currently only
exists in the Angular app's mock `AppStateService` state — `nexus-core`'s
`types.ts`/`registry.ts` still assume one adapter per *type*, built once
from env vars at module load. That gap needs closing as part of wiring the
BFF for real:** the registry needs to move to building adapters
per-instance, keyed by instance ID, with credentials from that instance's
config rather than `process.env`.

**In-chat multiple-choice questions:** `ChatMessage` has a `'question'`
type with `options?: string[]` and `answer?: string` — mirrors Claude's
own ask_user_input interface (tappable options + a "write your own
answer" free-text fallback). `answerQuestion(messageIndex, value)` handles
both paths identically.

**Single `nexus-core` Nx lib, not two.** Originally planned as
`pipeline-core` + `model-providers` as separate libs, on the theory the
model-provider layer might be published/versioned independently someday.
Merged into one because `chat-orchestrator.ts` already imports directly
from `model-registry.ts` — no real boundary was being protected by the
split, just two extra `project.json`/`tsconfig` pairs to maintain.

## What's built

1. **`command-center-mockup-v2.html`** — a static, fully-interactive HTML
   mockup (vanilla JS) of the whole app: dual sidebars, task-scoped chat
   with breadcrumb, both admin screens (Lists, Pipelines), all seven
   modals (Project, List, Pipeline, Browse-community-pipelines,
   Icon-picker, Task-picker, Panel/slot-picker). Source of truth for exact
   visual/interaction design.

2. **`packages/nexus-core`** (originally built as `libs/nexus-core` — see the
   two dated updates below for the full path history) — a real Nx library
   (`@nx/js:library`, `bundler=tsc`)
   inside *this* workspace, not just described: `types.ts`, `adapter.interface.ts`,
   adapters (`roam-v1`, `linear-v1`, `github-v1`), `registry.ts`,
   `chat-context.ts`, `chat-orchestrator.ts`, `mcp-bridge.ts`,
   `model-provider.interface.ts`, `model-registry.ts`, providers (`claude`,
   `openai-compatible`), all re-exported through `src/index.ts`. Builds
   clean via `nx build nexus-core` (real `tsc` compile, not just a
   standalone `tsc --strict` check like before). Real runtime deps
   installed and declared in the lib's own `package.json`:
   `@anthropic-ai/sdk`, `openai`, `@modelcontextprotocol/sdk`.

   Two small fixes were needed bringing the code into Nx's stricter
   defaults (worth knowing if similar errors show up adding more code
   here): Nx's generated `tsconfig` enables
   `noPropertyAccessFromIndexSignature`, so `process.env.X` had to become
   `process.env['X']` throughout `registry.ts`/`model-registry.ts`; and
   the SDK packages (`@anthropic-ai/sdk`, `openai`,
   `@modelcontextprotocol/sdk`) weren't installed yet — the original
   standalone `pipeline-contract/` folder had only been typechecked with
   `tsc --strict`, which doesn't fail on missing runtime deps the same way
   a real build does.

   **Still exists only as library code — nothing calls it yet.** No
   Next.js app, no API routes, no consumer.

   **Update (2026-09-09): merged into the `theory-portfolio` workspace.**
   `libs/nexus-core` above was scaffolded in a standalone `nexus-workspace`
   Nx workspace (this `tmp/nexus-core/` folder). That source has now been
   copied into `theory-portfolio`'s own pre-existing `libs/nexus-core` lib,
   replacing an older/partial `src/lib/generated/` copy that predated this
   handoff. Where the two workspaces' conventions differed, `theory-portfolio`'s
   existing conventions won rather than importing `nexus-workspace`'s:
   - Package stays named `@theory/nexus-core` (not `@nexus-workspace/nexus-core`).
   - Build/typecheck targets stay defined inline in the lib's `package.json`
     (this workspace's pattern), not in a separate `project.json`.
   - `tsconfig.lib.json` stays `theory-portfolio`'s own (bundler resolution,
     ESNext module) — the copied source's extensionless relative imports
     (`from './types'`, not `from './types.js'`) work fine under it.

   Runtime deps (`@anthropic-ai/sdk`, `openai`, `@modelcontextprotocol/sdk`)
   were added to the lib's `package.json` and installed at the
   `theory-portfolio` root (`@modelcontextprotocol/sdk` pinned to `^1.29.0`
   to match what was already installed there, not the `^1.30.0` the source
   lib had been built against).

   One additional fix was needed beyond what `nexus-workspace` had already
   hit: `theory-portfolio`'s TypeScript types `Response.json()` as `unknown`
   rather than `any`, so `linear-v1.adapter.ts`'s `linearGraphQL()` needed an
   explicit cast (`(await res.json()) as { errors?: unknown; data: T }`)
   instead of relying on implicit `any` property access.

   `nx build nexus-core`, `nx typecheck nexus-core`, and `nx lint
   nexus-core` all pass clean in `theory-portfolio` post-migration. This
   supersedes the "still exists only as library code" note above only in
   terms of *location* — it's still true that nothing calls it yet (no BFF,
   no API routes, no consumer) — see "What's NOT built yet" below, which
   now applies to `theory-portfolio` rather than a hypothetical
   `nexus-workspace`.

   This `tmp/nexus-core/` staging folder was left in place after the copy
   at the time — it has since been deleted (see the update directly below).

   **Update (2026-09-09, later same day): moved `libs/` → `packages/`
   workspace-wide.** All five `theory-portfolio` libs (`nexus-core`,
   `nexus-service`, `nexus-state`, `nexus-components`, `shadcn` — not just
   `nexus-core`) were moved from `libs/*` to `packages/*` and switched from
   hand-maintained `tsconfig.base.json` path aliases to Nx's newer
   "TS project references + package-manager-workspaces" convention:
   - `tsconfig.base.json` no longer has a `paths` map at all; `nx sync` now
     auto-maintains TypeScript project references across every
     `tsconfig.json` in the repo instead.
   - `module`/`moduleResolution` moved from `nodenext` to `preserve`/
     `bundler` at the base level (required — `bundler` resolution is a hard
     TS compile error under `nodenext`).
   - `nx.json` registers `@nx/js/typescript`, scoped via `include` to only
     `packages/nexus-core/**` and `packages/shadcn/**` — the three Angular
     libs (`nexus-components`/`nexus-service`/`nexus-state`) keep their
     explicit `ng-packagr-lite` build targets untouched, so there's no
     inferred-vs-explicit target conflict.
   - `nexus-core`'s build/typecheck targets moved from an embedded
     `package.json` `"nx"` key to plugin-inferred targets.
   - `shadcn` got a real `package.json` for the first time (it never had
     one) and lost its now-empty `project.json`.
   - **Angular libs do NOT get hand-written `main`/`types`/`exports`** —
     ng-packagr generates its own manifest into `dist/` using Angular
     Package Format file naming (e.g. `theory-nexus-service.d.ts`, not
     `index.d.ts`) and will warn/conflict if the source `package.json`
     declares its own. Worth knowing before touching these three libs again.
   - Verified via `nx run-many -t typecheck,build,lint,test --all` plus
     `nx build nexus-mobile`. Four pre-existing failures remain, confirmed
     via `git show HEAD:...` to predate this migration entirely (not
     caused by it): `nexus-components`/`nexus-service`/`nexus-state` all
     fail `@nx/dependency-checks` lint because their Nx-generated stub
     source never actually imports the `@angular/core`/`@angular/common`
     peer deps declared in `package.json`; `nexus-core` has no `.spec.ts`
     files yet so its inferred `test` target fails with "no tests found."
     None of these are new — they're unfixed generator boilerplate debt.
   - `apps/nexus-mobile` needed **zero changes** — a repo-wide grep before
     the move confirmed it (and every lib) had zero cross-references to any
     of the removed path aliases already.
   - The `tmp/nexus-core/` staging folder mentioned above has since been
     deleted (its contents are now redundant with `packages/nexus-core`).

3. **Ionic Angular port, now living in this workspace as `apps/nexus-mobile`**
   (`apps/nexus-mobile-e2e` alongside it) — full working app:
   `AppStateService` (Angular signals, all mockup logic + hardcoded seed
   data ported over), all screens/modals as standalone components, Ionic
   `ModalController` for sheet/popover modals. Verified interactively via
   Playwright, not just compiled.

   Two real layout bugs were found and fixed during that port (worth
   knowing about if similar symptoms show up elsewhere — this was written
   before the app lived in `theory-portfolio`; now that it does, as
   `apps/nexus-mobile`, `nx build`/`lint`/`test` all pass clean on it, so
   these fixes evidently carried over intact):
   - Ionic sheet modals rendered fully off-screen — the ported
     `.modal-sheet` CSS had a leftover `transform: translateY(100%)`
     meant to be reset by the old mockup's `.modal-overlay.open` class,
     which doesn't exist under Ionic's own modal presentation.
   - `.chat-body` (the scrollable message list) never actually scrolled —
     a latent bug in the *original mockup too*, just never surfaced there.
     Root cause: `ion-menu` clears any inline `style` attribute on its
     `contentId` target at runtime; sizing had to move into a real
     stylesheet rule targeting the element's `id` instead.

   Hand-authored `HlmButtonDirective`/`HlmBadgeDirective` (spartan/ui
   pattern) instead of using the real spartan CLI, because current
   spartan/ui requires Angular 21+ and the sandbox that built this was
   capped at Angular 19 (Node version constraint). Verified against
   spartan/ui's real current public API via web search first, so these
   are genuine drop-ins once on a newer Angular — not approximations.
   Tailwind v3 (not v4) for the same compatibility reason.

   Uses the mockup's ~924-line CSS block ported verbatim into
   `styles.scss` rather than re-derived in Tailwind utilities — every
   class name from the mockup (`.proj`, `.modal-sheet`, `.task-picker-row`,
   etc.) works unchanged in the Angular templates.

## What's NOT built yet (the actual next step)

`nexus-core` is done (see above) and now lives at `packages/nexus-core`
inside `theory-portfolio`, not a separate `nexus-workspace`. The Angular
app also already lives here, as `apps/nexus-mobile` (see item 5 below —
this used to be an open question, it isn't anymore). Everything below
applies to `theory-portfolio` as the target workspace. Remaining, in order:

1. Add a Next.js app via `@nx/next:application` (explicitly requested to
   be a proper Nx-generated app, not a bolted-on `create-next-app`) —
   this is the BFF.
2. Build API routes on that Next.js app exposing `nexus-core`'s
   `runChatTurn` (and probably a project-summary endpoint for badge
   counts) over HTTP.
3. **Close the `PipelineInstance` gap** in `nexus-core` (see above) so the
   registry can build adapters per-instance with per-instance credentials,
   matching what the Angular admin UI already assumes.
4. Rewire the Angular app's `AppStateService.sendMessage()` /
   `answerQuestion()` to call the new BFF endpoints instead of mutating
   local mock state, and replace the hardcoded `SEED_LIST_GROUPS`/
   `SEED_PIPELINES` with real fetches once the summary endpoint exists.
5. ~~The Angular/Ionic app currently lives as a separate, standalone
   Angular CLI project~~ — **resolved**: it's already inside
   `theory-portfolio`, as `apps/nexus-mobile` (`apps/nexus-mobile-e2e`
   alongside it), a real `@nx/angular` app using the new esbuild
   `@angular/build:application` builder, standalone + zoneless components.
   Confirmed by direct inspection, not just this doc's say-so — its
   `src/app/core/app-state.service.ts` and `src/app/features/{dashboard,
   work,approvals,admin-lists,admin-pipelines,modals}` match this doc's
   description of the ported app exactly, and it builds/lints/tests clean
   today. It does **not yet import `nexus-core`, `nexus-service`,
   `nexus-state`, `nexus-components`, or `shadcn`** — confirmed via a
   repo-wide grep during the `packages/` migration above — so item 4's
   rewire from mock state to the BFF is still fully ahead of it.

## Explicitly deferred (don't build these unless asked)

- **Postgres conversation storage + compaction schema.** Two-tier design
  agreed conceptually (recent messages as raw rows, older messages
  background-summarized into condensed rows) but no concrete `CREATE
  TABLE` migrations yet. Needs a nullable `taskId` alongside `projectId`
  in whatever keys a conversation, given task-scoped chat now exists.
- **Final "clone and deploy" setup script.** `INSTALL.md` (in the
  `pipeline-contract` bundle) is a first-pass, current-state guide only.
  A polished version for a stranger cloning the repo — Supabase project
  creation, model API keys, pipeline-source credentials, end to end — is
  planned once the full application is finished. The app is intended to
  be reusable by other people, not a one-off.
- **NGXS.** Explicitly deferred in favor of Angular signals for now.

## Where to get each credential (for local dev `.env.local`)

- `ANTHROPIC_API_KEY` — console.anthropic.com → Settings → API Keys.
- `ROAM_API_TOKEN` — open the graph → Settings → "Graph" tab → "API
  Tokens" → "+ New API Token" (graph owners only).
- `LINEAR_API_KEY` — Linear → Settings → API → "Create key" (personal key;
  fine for single-tenant use — OAuth app needed if this ever serves other
  people's Linear workspaces).
- `GITHUB_TOKEN` — github.com/settings/tokens, fine-grained PAT scoped to
  the relevant repos (`pull_requests`, `contents`). A GitHub App
  installation token is the better answer for production.
- `OPENAI_COMPATIBLE_API_KEY` — only needed if `model-registry.ts` has a
  non-Claude provider configured; from that provider's own dashboard.

Never expose any of these to the Angular frontend — they belong
server-side, behind the Next.js BFF.
