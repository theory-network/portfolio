// libs/pipeline-core/src/providers/claude.provider.ts
//
// Translates the generic ModelChatRequest into an Anthropic /v1/messages call.
// Note this does NOT use Anthropic's native `mcp_servers` passthrough param —
// that would tie the tool-calling loop to Claude specifically. Instead it uses
// plain `tools` (function-calling), fed from the same MCP-derived tool list
// every other provider gets. This is the one file that changes if Anthropic's
// SDK shape changes; nothing else in the app should need to know.

import Anthropic from '@anthropic-ai/sdk';
import { ModelProvider, ModelChatRequest, ModelChatResponse, ToolCall } from '../model-provider.interface';

export function createClaudeProvider(apiKey: string, model = 'claude-sonnet-4-6'): ModelProvider {
  const client = new Anthropic({ apiKey });

  return {
    id: 'claude',

    async sendMessage(request: ModelChatRequest): Promise<ModelChatResponse> {
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: request.systemPrompt,
        tools: request.tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.inputSchema as any,
        })),
        // TODO: this is simplified for readability. Anthropic requires tool
        // results to arrive as `tool_result` content blocks on a `user` turn
        // immediately following the `assistant` turn that issued the matching
        // `tool_use` block (matched by id) — plain string content won't work
        // once a real multi-round tool loop is wired in via chat-orchestrator.ts.
        messages: request.messages
          .filter((m) => m.role !== 'tool') // tool results get merged in below
          .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
      });

      const toolCalls: ToolCall[] = response.content
        .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
        .map((block) => ({ id: block.id, name: block.name, input: block.input as Record<string, unknown> }));

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n') || null;

      return { text, toolCalls };
    },
  };
}
