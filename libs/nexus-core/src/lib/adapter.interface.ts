// libs/pipeline-core/src/adapter.interface.ts
//
// Implemented once per source ("roam-v1", "linear-v1", ...) using direct
// REST/SDK calls — no LLM involved. This is the path that powers sidebar
// counts, the Approvals tab, nudge banners, and any direct UI actions
// (e.g. tapping a checkbox to mark an item done) that don't go through chat.
//
// Chat-driven mutations ("move that ticket to me") do NOT go through this
// interface — see chat-context.ts. After such a mutation, the backend should
// re-call getSummary()/listItems() here to refresh whatever the adapter's
// vendor API now reports, so the two paths stay in sync.

import {
  PipelineItem,
  PipelineItemInput,
  PipelineItemPatch,
  PipelineProjectRef,
  PipelineSummary,
  ListItemsOptions,
} from './types';

export interface StructuredPipelineAdapter {
  /** Matches the pipeline id this adapter implements, e.g. 'roam-v1'. */
  readonly id: string;

  listItems(project: PipelineProjectRef, opts?: ListItemsOptions): Promise<PipelineItem[]>;

  getItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem | null>;

  /** Cheap, frequently-polled summary — this is what badges/counts read from. */
  getSummary(project: PipelineProjectRef): Promise<PipelineSummary>;

  createItem(project: PipelineProjectRef, input: PipelineItemInput): Promise<PipelineItem>;

  updateItem(
    project: PipelineProjectRef,
    itemId: string,
    patch: PipelineItemPatch
  ): Promise<PipelineItem>;

  completeItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem>;

  reopenItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem>;
}
