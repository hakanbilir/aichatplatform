import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

// Dedicated registry for this service
// Bu servis için özel kayıt defteri
const registry = new Registry();

// Collect Node.js default metrics (event loop, memory, etc.)
// Node.js varsayılan metriklerini topla (event loop, bellek, vb.)
collectDefaultMetrics({ register: registry });

// HTTP request metrics
// HTTP istek metrikleri
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

// Chat completion metrics
// Chat completion metrikleri
export const chatCompletionDurationSeconds = new Histogram({
  name: 'chat_completion_duration_seconds',
  help: 'Chat completion duration in seconds for LLM calls',
  labelNames: ['model', 'streaming'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 40],
  registers: [registry],
});

export const chatCompletionTokensTotal = new Counter({
  name: 'chat_completion_tokens_total',
  help: 'Total tokens used by chat completions',
  labelNames: ['model', 'type'] as const, // type: prompt|completion
  registers: [registry],
});

// Chat turn metrics
export const chatTurnDurationSeconds = new Histogram({
  name: 'chat_turn_duration_seconds',
  help: 'Chat turn duration in seconds (end-to-end)',
  labelNames: ['model', 'org_id', 'tools_used'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 40],
  registers: [registry],
});

// Tool execution metrics
export const toolExecutionDurationSeconds = new Histogram({
  name: 'tool_execution_duration_seconds',
  help: 'Tool execution duration in seconds',
  labelNames: ['tool', 'org_id', 'ok'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

export function getMetricsContentType(): string {
  return registry.contentType;
}

