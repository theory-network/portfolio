// libs/pipeline-core/src/chat-orchestrator.ts
//
// The actual per-message loop for a project-context chat turn. Wires
// together: whichever ModelProvider is active, the MCP tools for this
// project's connections (todo, work — either or both), and the
// structured-adapter sync that keeps badges/counts honest after a tool call
// mutates something.
//
// This is the one function the chat pane's backend endpoint should call —
// everything upstream of it (Angular chat UI, message history storage) and
// everything downstream (which model, which MCP server(s)) stays swappable.

import { ModelMessage, ToolDefinition } from './model-provider.interface';
import { ProjectConfig, PipelineProjectRef } from './types';
import { getActiveModelProvider } from './model-registry';
import { getMcpServerForConnection, buildProjectSystemContext, syncAfterChatTurn, McpServerConfig } from './chat-context';
import { listMcpTools, callMcpTool } from './mcp-bridge';

const MAX_TOOL_ROUNDS = 4;

export interface ChatTurnResult {
  text: string;
  didMutate: boolean; // true if any tool call happened, i.e. syncAfterChatTurn was needed
}

/** One connected server plus which role ('todo' | 'work') it serves, so a tool call can be routed back to the right role for syncing. */
interface RoutedServer {
  role: 'todo' | 'work';
  connection: PipelineProjectRef;
  server: McpServerConfig;
}

export async function runChatTurn(
  project: ProjectConfig,
  history: ModelMessage[],
  userMessage: string
): Promise<ChatTurnResult> {
  const provider = getActiveModelProvider();

  // Build one routed entry per configured connection (todo, work — either or
  // both), retaining the role association so a tool call can be traced back
  // to which connection it mutated, for syncAfterChatTurn.
  const routed: RoutedServer[] = (['todo', 'work'] as const)
    .filter((role) => !!project[role])
    .map((role) => {
      const connection = project[role]!;
      return { role, connection, server: getMcpServerForConnection(connection) };
    });

  // Fan out tool listing across every connected server and remember which
  // routed entry each tool name came from.
  const toolsByServer = await Promise.all(routed.map(async (entry) => ({
    entry,
    tools: await listMcpTools(entry.server),
  })));
  const routedForTool = new Map<string, RoutedServer>();
  const tools: ToolDefinition[] = [];
  for (const { entry, tools: serverTools } of toolsByServer) {
    for (const tool of serverTools) {
      routedForTool.set(tool.name, entry);
      tools.push(tool);
    }
  }

  const messages: ModelMessage[] = [...history, { role: 'user', content: userMessage }];
  const mutatedRoles = new Set<'todo' | 'work'>();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await provider.sendMessage({
      systemPrompt: buildProjectSystemContext(project),
      messages,
      tools,
    });

    if (response.toolCalls.length === 0) {
      for (const role of mutatedRoles) await syncAfterChatTurn(project, role);
      return { text: response.text ?? '', didMutate: mutatedRoles.size > 0 };
    }

    messages.push({ role: 'assistant', content: response.text ?? '', toolCalls: response.toolCalls });

    for (const call of response.toolCalls) {
      const entry = routedForTool.get(call.name);
      if (!entry) {
        messages.push({ role: 'tool', toolCallId: call.id, toolName: call.name, content: `Unknown tool "${call.name}"` });
        continue;
      }
      const result = await callMcpTool(entry.server, call.name, call.input);
      mutatedRoles.add(entry.role);
      messages.push({ role: 'tool', toolCallId: call.id, toolName: call.name, content: result });
    }
  }

  // Hit the round cap without the model settling on a final text answer —
  // surface what we have rather than looping forever.
  for (const role of mutatedRoles) await syncAfterChatTurn(project, role);
  return { text: 'Reached tool-call limit for this turn.', didMutate: mutatedRoles.size > 0 };
}
