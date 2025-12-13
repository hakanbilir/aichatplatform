// apps/api-gateway/src/tools/orgUsageSnapshotTool.ts

import { ToolDefinition, ToolContext } from './types';
import { getOrgQuotaWindowUsage, OrgQuotaWindowUsage } from '../services/orgQuotaGuard';

interface OrgUsageSnapshotArgs {
  windowDays?: number;
}

export interface OrgUsageSnapshotResult {
  orgId: string;
  windowDays: number;
  quota: OrgQuotaWindowUsage;
}

export const orgUsageSnapshotTool: ToolDefinition<OrgUsageSnapshotArgs, OrgUsageSnapshotResult> = {
  name: 'org.usageSnapshot',
  description: "Returns the organization's usage and quota snapshot for the given window (e.g. 30 days).",
  argsSchema: {
    type: 'object',
    properties: {
      windowDays: {
        type: 'number',
        minimum: 1,
        maximum: 365,
      },
    },
    additionalProperties: false,
  },
  async execute(args, ctx: ToolContext) {
    if (!ctx.orgId) {
      throw new Error('No organization context available');
    }

    const windowDays = typeof args.windowDays === 'number' ? args.windowDays : 30;
    const quota = await getOrgQuotaWindowUsage(ctx.orgId, windowDays);

    return {
      orgId: ctx.orgId,
      windowDays,
      quota,
    };
  },
};

