import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { createApp } from './app';
import { ensureFirstAdmin } from './modules/users/bootstrapAdmin';
import { checkEmailSetup } from './utils/mailer';

async function main() {
  // Render sets RENDER=true. Without NODE_ENV=production cookies aren't marked Secure and logs are verbose.
  if (process.env.RENDER && !env.isProduction) {
    console.warn('NODE_ENV is not "production" — add NODE_ENV=production in the Render service\'s Environment tab.');
  }
  await connectDB();
  await ensureFirstAdmin();

  const server = createApp().listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    void checkEmailSetup();
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down…`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
