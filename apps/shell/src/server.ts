import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/** Liveness probe used by CI and the Playwright webServer readiness check. */
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

/** Static browser assets with long-lived caching (hashed file names). */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/** Everything else is rendered by Angular (per-route mode in app.routes.server.ts). */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start listening when run directly (`node dist/apps/shell/server/server.mjs`) or under PM2.
 * PORT defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT'] ?? 4000);
  app.listen(port, (error?: Error) => {
    if (error) {
      throw error;
    }
    console.log(`SSR server listening on http://localhost:${port}`);
  });
}

/** Request handler used by the Angular CLI dev server / build, and by serverless adapters. */
export const reqHandler = createNodeRequestHandler(app);
