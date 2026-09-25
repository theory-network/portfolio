import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { Layout } from './Layout';
import { FireflyRoutePage, HomePage } from './pages';

// Code-based route tree (no codegen / vite plugin needed). The root renders the
// site chrome; child routes map a path to a page. Home and the Firefly remote so far.
const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const fireflyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portfolio/firefly',
  component: FireflyRoutePage,
});

const routeTree = rootRoute.addChildren([indexRoute, fireflyRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
