import { getConfig } from '@ai-chat/config';
import { buildServer } from './app';

async function start() {
  const config = getConfig();
  const port = config.API_PORT;
  const host = config.API_HOST;

  const app = await buildServer();

  app
    .listen({ port, host })
    .then(() => {
      app.log.info(`API Gateway listening on http://${host}:${port}`);
    })
    .catch((err) => {
      app.log.error(err, 'Failed to start API Gateway');
      process.exit(1);
    });
}

start();
