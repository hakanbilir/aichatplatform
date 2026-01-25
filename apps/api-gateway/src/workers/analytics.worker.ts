/// <reference types="node" />
import { parentPort, workerData } from 'worker_threads';
import { prisma } from '@ai-chat/db';

async function run() {
  const { orgId, days } = workerData;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        plan: true,
        monthlySoftLimitTokens: true,
        monthlyHardLimitTokens: true,
      },
    });

    if (!org) {
      parentPort?.postMessage({ type: 'error', error: 'Org not found' });
      return;
    }

    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch messages (I/O bound)
    const messages = await prisma.message.findMany({
      where: {
        role: 'ASSISTANT',
        createdAt: {
          gte: from,
        },
        conversation: {
          orgId,
        },
      },
      select: {
        meta: true,
        createdAt: true,
        conversation: {
          select: {
            model: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    parentPort?.postMessage({ type: 'progress', stage: 'fetched', count: messages.length });

    // CPU Bound aggregation
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let completions = 0;
    let firstMessageAt: Date | null = null;
    let lastMessageAt: Date | null = null;

    const dayBuckets = new Map<string, any>();
    const modelBuckets = new Map<string, any>();

    let processed = 0;
    const total = messages.length;

    for (const m of messages) {
      processed++;
      if (processed % 100 === 0) {
        parentPort?.postMessage({ type: 'progress', processed, total });
      }

      const meta: any = m.meta ?? {};
      const usage = meta?.usage;

      if (!usage || typeof usage !== 'object') {
        continue;
      }

      const promptTokens = typeof usage.promptTokens === 'number' ? usage.promptTokens : 0;
      const completionTokens = typeof usage.completionTokens === 'number' ? usage.completionTokens : 0;
      const totalTokens = promptTokens + completionTokens;

      totalPromptTokens += promptTokens;
      totalCompletionTokens += completionTokens;
      completions += 1;

      if (!firstMessageAt || m.createdAt < firstMessageAt) {
        firstMessageAt = m.createdAt;
      }
      if (!lastMessageAt || m.createdAt > lastMessageAt) {
        lastMessageAt = m.createdAt;
      }

      const dayKey = m.createdAt.toISOString().slice(0, 10);
      const dayExisting = dayBuckets.get(dayKey) ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      dayExisting.promptTokens += promptTokens;
      dayExisting.completionTokens += completionTokens;
      dayExisting.totalTokens += totalTokens;
      dayBuckets.set(dayKey, dayExisting);

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
        const latencies = stats.latencies as number[];

        if (latencies.length > 0) {
          const sorted = [...latencies].sort((a, b) => a - b);
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

    const usageInWindowTokens = totals.totalTokens;
    const quota = {
      monthlySoftLimitTokens: org.monthlySoftLimitTokens,
      monthlyHardLimitTokens: org.monthlyHardLimitTokens,
      usageInWindowTokens,
      softLimitRemainingTokens:
        org.monthlySoftLimitTokens != null
          ? Math.max(org.monthlySoftLimitTokens - usageInWindowTokens, 0)
          : null,
      hardLimitRemainingTokens:
        org.monthlyHardLimitTokens != null
          ? Math.max(org.monthlyHardLimitTokens - usageInWindowTokens, 0)
          : null,
      softLimitExceeded:
        org.monthlySoftLimitTokens != null && usageInWindowTokens >= org.monthlySoftLimitTokens,
      hardLimitExceeded:
        org.monthlyHardLimitTokens != null && usageInWindowTokens >= org.monthlyHardLimitTokens,
    };

    const result = {
      orgId,
      range: {
        from: from.toISOString(),
        to: now.toISOString(),
        days,
      },
      plan: org.plan,
      quota,
      totals,
      completions,
      firstMessageAt: firstMessageAt ? (firstMessageAt as Date).toISOString() : null,
      lastMessageAt: lastMessageAt ? (lastMessageAt as Date).toISOString() : null,
      byDay,
      byModel,
    };

    parentPort?.postMessage({ type: 'result', data: result });

  } catch (err: any) {
    parentPort?.postMessage({ type: 'error', error: err.message });
  }
}

run();
