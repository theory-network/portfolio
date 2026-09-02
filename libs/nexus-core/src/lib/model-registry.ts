// libs/pipeline-core/src/model-registry.ts
//
// Mirrors registry.ts's pattern for structured adapters: one place that
// decides which concrete implementation backs an id. Switching the active
// model is a config change here, not a code change anywhere else.
//
// Note how 'openai' and 'deepseek' below are the *same* factory function
// with different config — that's the whole point of openai-compatible.provider.ts.
// A genuinely different API (not OpenAI-compatible) gets its own file, like
// claude.provider.ts, and one more line here.

import { ModelProvider } from './model-provider.interface';
import { createClaudeProvider } from './providers/claude.provider';
import { createOpenAiCompatibleProvider } from './providers/openai-compatible.provider';

const registry: Record<string, ModelProvider> = {
  claude: createClaudeProvider(process.env.ANTHROPIC_API_KEY!),

  openai: createOpenAiCompatibleProvider({
    id: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-5',
  }),

  deepseek: createOpenAiCompatibleProvider({
    id: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com',
  }),

  // Example: a local/self-hosted model served through an OpenAI-compatible
  // runtime (Ollama, vLLM, LM Studio, or a custom harness that exposes the
  // same surface). No new provider file needed — just point baseURL at it.
  // 'local-llama': createOpenAiCompatibleProvider({
  //   id: 'local-llama',
  //   apiKey: 'not-needed-for-most-local-runtimes',
  //   model: 'llama-3.3-70b',
  //   baseURL: 'http://localhost:11434/v1',
  // }),
};

export function getModelProvider(id: string): ModelProvider {
  const provider = registry[id];
  if (!provider) throw new Error(`No model provider registered for id "${id}"`);
  return provider;
}

/** TODO: back this with a real per-tenant/per-user setting rather than one global env var. */
export function getActiveModelProvider(): ModelProvider {
  return getModelProvider(process.env.ACTIVE_MODEL_PROVIDER ?? 'claude');
}
