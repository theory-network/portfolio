// libs/pipeline-core/src/mcp-bridge.ts
//
// The backend acts as the actual MCP client — it connects to the project's
// MCP server, lists the tools it exposes, and executes tool calls. Whichever
// ModelProvider is active just sees a plain ToolDefinition[] / gets told to
// call one; it never talks to the MCP server directly. This is what makes
// the chat side model-agnostic: MCP is a detail of *our* backend, not of the
// model API we happen to be using this week.
//
// Implementation uses the official MCP TypeScript SDK
// (@modelcontextprotocol/sdk) — connection/session handling stubbed below
// since it depends on your transport choice (SSE vs. streamable HTTP) and
// how you want to pool/cache connections across chat turns.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ToolDefinition } from './model-provider.interface';
import { McpServerConfig } from './chat-context';

// TODO: replace with a real connection pool keyed by server URL — reconnecting
// per chat turn works but is wasteful; most MCP transports support a
// long-lived session.
async function getClient(server: McpServerConfig): Promise<Client> {
  const client = new Client({ name: 'command-center', version: '1.0.0' });
  const transport = new SSEClientTransport(new URL(server.url));
  await client.connect(transport);
  return client;
}

export async function listMcpTools(server: McpServerConfig): Promise<ToolDefinition[]> {
  const client = await getClient(server);
  const { tools } = await client.listTools();
  return tools.map((t) => ({
    name: t.name,
    description: t.description ?? '',
    inputSchema: t.inputSchema as Record<string, unknown>,
  }));
}

export async function callMcpTool(
  server: McpServerConfig,
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  const client = await getClient(server);
  const result = await client.callTool({ name: toolName, arguments: input });
  // MCP tool results are content blocks (text/image/etc.) — flatten text blocks
  // for feeding back into the model as a plain string, matching ModelMessage's
  // 'tool' role shape.
  return (result.content as any[])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}
