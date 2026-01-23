import { parentPort, workerData } from 'worker_threads';

if (parentPort) {
  parentPort.on('message', (task) => {
    try {
      const { usageHistory, daysToProject } = task;

      // usageHistory is array of daily usage { date, totalTokens }
      // Simple Monte Carlo simulation

      if (!usageHistory || usageHistory.length === 0) {
        parentPort?.postMessage({ projectedUsage: 0 });
        return;
      }

      // Calculate daily changes
      const changes: number[] = [];
      for (let i = 1; i < usageHistory.length; i++) {
        changes.push(usageHistory[i].totalTokens - usageHistory[i-1].totalTokens);
      }

      const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
      // Standard deviation
      const variance = changes.length > 0
        ? changes.reduce((a, b) => a + Math.pow(b - avgChange, 2), 0) / changes.length
        : 0;
      const stdDev = Math.sqrt(variance);

      // Simulation
      const simulations = 1000;
      let totalProjected = 0;
      const lastValue = usageHistory[usageHistory.length - 1].totalTokens;

      for (let i = 0; i < simulations; i++) {
        let current = lastValue;
        for (let d = 0; d < daysToProject; d++) {
          // Random walk
          const change = avgChange + (Math.random() * 2 - 1) * stdDev;
          current += Math.max(0, change); // Assume usage doesn't drop
        }
        totalProjected += current;
      }

      const projectedUsage = Math.round(totalProjected / simulations);

      parentPort?.postMessage({ projectedUsage });

    } catch (error) {
       console.error('Worker error', error);
       parentPort?.postMessage({ error: 'Worker computation failed' });
    }
  });
}
