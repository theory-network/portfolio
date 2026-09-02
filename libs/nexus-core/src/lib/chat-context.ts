// libs/pipeline-core/src/chat-context.ts
//
// Identifies which MCP server(s) back a project and scopes the system prompt
// to them. This is provider-agnostic by design: mcp-bridge.ts is what actually
// connects to a server and runs tools, so the same McpServerConfig here works
// no matter which ModelProvider (Claude, OpenAI, DeepSeek, ...) is active.
//
// A project can have up to two connections — 'todo' (Roam/Linear, tracking
// and status) and 'work' (GitHub/GitLab, where the actual work happens).
// Both, if present, contribute their own MCP server and system-prompt scoping
// to the same chat — the model sees tools from both and picks whichever fits
// the user's request.
//
// After a chat turn that mutated something via MCP, call syncAfterChatTurn()
// so the structured adapter's cached counts (badges, nudges) catch up.

import { ProjectConfig, PipelineProjectRef, PipelineSummary } from './types';
import { getStructuredAdapter } from './registry';

export interface McpServerConfig {
  type: 'url';
  url: string;
  name: string;
}

const MCP_SERVERS_BY_SOURCE: Record<'roam' | 'linear' | 'github' | 'gitlab', McpServerConfig> = {
  roam: { type: 'url', url: 'https://mcp.roamresearch.com/mcp/claude', name: 'roam-mcp' },
  linear: { type: 'url', url: 'https://mcp.linear.app/mcp', name: 'linear-mcp' },
  github: { type: 'url', url: 'https://api.githubcopilot.com/mcp', name: 'github-mcp' },
  gitlab: { type: 'url', url: 'https://gitlab.com/api/v4/mcp', name: 'gitlab-mcp' }, // TODO: verify actual GitLab MCP endpoint when adding real support
};

function sourceFromPipelineId(pipelineId: string): 'roam' | 'linear' | 'github' | 'gitlab' {
  if (pipelineId.startsWith('roam')) return 'roam';
  if (pipelineId.startsWith('linear')) return 'linear';
  if (pipelineId.startsWith('github')) return 'github';
  if (pipelineId.startsWith('gitlab')) return 'gitlab';
  throw new Error(`Unknown source for pipeline "${pipelineId}"`);
}

/** Which MCP server backs a single connection — the building block getMcpServersForProject fans out over. */
export function getMcpServerForConnection(connection: PipelineProjectRef): McpServerConfig {
  return MCP_SERVERS_BY_SOURCE[sourceFromPipelineId(connection.pipeline)];
}

/**
 * Which MCP server(s) (per mcp-bridge.ts) back this project's chat tools.
 * Returns one entry per configured connection (todo, work), deduped in case
 * both roles happen to point at the same underlying source.
 */
export function getMcpServersForProject(project: ProjectConfig): McpServerConfig[] {
  const connections = [project.todo, project.work].filter((c): c is PipelineProjectRef => !!c);
  const servers = connections.map(getMcpServerForConnection);
  return Array.from(new Map(servers.map((s) => [s.name, s])).values());
}

function contextForConnection(connection: PipelineProjectRef): string {
  const source = sourceFromPipelineId(connection.pipeline);
  switch (source) {
    case 'roam':
      return `Tracking (todo): the Roam graph "${connection.sourceId}". ` +
        `Only read/write blocks on this graph unless the user explicitly names another.`;
    case 'linear':
      return `Tracking (todo): the Linear team/project "${connection.sourceId}". ` +
        `Only read/write issues in this team unless the user explicitly names another.`;
    case 'github':
      return `Work: the GitHub repo "${connection.sourceId}". ` +
        `Only open/modify PRs, issues, or branches in this repo unless the user explicitly names another.`;
    case 'gitlab':
      return `Work: the GitLab project "${connection.sourceId}". ` +
        `Only open/modify merge requests or issues in this project unless the user explicitly names another.`;
  }
}

/**
 * System-prompt fragment scoping the model to the right graph/team/repo and
 * telling it which identifiers to use — keeps "move that ticket to me" or
 * "open a PR for this" unambiguous even with several sources connected.
 * Combines both roles when both are configured.
 */
export function buildProjectSystemContext(project: ProjectConfig): string {
  const lines = [project.todo, project.work]
    .filter((c): c is PipelineProjectRef => !!c)
    .map(contextForConnection);
  return `Project: ${project.projectName}.\n${lines.join('\n')}`;
}

/**
 * Call after any chat turn whose response included an mcp_tool_use block for
 * this project — i.e. the model actually mutated something. Re-fetches the
 * summary from the structured adapter for whichever connection was touched,
 * so badges/counts reflect the change without waiting for the next poll.
 * Defaults to the 'todo' connection since that's what badges/counts track;
 * pass 'work' explicitly if the mutation was e.g. a GitHub PR action.
 */
export async function syncAfterChatTurn(
  project: ProjectConfig,
  role: 'todo' | 'work' = 'todo'
): Promise<PipelineSummary | null> {
  const connection = project[role];
  if (!connection) return null;
  const adapter = getStructuredAdapter(connection.pipeline);
  return adapter.getSummary(connection);
}
