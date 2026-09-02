// libs/pipeline-core/src/providers/openai-compatible.provider.ts
//
// Not just "OpenAI" — this covers any API that speaks the OpenAI
// chat-completions + function-calling shape, which in practice is most of
// the ecosystem: DeepSeek, Groq, Together, and self-hosted runtimes like
// Ollama/vLLM/LM Studio all expose this same surface. Swapping between them
// is a `providerConfig` change in model-registry.ts, not a new file.
//
// A provider whose request/response shape genuinely differs (something
// that isn't OpenAI-compatible at all) needs its own file implementing
// ModelProvider, same as claude.provider.ts — but that's the exception,
// not the common case.

import OpenAI from 'openai';
import { ModelProvider, ModelChatRequest, ModelChatResponse, ToolCall } from '../model-provider.interface';

export interface OpenAiCompatibleConfig {
  id: string;         // registry key, e.g. 'openai', 'deepseek', 'local-llama'
  apiKey: string;
  model: string;
  baseURL?: string;   // omit for api.openai.com; set for DeepSeek/Groq/self-hosted/etc.
}

export function createOpenAiCompatibleProvider(config: OpenAiCompatibleConfig): ModelProvider {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });

  return {
    id: config.id,

    async sendMessage(request: ModelChatRequest): Promise<ModelChatResponse> {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          // TODO: same tool-result threading caveat as claude.provider.ts —
          // this API expects a `role: 'tool'` message with `tool_call_id` set,
          // this simplified mapping needs to preserve that id.
          ...request.messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.role === 'tool' ? { tool_call_id: (m as any).toolCallId } : {}),
          })),
        ] as any,
        tools: request.tools.map((t) => ({
          type: 'function' as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema,
          },
        })),
      });

      const message = response.choices[0].message;
      const toolCalls: ToolCall[] = (message.tool_calls ?? [])
        .filter((call): call is typeof call & { type: 'function' } => call.type === 'function')
        .map((call) => ({
          id: call.id,
          name: call.function.name,
          input: JSON.parse(call.function.arguments || '{}'),
        }));

      return { text: message.content, toolCalls };
    },
  };
}
