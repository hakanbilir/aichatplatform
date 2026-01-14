
import { prisma } from '@ai-chat/db';

export async function processTrainingRunBatch(limit: number = 10): Promise<number> {
  // 1. Pick up QUEUED runs and start them
  const queuedRuns = await prisma.trainingRun.findMany({
    where: { status: 'QUEUED' },
    take: limit,
  });

  let processedCount = 0;

  for (const run of queuedRuns) {
    await prisma.trainingRun.update({
      where: { id: run.id },
      data: { status: 'RUNNING' },
    });
    processedCount++;
  }

  // 2. Advance RUNNING runs (simulate progress)
  const runningRuns = await prisma.trainingRun.findMany({
    where: { status: 'RUNNING' },
    take: limit,
    include: {
      _count: {
        select: { trainingMetrics: true }
      }
    }
  });

  for (const run of runningRuns) {
    const step = run._count.trainingMetrics + 1;
    const maxSteps = 100; // Simulate 100 steps

    if (step > maxSteps) {
      await prisma.trainingRun.update({
        where: { id: run.id },
        data: { status: 'COMPLETED' },
      });
    } else {
      // Add metric
      // Simulate loss curve: decreasing exponentially with some noise
      const loss = 2.5 * Math.exp(-step / 20) + (Math.random() * 0.1);
      const accuracy = 1 - (loss / 3);

      await prisma.trainingRunMetric.create({
        data: {
          trainingRunId: run.id,
          step,
          loss,
          accuracy: Math.max(0, Math.min(1, accuracy)), // clamp between 0 and 1
        }
      });
    }
    processedCount++;
  }

  return processedCount;
}
