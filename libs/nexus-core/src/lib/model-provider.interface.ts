// libs/pipeline-core/src/model-provider.interface.ts
//
// The chat pane talks to this interface, never to a vendor SDK directly.
// Swapping "Claude" for "GPT-5" or anything else later is: write one new
// file implementing ModelProvider, add one line to model-registry.ts.
//
// Tool definitions/calls are expressed generically (JSON-schema style) so the
// same MCP-derived tool list can be handed to any provider's own
// function-calling format — see providers/*.provider.ts for the per-vendor
// translation.

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON schema
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type ModelMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; toolName: string; content: string };

export interface ModelChatRequest {
  systemPrompt: string;
  messages: ModelMessage[];
  tools: ToolDefinition[];
}

export interface ModelChatResponse {
  text: string | null;
  toolCalls: ToolCall[];
}

export interface ModelProvider {
  /** e.g. 'claude', 'gpt-5' — matches the model-registry key. */
  readonly id: string;
  sendMessage(request: ModelChatRequest): Promise<ModelChatResponse>;
}
