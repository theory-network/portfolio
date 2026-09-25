import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { Layout } from './Layout';
import { HomePage } from './pages';

// Code-based route tree (no codegen / vite plugin needed). The root renders the
// site chrome; child routes map a path to a page. Only Home exists so far.
const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
