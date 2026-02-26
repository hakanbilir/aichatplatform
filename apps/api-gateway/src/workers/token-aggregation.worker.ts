import { parentPort, workerData } from 'worker_threads';

interface MessageData {
  createdAt: string | Date;
  meta: any;
  conversation: {
    model: string | null;
  } | null;
}

interface WorkerData {
  messages: MessageData[];
}

function run() {
  const { messages } = workerData as WorkerData;

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let completions = 0;
  let firstMessageAt: Date | null = null;
  let lastMessageAt: Date | null = null;

  // Per-day buckets
  const dayBuckets = new Map<
    string,
    { promptTokens: number; completionTokens: number; totalTokens: number }
  >();

  // Per-model buckets
  const modelBuckets = new Map<
    string,
    {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      completions: number;
      latencies: number[];
    }
  >();

  for (const m of messages) {
    const meta: any = m.meta ?? {};
    const usage = meta?.usage;

    if (!usage || typeof usage !== 'object') {
      continue;
    }

    const promptTokens = typeof usage.promptTokens === 'number' ? usage.promptTokens : 0;
    const completionTokens =
      typeof usage.completionTokens === 'number' ? usage.completionTokens : 0;
    const totalTokens = promptTokens + completionTokens;

    totalPromptTokens += promptTokens;
    totalCompletionTokens += completionTokens;
    completions += 1;

    // Ensure date is a Date object
    const createdAt = new Date(m.createdAt);

    if (!firstMessageAt || createdAt < firstMessageAt) {
      firstMessageAt = createdAt;
    }
    if (!lastMessageAt || createdAt > lastMessageAt) {
      lastMessageAt = createdAt;
    }

    const dayKey = createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
    const dayExisting = dayBuckets.get(dayKey) ?? {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    dayExisting.promptTokens += promptTokens;
    dayExisting.completionTokens += completionTokens;
    dayExisting.totalTokens += totalTokens;

    dayBuckets.set(dayKey, dayExisting);

    // Model key
    const convModel = m.conversation?.model ?? null;
    const usageModel = typeof (usage as any).model === 'string' ? (usage as any).model : null;
    const modelKey = convModel || usageModel || 'unknown';

    const modelExisting = modelBuckets.get(modelKey) ?? {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      completions: 0,
      latencies: [] as number[],
    };

    modelExisting.promptTokens += promptTokens;
    modelExisting.completionTokens += completionTokens;
    modelExisting.totalTokens += totalTokens;
    modelExisting.completions += 1;

    // Latency
    let latencyMs: number | null = null;
    if (typeof (usage as any).latencyMs === 'number') {
      latencyMs = (usage as any).latencyMs;
    } else if (meta && typeof meta.providerMeta === 'object' && meta.providerMeta !== null) {
      const providerMeta: any = meta.providerMeta;
      if (typeof providerMeta.latencyMs === 'number') {
        latencyMs = providerMeta.latencyMs;
      }
    }

    if (latencyMs !== null && Number.isFinite(latencyMs) && latencyMs >= 0) {
      modelExisting.latencies.push(latencyMs);
    }

    modelBuckets.set(modelKey, modelExisting);
  }

  const byDay = Array.from(dayBuckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, stats]) => ({
      date,
      promptTokens: stats.promptTokens,
      completionTokens: stats.completionTokens,
      totalTokens: stats.totalTokens,
    }));

  const totals = {
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    totalTokens: totalPromptTokens + totalCompletionTokens,
  };

  const byModel = Array.from(modelBuckets.entries())
    .map(([model, stats]) => {
      let avgLatencyMs = 0;
      let p95LatencyMs = 0;

      if (stats.latencies.length > 0) {
        const sorted = [...stats.latencies].sort((a, b) => a - b);
        const sum = sorted.reduce((acc, v) => acc + v, 0);
        avgLatencyMs = sum / sorted.length;
        const idx = Math.floor(0.95 * (sorted.length - 1));
        p95LatencyMs = sorted[idx] ?? sorted[sorted.length - 1];
      }

      return {
        model,
        promptTokens: stats.promptTokens,
        completionTokens: stats.completionTokens,
        totalTokens: stats.totalTokens,
        completions: stats.completions,
        avgLatencyMs,
        p95LatencyMs,
      };
    })
    .sort((a, b) => b.totalTokens - a.totalTokens);

  if (parentPort) {
    parentPort.postMessage({
      totals,
      completions,
      firstMessageAt,
      lastMessageAt,
      byDay,
      byModel,
    });
  }
}

run();
