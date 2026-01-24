// apps/api-gateway/src/services/orgAnalytics.ts

import { Worker } from 'worker_threads';
import { resolve } from 'path';
import { OrgQuotaWindowUsage } from './orgQuotaGuard';

export interface OrgAnalyticsOptions {
  orgId: string;
  windowDays?: number; // default 30
}

export interface OrgAnalyticsModelUsageItem {
  model: string;
  chatTurns: number;
}

export interface OrgAnalyticsToolUsageItem {
  tool: string;
  calls: number;
}

export interface OrgAnalyticsUserUsageItem {
  userId: string;
  chatTurns: number;
}

export interface OrgAnalyticsResult {
  org: {
    id: string;
    name: string;
  };
  windowDays: number;
  quota: OrgQuotaWindowUsage;
  totals: {
    chatTurns: number;
    chatTurnsWithTools: number;
    chatTurnsWithoutTools: number;
  };
  byModel: OrgAnalyticsModelUsageItem[];
  byTool: OrgAnalyticsToolUsageItem[];
  byUser: OrgAnalyticsUserUsageItem[];
}

export async function getOrgAnalytics(
  options: OrgAnalyticsOptions
): Promise<OrgAnalyticsResult> {
  return new Promise((resolvePromise, reject) => {
    // Resolving worker path relative to this file
    // Bu dosyaya göre worker yolunu çözümleme
    // We try to detect if we are running from .ts source or .js dist
    const isTs = __filename.endsWith('.ts');
    const workerFile = isTs ? '../workers/analytics.worker.ts' : '../workers/analytics.worker.js';
    const workerPath = resolve(__dirname, workerFile);

    const worker = new Worker(workerPath, {
      workerData: options,
      // Pass execution arguments to ensure TS support if needed (e.g. tsx loader)
      // Gerekirse TS desteğini sağlamak için yürütme argümanlarını iletin
      execArgv: process.execArgv
    });

    worker.on('message', (msg) => {
      if (msg.error) {
        reject(new Error(msg.error));
      } else {
        resolvePromise(msg);
      }
    });

    worker.on('error', (err) => {
      reject(err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}
