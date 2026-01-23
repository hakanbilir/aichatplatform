import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function calculateProjectedUsage(usageHistory: any[], daysToProject: number = 30): Promise<number> {
  return new Promise((resolve, reject) => {
    const extension = __filename.endsWith('.ts') ? '.ts' : '.js';
    const workerPath = path.resolve(__dirname, `../workers/projectionWorker${extension}`);

    // If running in TS mode (dev), we need to ensure the worker can handle TS.
    // In a robust setup, we might check process.execArgv or use a worker helper.
    // Here we blindly assume if it's .ts, we need tsx loader if running in Node.
    // If running in Bun, it handles it automatically if we don't pass execArgv (bun runs workers with bun).

    const isBun = typeof process.versions.bun !== 'undefined';

    const workerOptions: any = {};
    if (!isBun && extension === '.ts') {
        workerOptions.execArgv = ['--import', 'tsx/esm'];
    }

    const worker = new Worker(workerPath, workerOptions);

    worker.postMessage({ usageHistory, daysToProject });

    worker.on('message', (result) => {
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result.projectedUsage);
      }
      worker.terminate();
    });

    worker.on('error', (err) => {
      reject(err);
      worker.terminate();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}
