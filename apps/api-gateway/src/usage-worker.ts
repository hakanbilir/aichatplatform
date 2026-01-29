import { parentPort, workerData } from 'worker_threads';

interface OrgDailyUsage {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
}

function run() {
  const { rows } = workerData as { rows: OrgDailyUsage[] };

  const totals = {
    requestCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostMicros: 0,
  };

  for (const row of rows) {
    totals.requestCount += row.requestCount;
    totals.inputTokens += row.inputTokens;
    totals.outputTokens += row.outputTokens;
    totals.estimatedCostMicros += row.estimatedCostMicros;
  }

  parentPort?.postMessage(totals);
}

run();
