// apps/api-gateway/src/tools/timeNowTool.ts

import { ToolDefinition } from './types';

interface TimeNowArgs {}

interface TimeNowResult {
  iso: string;
  unixMs: number;
}

export const timeNowTool: ToolDefinition<TimeNowArgs, TimeNowResult> = {
  name: 'time.now',
  description: 'Returns the current server time in ISO 8601 format.',
  argsSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  async execute(_args, _ctx) {
    const now = new Date();
    return {
      iso: now.toISOString(),
      unixMs: now.getTime(),
    };
  },
};

