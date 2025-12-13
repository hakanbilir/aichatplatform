// apps/api-gateway/src/services/toolEngine.ts

import { ToolCall, ToolContext, ToolExecutionResult, ToolCallEnvelope } from '../tools/types';
import { getToolByName, listAllTools } from '../tools/registry';
import { logger } from '../observability/logger';
import { toolExecutionDurationSeconds } from '../metrics';
import { buildExternalToolsForOrg } from '../tools/externalHttpToolAdapter';
import { dispatchWebhookEvent } from './webhookDispatch';
import { z } from 'zod';

/**
 * Validate tool arguments using Zod schema (32.md, 43.md)
 * Tool argümanlarını Zod şeması kullanarak doğrula (32.md, 43.md)
 */
function validateArgs(schema: any, args: unknown): any {
  if (!schema || typeof schema !== 'object') {
    return args ?? {};
  }

  // If schema is a Zod schema object, use it for validation
  // Şema bir Zod şema nesnesiyse, doğrulama için kullan
  try {
    // Try to parse as Zod schema (it should have a parse method)
    // Zod şeması olarak ayrıştırmayı dene (parse metodu olmalı)
    if (typeof (schema as any).parse === 'function') {
      return (schema as z.ZodTypeAny).parse(args);
    }

    // If schema is a plain object describing a Zod schema, try to create one
    // Şema bir Zod şemasını açıklayan düz bir nesneyse, bir tane oluşturmayı dene
    if (schema.type === 'object' && schema.properties) {
      // Convert JSON Schema-like structure to Zod (simplified)
      // JSON Schema benzeri yapıyı Zod'a dönüştür (basitleştirilmiş)
      const zodShape: Record<string, z.ZodTypeAny> = {};
      for (const [key, prop] of Object.entries(schema.properties || {})) {
        const propAny = prop as any;
        if (propAny.type === 'string') {
          zodShape[key] = z.string();
        } else if (propAny.type === 'number') {
          zodShape[key] = z.number();
        } else if (propAny.type === 'boolean') {
          zodShape[key] = z.boolean();
        } else {
          zodShape[key] = z.any();
        }
      }
      const zodSchema = z.object(zodShape);
      return zodSchema.parse(args);
    }

    // Fallback: return args as-is if schema format is unknown
    // Yedek: şema formatı bilinmiyorsa argümanları olduğu gibi döndür
    return args ?? {};
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(`Tool argument validation failed: ${err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw err;
  }
}

export async function executeToolCall(call: ToolCall, ctx: ToolContext): Promise<ToolExecutionResult> {
  // Check both built-in and external tools
  let tool = getToolByName(call.tool);
  
  if (!tool && ctx.orgId) {
    const externalTools = await buildExternalToolsForOrg(ctx.orgId);
    tool = externalTools.find((t) => t.name === call.tool);
  }

  if (!tool) {
    logger.warn(
      {
        event: 'tool.unknown',
        tool: call.tool,
        userId: ctx.userId,
        orgId: ctx.orgId,
        conversationId: ctx.conversationId,
      },
      'Unknown tool requested',
    );

    return {
      tool: call.tool,
      ok: false,
      error: `Unknown tool: ${call.tool}`,
    };
  }

  const startedAt = process.hrtime.bigint();

  try {
    const validatedArgs = validateArgs(tool.argsSchema, call.args);

    logger.info(
      {
        event: 'tool.exec.start',
        tool: tool.name,
        userId: ctx.userId,
        orgId: ctx.orgId,
        conversationId: ctx.conversationId,
        args: validatedArgs,
      },
      'Tool execution start',
    );

    const result = await tool.execute(validatedArgs, ctx);

    const diffNs = Number(process.hrtime.bigint() - startedAt);
    const durationSec = diffNs / 1e9;

    toolExecutionDurationSeconds
      .labels(tool.name, ctx.orgId || 'none', 'true')
      .observe(durationSec);

      logger.info(
        {
          event: 'tool.exec.success',
          tool: tool.name,
          userId: ctx.userId,
          orgId: ctx.orgId,
          conversationId: ctx.conversationId,
          durationMs: Math.round(durationSec * 1000),
        },
        'Tool execution success',
      );

      // Dispatch webhook event if org context exists
      if (ctx.orgId) {
        await dispatchWebhookEvent({
          type: 'tool.exec.success',
          orgId: ctx.orgId,
          conversationId: ctx.conversationId || undefined,
          data: {
            tool: tool.name,
            durationMs: Math.round(durationSec * 1000),
          },
        }).catch((err) => {
          logger.error({ err }, 'Failed to dispatch webhook event');
        });
      }

      return {
        tool: tool.name,
        ok: true,
        result,
      };
  } catch (err) {
    const diffNs = Number(process.hrtime.bigint() - startedAt);
    const durationSec = diffNs / 1e9;

    toolExecutionDurationSeconds
      .labels(tool.name, ctx.orgId || 'none', 'false')
      .observe(durationSec);

      logger.error(
        {
          event: 'tool.exec.error',
          tool: tool.name,
          userId: ctx.userId,
          orgId: ctx.orgId,
          conversationId: ctx.conversationId,
          durationMs: Math.round(durationSec * 1000),
          error: (err as Error).message,
        },
        'Tool execution failed',
      );

      // Dispatch webhook event if org context exists
      if (ctx.orgId) {
        await dispatchWebhookEvent({
          type: 'tool.exec.error',
          orgId: ctx.orgId,
          conversationId: ctx.conversationId || undefined,
          data: {
            tool: tool.name,
            error: (err as Error).message,
            durationMs: Math.round(durationSec * 1000),
          },
        }).catch((err2) => {
          logger.error({ err: err2 }, 'Failed to dispatch webhook event');
        });
      }

      return {
        tool: tool.name,
        ok: false,
        error: (err as Error).message || 'Tool execution failed',
      };
  }
}

export async function executeToolEnvelope(
  envelope: ToolCallEnvelope,
  ctx: ToolContext,
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = [];

  for (const call of envelope.toolCalls) {
    const res = await executeToolCall(call, ctx);
    results.push(res);
  }

  return results;
}

export async function listToolsForContext(ctx: ToolContext): Promise<import('../tools/types').ToolDefinition[]> {
  const base = listAllTools();

  if (ctx.orgId) {
    const external = await buildExternalToolsForOrg(ctx.orgId);
    return [...base, ...external];
  }

  return base;
}

