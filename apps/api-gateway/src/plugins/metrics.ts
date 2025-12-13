import { FastifyPluginCallback } from 'fastify';
import { getMetrics, getMetricsContentType, httpRequestsTotal, httpRequestDurationSeconds } from '../metrics';

const metricsPlugin: FastifyPluginCallback = (app, _opts, done) => {
  const startTimeSymbol = Symbol('startTime');

  // Measure request start time
  // İstek başlangıç zamanını ölç
  app.addHook('onRequest', async (request) => {
    (request as any)[startTimeSymbol] = process.hrtime.bigint();
  });

  // Record metrics on response
  // Yanıtta metrikleri kaydet
  app.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any)[startTimeSymbol] as bigint | undefined;

    const method = request.method;
    const rawUrl = (request as { routerPath?: string }).routerPath || request.raw.url || '';
    const statusCode = reply.statusCode;

    const route = rawUrl || 'unknown';

    httpRequestsTotal.inc({
      method,
      route,
      status_code: String(statusCode),
    });

    if (startTime) {
      const endTime = process.hrtime.bigint();
      const diffNs = Number(endTime - startTime);
      const seconds = diffNs / 1e9;

      httpRequestDurationSeconds.observe(
        {
          method,
          route,
          status_code: String(statusCode),
        },
        seconds,
      );
    }
  });

  // /metrics endpoint (no auth)
  // /metrics endpoint'i (auth yok)
  app.get('/metrics', async (_request, reply) => {
    const metrics = await getMetrics();
    reply.header('Content-Type', getMetricsContentType()).send(metrics);
  });

  done();
};

export default metricsPlugin;

