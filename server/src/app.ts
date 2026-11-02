import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.use('/api', apiRouter);
  if (env.serveClient !== false) serveClient(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

/**
 * Serves the built SPA from the same origin as the API (so auth cookies stay first-party).
 * Both src/app.ts and the bundled dist/server.js sit two levels below the repo root.
 */
function serveClient(app: express.Express) {
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  const indexHtml = `${clientDist}/index.html`;
  if (!existsSync(indexHtml)) {
    // In development the Vite dev server serves the app, so a missing build is expected there.
    if (env.serveClient === true || env.isProduction) {
      console.warn(`Not serving the web app: ${indexHtml} is missing. Run "npm run build" (it builds client and server).`);
    }
    return;
  }
  console.log(`Serving the web app from ${clientDist}`);

  // Hashed assets never change, so cache them for a year; everything else revalidates.
  app.use('/assets', express.static(`${clientDist}/assets`, { immutable: true, maxAge: '1y', index: false }));
  app.use(express.static(clientDist, { index: false, maxAge: 0 }));

  // Client-side routes: any other GET/HEAD outside /api gets the app shell.
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}
