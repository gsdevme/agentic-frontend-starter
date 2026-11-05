import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * Per-route render mode. Default is server rendering so authenticated,
 * data-driven pages are rendered on request. The feature generator inserts a
 * route-specific entry above the catch-all. Use `Prerender` for static routes
 * and `Client` only with a written justification in the spec.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
