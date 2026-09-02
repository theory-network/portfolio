// libs/pipeline-core/src/types.ts
//
// Canonical shapes every source (Roam, Linear, future sources) gets normalized into.
// Both the structured adapters (reads/counts) and the MCP-driven chat mutations
// should ultimately be describable in terms of these types, so the UI never has
// to know which vendor it's looking at.

export type PipelineSource = 'roam' | 'linear' | 'github' | 'gitlab';

export type PipelineItemStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

export type PipelinePriority = 'urgent' | 'high' | 'normal' | 'low' | null;

/**
 * A project has up to two independent connections, distinguished by role:
 * - 'todo'  — tracking/status: what's open, assigned, overdue. Drives badges,
 *             counts, nudges. Roam or Linear, typically.
 * - 'work'  — where the actual work happens: code, PRs, deploys. GitHub,
 *             GitLab, or (for projects that don't separate the two) the same
 *             source as 'todo'.
 * Each role is optional independently — a project might have only a todo
 * source, or both, but "work" without a "todo" source would be unusual.
 */
export type PipelineRole = 'todo' | 'work';

/**
 * Identifies a single connection (one role, one source) as configured in the
 * admin screen. `pipeline` matches the versioned strings already used there
 * ("Roam v1" -> "roam-v1"), so the admin UI's dropdown and the adapter
 * registry key off the same value.
 */
export interface PipelineProjectRef {
  role: PipelineRole;
  pipeline: string;        // e.g. 'roam-v1', 'linear-v1', 'github-v1'
  sourceId: string;        // Roam graph name, Linear team/project id, or GitHub org/repo
  groupKey: string;        // key into listGroups (personal / pro / freelance / ...)
  projectName: string;     // display name, e.g. "Settlement Worker"
}

/**
 * A project as configured in the admin screen: one identity, up to two
 * connections. This is what the admin UI edits and what chat-context.ts
 * reads to assemble MCP servers/system-prompt scoping for a chat turn.
 */
export interface ProjectConfig {
  groupKey: string;
  projectName: string;
  icon: string;
  todo?: PipelineProjectRef;   // role: 'todo'
  work?: PipelineProjectRef;   // role: 'work'
}

export interface PipelineItem {
  id: string;
  title: string;
  status: PipelineItemStatus;
  priority: PipelinePriority;
  assignee?: string | null;
  dueDate?: string | null;   // ISO 8601
  url?: string | null;       // deep link back to the Roam block / Linear issue
  source: PipelineSource;
  updatedAt: string;         // ISO 8601, used for cache invalidation / "is this stale"
  raw?: unknown;             // original vendor payload, for source-specific rendering
}

export interface PipelineItemInput {
  title: string;
  priority?: PipelinePriority;
  assignee?: string | null;
  dueDate?: string | null;
}

export interface PipelineItemPatch {
  title?: string;
  status?: PipelineItemStatus;
  priority?: PipelinePriority;
  assignee?: string | null;
  dueDate?: string | null;
}

/**
 * The lightweight, frequently-polled shape that drives badges, sidebar counts,
 * and the Approvals-tab / nudge-banner logic. This should be cheap to compute —
 * no LLM calls on this path.
 */
export interface PipelineSummary {
  project: PipelineProjectRef;
  openCount: number;
  needsAttention: boolean;
  attentionReason?: string;   // e.g. "1 unassigned ticket", shown in nudge banner
  lastSyncedAt: string;       // ISO 8601
}

export interface ListItemsOptions {
  includeDone?: boolean;
  limit?: number;
}
