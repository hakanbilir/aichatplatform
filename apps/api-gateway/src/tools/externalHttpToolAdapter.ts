// apps/api-gateway/src/tools/externalHttpToolAdapter.ts

import { ToolContext, ToolDefinition } from './types';
import { prisma } from '@ai-chat/db';

interface HttpConfig {
  method: string;
  url: string;
  headers?: Record<string, string>;
}

export async function buildExternalToolsForOrg(orgId: string): Promise<ToolDefinition[]> {
  const defs = await prisma.externalToolDefinition.findMany({
    where: {
      orgIntegration: {
        orgId,
        isEnabled: true,
      },
      isEnabled: true,
    },
    include: {
      orgIntegration: true,
    },
  });

  const tools: ToolDefinition[] = defs.map((def: { name: string; description: string; argsSchema: unknown; httpConfig: unknown }) => {
    const httpConfig = def.httpConfig as HttpConfig;

    const tool: ToolDefinition = {
      name: def.name,
      description: def.description,
      argsSchema: def.argsSchema,
      async execute(args: any, ctx: ToolContext) {
        const body = JSON.stringify({
          orgId: ctx.orgId,
          userId: ctx.userId,
          conversationId: ctx.conversationId,
          args,
        });

        const res = await fetch(httpConfig.url, {
          method: httpConfig.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(httpConfig.headers || {}),
          },
          body,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`External tool HTTP ${res.status}: ${text}`);
        }

        const json = await res.json();
        return json;
      },
    };

    return tool;
  });

  return tools;
}

