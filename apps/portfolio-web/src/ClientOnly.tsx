import { type ReactNode, useEffect, useState } from 'react';

// Renders `fallback` during prerendering and on the first client render, so
// hydration always matches the prerendered HTML, then swaps in `children`.
// The prerender script sets `window.__PRERENDER__` so children (here, the
// federated Firefly remote) are never mounted while the page is captured.
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!window.__PRERENDER__) setMounted(true);
  }, []);

  return mounted ? children : fallback;
}

export default ClientOnly;
