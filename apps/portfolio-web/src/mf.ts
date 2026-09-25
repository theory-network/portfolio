import { loadRemote, registerRemotes } from '@module-federation/runtime';
import { type ComponentType, lazy } from 'react';

// The providers (remotes) this consumer loads at runtime. There are none yet:
// the Firefly Angular remote is proven in Linear issue 2.2. To add one, append
// `{ alias, name, entry }` here, where `entry` is the URL of the provider's
// `remoteEntry.js`, `name` must match the provider's federation `name`, and
// `alias` is the key passed to loadRemote()/lazyProvider().
const PROVIDERS: Array<{ alias: string; name: string; entry: string }> = [];

// `type: 'module'` is required for vite-built providers, which emit ESM
// remoteEntry.js. The federation runtime would load it as a classic `<script>`
// tag otherwise and the browser would throw `Cannot use import statement
// outside a module` (#RUNTIME-001). Revisit this for the Angular remote (2.2).
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
