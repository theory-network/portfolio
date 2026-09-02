// libs/pipeline-core/src/registry.ts
//
// Resolves the `pipeline` string stored on a project (the same "Roam v1" /
// "Linear v1" values the admin modal's Pipeline dropdown writes, slugified)
// to a structured adapter instance. Adding a new source or a new version of
// an existing one (e.g. a future "roam-v2") is just a new adapter + one line
// here — the rest of the app only ever talks to StructuredPipelineAdapter.

import { StructuredPipelineAdapter } from './adapter.interface';
import { createRoamV1Adapter } from './adapters/roam-v1.adapter';
import { createLinearV1Adapter } from './adapters/linear-v1.adapter';
import { createGitHubV1Adapter } from './adapters/github-v1.adapter';

// TODO: source these from your actual secrets manager / env config, not inline.
const registry: Record<string, StructuredPipelineAdapter> = {
  'roam-v1': createRoamV1Adapter({ apiToken: process.env.ROAM_API_TOKEN! }),
  'linear-v1': createLinearV1Adapter({ apiKey: process.env.LINEAR_API_KEY! }),
  'github-v1': createGitHubV1Adapter({ token: process.env.GITHUB_TOKEN! }),
};

export function getStructuredAdapter(pipelineId: string): StructuredPipelineAdapter {
  const adapter = registry[pipelineId];
  if (!adapter) {
    throw new Error(`No structured adapter registered for pipeline "${pipelineId}"`);
  }
  return adapter;
}

/** Slugifies the admin dropdown's display value ("Roam v1") into a registry key ("roam-v1"). */
export function pipelineIdFromLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}
