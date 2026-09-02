// libs/pipeline-adapters/src/github-v1.adapter.ts
//
// Structured reads against GitHub's REST API (https://docs.github.com/rest),
// for fast open-PR/issue counts on the 'work' connection. Deliberately
// separate from the GitHub MCP server used on the chat path — same repo,
// direct hit here for badges/summaries so they don't cost an LLM call.
//
// Note this adapter maps PRs into the same PipelineItem shape as Roam blocks
// and Linear issues, so the UI never needs a GitHub-specific rendering path
// for counts/badges — only the chat's tool results are GitHub-shaped.

import { StructuredPipelineAdapter } from '../adapter.interface';
import {
  PipelineItem,
  PipelineItemInput,
  PipelineItemPatch,
  PipelineProjectRef,
  PipelineSummary,
  ListItemsOptions,
} from '../types';

interface GitHubV1AdapterConfig {
  token: string; // GitHub PAT or App installation token, server-side only
}

export function createGitHubV1Adapter(config: GitHubV1AdapterConfig): StructuredPipelineAdapter {
  async function githubREST<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        ...init?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub request failed (${res.status}): ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  function toPipelineItem(pr: any): PipelineItem {
    return {
      id: String(pr.number),
      title: pr.title,
      status: pr.merged_at ? 'done' : pr.state === 'closed' ? 'cancelled' : pr.draft ? 'open' : 'in_progress',
      priority: null, // GitHub PRs don't have a native priority field; label-based mapping is a TODO
      assignee: pr.assignee?.login ?? null,
      dueDate: null,
      url: pr.html_url,
      source: 'github',
      updatedAt: pr.updated_at,
      raw: pr,
    };
  }

  return {
    id: 'github-v1',

    // project.sourceId is expected as "org/repo"
    async listItems(project: PipelineProjectRef, opts?: ListItemsOptions): Promise<PipelineItem[]> {
      const state = opts?.includeDone ? 'all' : 'open';
      const prs = await githubREST<any[]>(`/repos/${project.sourceId}/pulls?state=${state}`);
      return prs.map(toPipelineItem);
    },

    async getItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem | null> {
      try {
        const pr = await githubREST<any>(`/repos/${project.sourceId}/pulls/${itemId}`);
        return toPipelineItem(pr);
      } catch {
        return null;
      }
    },

    async getSummary(project: PipelineProjectRef): Promise<PipelineSummary> {
      const items = await this.listItems(project);
      const stale = items.filter((i) => i.status === 'open'); // draft PRs sitting unopened for review, as a first pass
      return {
        project,
        openCount: items.length,
        needsAttention: stale.length > 0,
        attentionReason: stale.length ? `${stale.length} draft PR(s) not yet ready for review` : undefined,
        lastSyncedAt: new Date().toISOString(),
      };
    },

    async createItem(_project: PipelineProjectRef, _input: PipelineItemInput): Promise<PipelineItem> {
      // Opening a PR needs a head/base branch pair, not just a title — that's
      // a poor fit for the generic PipelineItemInput shape. Real PR creation
      // belongs on the chat/MCP path (branch-aware), not this structured adapter.
      throw new Error('createItem not supported for github-v1 — open PRs via chat (MCP), not the structured adapter.');
    },

    async updateItem(project: PipelineProjectRef, itemId: string, patch: PipelineItemPatch): Promise<PipelineItem> {
      const pr = await githubREST<any>(`/repos/${project.sourceId}/pulls/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: patch.title, state: patch.status === 'cancelled' ? 'closed' : undefined }),
      });
      return toPipelineItem(pr);
    },

    async completeItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem> {
      // "Complete" for a PR means merge, not just a status flip — a real
      // implementation should call the /merge endpoint, not PATCH state.
      const pr = await githubREST<any>(`/repos/${project.sourceId}/pulls/${itemId}/merge`, { method: 'PUT' });
      return toPipelineItem(pr);
    },

    async reopenItem(project: PipelineProjectRef, itemId: string): Promise<PipelineItem> {
      return this.updateItem(project, itemId, { status: 'open' });
    },
  };
}
