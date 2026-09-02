// libs/pipeline-adapters/src/linear-v1.adapter.ts
//
// Structured reads/writes against Linear via its GraphQL API
// (https://developers.linear.app). Again, deliberately separate from the
// Linear MCP server used on the chat path — same workspace, direct hit here
// for fast counts.

import { StructuredPipelineAdapter } from '../adapter.interface';
import {
  PipelineItem,
  PipelineItemInput,
  PipelineItemPatch,
  PipelineProjectRef,
  PipelineSummary,
  ListItemsOptions,
} from '../types';

interface LinearV1AdapterConfig {
  apiKey: string; // Linear API key, server-side only
}

const LINEAR_STATUS_MAP: Record<string, PipelineItem['status']> = {
  backlog: 'open',
  unstarted: 'open',
  started: 'in_progress',
  completed: 'done',
  cancelled: 'cancelled',
};

export function createLinearV1Adapter(config: LinearV1AdapterConfig): StructuredPipelineAdapter {
  async function linearGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      throw new Error(`Linear query failed (${res.status}): ${await res.text()}`);
    }
    const json = await res.json();
    if (json.errors) throw new Error(`Linear GraphQL error: ${JSON.stringify(json.errors)}`);
    return json.data as T;
  }

  function toPipelineItem(issue: any): PipelineItem {
    return {
      id: issue.id,
      title: issue.title,
      status: LINEAR_STATUS_MAP[issue.state?.type] ?? 'open',
      priority:
        issue.priority === 1 ? 'urgent' : issue.priority === 2 ? 'high' : issue.priority === 3 ? 'normal' : 'low',
      assignee: issue.assignee?.name ?? null,
      dueDate: issue.dueDate ?? null,
      url: issue.url,
      source: 'linear',
      updatedAt: issue.updatedAt,
      raw: issue,
    };
  }

  return {
    id: 'linear-v1',

    async listItems(project: PipelineProjectRef, opts?: ListItemsOptions): Promise<PipelineItem[]> {
      const data = await linearGraphQL<{ team: { issues: { nodes: any[] } } }>(
        `query Issues($teamId: String!, $includeDone: Boolean!) {
          team(id: $teamId) {
            issues(filter: { state: { type: { neq: "cancelled" } } }) {
              nodes {
                id title url updatedAt dueDate priority
                state { type }
                assignee { name }
              }
            }
          }
        }`,
        { teamId: project.sourceId, includeDone: opts?.includeDone ?? false }
      );
      const items = data.team.issues.nodes.map(toPipelineItem);
      return opts?.includeDone ? items : items.filter((i) => i.status !== 'done');
    },

    async getItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem | null> {
      const data = await linearGraphQL<{ issue: any }>(
        `query Issue($id: String!) {
          issue(id: $id) { id title url updatedAt dueDate priority state { type } assignee { name } }
        }`,
        { id: itemId }
      );
      return data.issue ? toPipelineItem(data.issue) : null;
    },

    async getSummary(project: PipelineProjectRef): Promise<PipelineSummary> {
      const items = await this.listItems(project);
      const unassigned = items.filter((i) => !i.assignee);
      return {
        project,
        openCount: items.length,
        needsAttention: unassigned.length > 0,
        attentionReason: unassigned.length ? `${unassigned.length} unassigned issue(s)` : undefined,
        lastSyncedAt: new Date().toISOString(),
      };
    },

    async createItem(project: PipelineProjectRef, input: PipelineItemInput): Promise<PipelineItem> {
      const data = await linearGraphQL<{ issueCreate: { issue: any } }>(
        `mutation Create($teamId: String!, $title: String!) {
          issueCreate(input: { teamId: $teamId, title: $title }) { issue { id title url updatedAt dueDate priority state { type } assignee { name } } }
        }`,
        { teamId: project.sourceId, title: input.title }
      );
      return toPipelineItem(data.issueCreate.issue);
    },

    async updateItem(
      project: PipelineProjectRef,
      itemId: string,
      patch: PipelineItemPatch
    ): Promise<PipelineItem> {
      const data = await linearGraphQL<{ issueUpdate: { issue: any } }>(
        `mutation Update($id: String!, $title: String, $dueDate: TimelessDate) {
          issueUpdate(id: $id, input: { title: $title, dueDate: $dueDate }) { issue { id title url updatedAt dueDate priority state { type } assignee { name } } }
        }`,
        { id: itemId, title: patch.title, dueDate: patch.dueDate }
      );
      return toPipelineItem(data.issueUpdate.issue);
    },

    async completeItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem> {
      // TODO: resolve the team's "Done"-type workflow state id and set it here,
      // rather than passing a status string directly (Linear keys off state id).
      return this.updateItem(project, itemId, { status: 'done' });
    },

    async reopenItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem> {
      return this.updateItem(project, itemId, { status: 'open' });
    },
  };
}
