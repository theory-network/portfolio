// libs/pipeline-adapters/src/roam-v1.adapter.ts
//
// Structured reads/writes against a Roam graph via the Roam Backend API
// (https://roamresearch.com/#/app/developer-documentation — REST, not MCP).
// This is intentionally separate from the Roam MCP server the chat path uses:
// same underlying graph, but this hits it directly for fast, deterministic
// counts instead of round-tripping through Claude.
//
// Item mapping convention (adjust to match your actual Roam task format):
//   - An "item" is any block on the project's page tagged {{[[TODO]]}} or {{[[DONE]]}}
//   - status: 'open' for TODO, 'done' for DONE, 'in_progress'/'cancelled' via a
//     block-level tag (#in-progress, #cancelled) if you use one
//   - assignee: parsed from a `[[@name]]` reference in the block, if present
//   - dueDate: parsed from a Roam date reference in the block

import { StructuredPipelineAdapter } from '../adapter.interface';
import {
  PipelineItem,
  PipelineItemInput,
  PipelineItemPatch,
  PipelineProjectRef,
  PipelineSummary,
  ListItemsOptions,
} from '../types';

interface RoamV1AdapterConfig {
  apiToken: string; // Roam Backend API token, server-side only — never sent to the client
}

export function createRoamV1Adapter(config: RoamV1AdapterConfig): StructuredPipelineAdapter {
  const baseUrl = 'https://api.roamresearch.com';

  async function roamQuery<T>(graphName: string, query: string, args: unknown[] = []): Promise<T> {
    const res = await fetch(`${baseUrl}/api/graph/${graphName}/q`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, args }),
    });
    if (!res.ok) {
      throw new Error(`Roam query failed (${res.status}): ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  function toPipelineItem(block: any): PipelineItem {
    // TODO: replace with real parsing once the block shape returned by your
    // datalog query is finalized. Placeholder mapping shown for structure.
    return {
      id: block.uid,
      title: block.string,
      status: block.string?.includes('{{[[DONE]]}}') ? 'done' : 'open',
      priority: null,
      assignee: block.assignee ?? null,
      dueDate: block.dueDate ?? null,
      url: `roam://#/app/${block.graphName}/page/${block.uid}`,
      source: 'roam',
      updatedAt: block.editTime ? new Date(block.editTime).toISOString() : new Date().toISOString(),
      raw: block,
    };
  }

  return {
    id: 'roam-v1',

    async listItems(project: PipelineProjectRef, opts?: ListItemsOptions): Promise<PipelineItem[]> {
      // TODO: real datalog query scoped to project.sourceId (the graph/page name),
      // pulling TODO/DONE blocks and optionally filtering DONE via opts.includeDone.
      const rows = await roamQuery<any[]>(project.sourceId, '[:find ?uid ?string :where ...]');
      const items = rows.map(toPipelineItem);
      return opts?.includeDone ? items : items.filter((i) => i.status !== 'done');
    },

    async getItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem | null> {
      const rows = await roamQuery<any[]>(
        project.sourceId,
        '[:find ?uid ?string :in $ ?uid :where [?b :block/uid ?uid]]',
        [itemId]
      );
      return rows.length ? toPipelineItem(rows[0]) : null;
    },

    async getSummary(project: PipelineProjectRef): Promise<PipelineSummary> {
      const items = await this.listItems(project);
      const unassigned = items.filter((i) => !i.assignee);
      return {
        project,
        openCount: items.length,
        needsAttention: unassigned.length > 0,
        attentionReason: unassigned.length ? `${unassigned.length} unassigned item(s)` : undefined,
        lastSyncedAt: new Date().toISOString(),
      };
    },

    async createItem(project: PipelineProjectRef, input: PipelineItemInput): Promise<PipelineItem> {
      // TODO: POST to Roam's write API to create a new {{[[TODO]]}} block on the project page.
      throw new Error('roam-v1 createItem: not yet implemented — needs Roam write-API wiring');
    },

    async updateItem(
      project: PipelineProjectRef,
      itemId: string,
      patch: PipelineItemPatch
    ): Promise<PipelineItem> {
      // TODO: update the block's string/status via Roam's write API.
      throw new Error('roam-v1 updateItem: not yet implemented — needs Roam write-API wiring');
    },

    async completeItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem> {
      return this.updateItem(project, itemId, { status: 'done' });
    },

    async reopenItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem> {
      return this.updateItem(project, itemId, { status: 'open' });
    },
  };
}
