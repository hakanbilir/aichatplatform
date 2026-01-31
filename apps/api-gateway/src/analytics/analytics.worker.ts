// apps/api-gateway/src/analytics/analytics.worker.ts
import { parentPort, workerData } from 'worker_threads';

// Define types for the data we expect
interface AnalyticsData {
  rows: any[]; // Raw usage rows
}

interface AnalyticsResult {
  totals: {
    requestCount: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostMicros: number;
  };
}

// Check if we are in a worker thread
if (parentPort) {
  const { rows } = workerData as AnalyticsData;

  const totals = {
    requestCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostMicros: 0,
  };

  // Simulate heavy computation / aggregation
  for (const row of rows) {
    totals.requestCount += row.requestCount || 0;
    totals.inputTokens += row.inputTokens || 0;
    totals.outputTokens += row.outputTokens || 0;
    totals.estimatedCostMicros += row.estimatedCostMicros || 0;
  }

  parentPort.postMessage({ totals });
}
