import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { router } from './router';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

// Resolve the current route before rendering so the first render matches the
// prerendered HTML.
await router.load();

if (container.hasChildNodes()) {
  // Prerendered page (see prerender.mjs). The HTML was captured from a client
  // render, so it has none of the Suspense markers React needs to hydrate it
  // (the router always renders a Suspense boundary). Instead, render over it:
  // the output is identical (prerender.mjs checks that), and the prerendered
  // <title> and description are dropped first because React creates its own.
  document.head
    .querySelectorAll('title, meta[name="description"]')
    .forEach((el) => el.remove());
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
