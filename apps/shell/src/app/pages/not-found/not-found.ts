import { Component, inject, RESPONSE_INIT } from '@angular/core';

/**
 * Catch-all route. On the server it sets the real HTTP status to 404 so crawlers, proxies and
 * uptime checks see a true not-found instead of a soft 200.
 */
@Component({
  selector: 'app-not-found',
  template: `
    <section aria-labelledby="not-found-heading" data-testid="not-found-page">
      <h1 id="not-found-heading">Page not found</h1>
      <p><a href="/">Go to the start page</a></p>
    </section>
  `,
})
export class NotFound {
  constructor() {
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) {
      responseInit.status = 404;
    }
  }
}
