import { prisma } from '@ai-chat/db';

export async function processTrainingRunsBatch(batchSize = 10): Promise<number> {
    // 1. Handle QUEUED -> RUNNING
    const queuedRuns = await prisma.trainingRun.findMany({
        where: { status: 'QUEUED' },
        take: batchSize
    });

    for (const run of queuedRuns) {
        await prisma.trainingRun.update({
            where: { id: run.id },
            data: {
                status: 'RUNNING',
                startedAt: new Date()
            }
        });
    }

    // 2. Handle RUNNING -> progress update or COMPLETED
    const runningRuns = await prisma.trainingRun.findMany({
        where: { status: 'RUNNING' },
        take: batchSize,
        include: {
            trainingMetrics: {
                orderBy: { step: 'desc' },
                take: 1
            }
        }
    });

    let updates = queuedRuns.length;

    for (const run of runningRuns) {
        // Simulate training steps
        // Max steps = 100 for simulation
        const currentStep = run.trainingMetrics[0]?.step || 0;
        const maxSteps = 100;

        if (currentStep >= maxSteps) {
             await prisma.trainingRun.update({
                where: { id: run.id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date()
                }
            });
            updates++;
            continue;
        }

        // Add a new metric point
        const nextStep = currentStep + 10;
        // Simulate loss decreasing
        const loss = Math.max(0.1, 2.0 * Math.exp(-nextStep / 50) + (Math.random() * 0.1));
        const accuracy = Math.min(0.99, 1.0 - loss/5);
        const epoch = nextStep / 20; // 5 epochs total

        await prisma.trainingRunMetric.create({
            data: {
                trainingRunId: run.id,
                step: nextStep,
                epoch: epoch,
                metrics: {
                    loss,
                    accuracy,
                    epoch
                }
            }
        });

        // Also update the metrics blob on TrainingRun if needed
        await prisma.trainingRun.update({
            where: { id: run.id },
            data: {
                metrics: {
                    loss,
                    accuracy,
                    epoch,
                    currentStep: nextStep
                }
            }
        });

        updates++;
    }

    return updates;
}
