import { loadRemote, registerRemotes } from '@module-federation/runtime';
import { type ComponentType, lazy } from 'react';

// The providers (remotes) this consumer loads at runtime. To add one, append
// `{ alias, name, entry }` here, where `entry` is the URL of the provider's
// `remoteEntry.js`, `name` must match the provider's federation `name`, and
// `alias` is the key passed to loadRemote()/lazyProvider().
//
// Firefly's entry is the dev server locally, and the path CloudFront serves it
// from in production (Linear 2.4). VITE_FIREFLY_ENTRY overrides both, e.g. to
// point a production build at a locally served remote.
const FIREFLY_ENTRY: string =
  import.meta.env.VITE_FIREFLY_ENTRY ??
  (import.meta.env.DEV
    ? 'http://127.0.0.1:4201/remoteEntry.js'
    : '/remotes/firefly/remoteEntry.js');

const PROVIDERS: Array<{ alias: string; name: string; entry: string }> = [
  {
    alias: 'portfolio-firefly',
    name: 'portfolio_firefly',
    entry: FIREFLY_ENTRY,
  },
];

// `type: 'module'` is required for vite-built providers, which emit ESM
// remoteEntry.js. The federation runtime would load it as a classic `<script>`
// tag otherwise and the browser would throw `Cannot use import statement
// outside a module` (#RUNTIME-001). The Firefly remote is Vite-built too.
registerRemotes(PROVIDERS.map((remote) => ({ ...remote, type: 'module' })));

export function lazyProvider<Props = unknown>(
  alias: string,
  exposeName: string,
) {
  return lazy(async () => {
    const mod = await loadRemote<{ default: ComponentType<Props> }>(
      `${alias}/${exposeName}`,
    );
    return { default: mod!.default };
  });
}
