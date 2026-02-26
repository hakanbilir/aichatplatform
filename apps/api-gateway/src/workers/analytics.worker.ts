import { parentPort, workerData } from 'worker_threads';

import { getOrgAnalytics } from '../services/orgAnalytics';

async function run() {
  try {
    if (!parentPort) throw new Error('No parent port');

    // Simulate some "kinetic" processing delay or steps if needed,
    // but the goal is offloading the DB heavy lifting.
    const result = await getOrgAnalytics(workerData);

    parentPort.postMessage(result);
  } catch (error) {
    if (parentPort) {
      parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) });
    }
  }
}

run();
