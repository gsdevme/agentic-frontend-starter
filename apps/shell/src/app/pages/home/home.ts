import { Component } from '@angular/core';

/**
 * Default route placeholder. The first real feature usually replaces this route with
 * `{ path: '', pathMatch: 'full', redirectTo: '<feature>' }` in app.routes.ts.
 * Shell plumbing only — no business content here (see docs/constitution.md §2.1).
 */
@Component({
  selector: 'app-home',
  template: `
    <section aria-labelledby="home-heading" data-testid="home-page">
      <h1 id="home-heading">Starter</h1>
      <p>
        No features are mounted yet. Add one with the
        <code>feature</code> generator.
      </p>
    </section>
  `,
})
export class Home {}
