import { type Route } from '@angular/router';

/**
 * Route table. Every feature is a lazy-loaded `type:feature` library inserted by
 * `pnpm nx g @starter/tools:feature` directly below this comment. Keep `''` and `**` as the
 * first and last entries. See docs/architecture/boundaries.md.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
