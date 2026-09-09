// Public surface of @theory/nexus-core.
export * from './lib/types';
export * from './lib/adapter.interface';
export * from './lib/registry';
export * from './lib/chat-context';
export * from './lib/chat-orchestrator';
export * from './lib/mcp-bridge';
export * from './lib/model-provider.interface';
export * from './lib/model-registry';

export * from './lib/adapters/roam-v1.adapter';
export * from './lib/adapters/linear-v1.adapter';
export * from './lib/adapters/github-v1.adapter';

export * from './lib/providers/claude.provider';
export * from './lib/providers/openai-compatible.provider';
