import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';
import { router } from './router';

// The host is a TanStack Router app. The router root renders the site
// chrome (Layout) and each child route renders a page.
// Importing from '@theory/ui' anywhere in the tree pulls in the shared theme.
export function App() {
  // Lets prerender.mjs know the client render has committed.
  useEffect(() => {
    window.__APP_READY__ = true;
  }, []);

  return <RouterProvider router={router} />;
}

export default App;
