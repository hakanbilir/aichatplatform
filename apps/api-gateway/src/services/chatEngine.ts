// apps/api-gateway/src/services/chatEngine.ts

import { prisma } from '@ai-chat/db';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Prisma types are available via workspace
import type { Prisma } from '@prisma/client';
import { ProviderMessage, ProviderUsage } from '../providers/base';
import { getModelConfig, resolveModelId } from '../config/models';
import { getProviderForModel } from './modelRouter';
import { listToolsForContext, executeToolEnvelope } from './toolEngine';
import { ToolCallEnvelope, ToolContext } from '../tools/types';
import { buildToolsSystemPrompt } from './chatEngineToolsPrompt';
import { logger } from '../observability/logger';
import { chatTurnDurationSeconds } from '../metrics';
import { dispatchWebhookEvent } from './webhookDispatch';
import { retrieveRelevantChunks } from './knowledgeRetrieval';
import { getOrgAiPolicy } from './orgAiPolicy';
import { emitEvent } from '../events/emitter';
import { recordUsage } from '../usage/usageTracker';

export type ChatRole = 'SYSTEM' | 'USER' | 'ASSISTANT' | 'TOOL';

export interface RunConversationTurnInput {
  conversationId: string;
  userId: string;
  content: string; // latest user message content
}

export interface RunConversationTurnResult {
  assistantMessageId: string;
  assistantContent: string;
  usage?: ProviderUsage;
}

function parseToolEnvelopeCandidate(text: string): ToolCallEnvelope | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;

  try {
    const json = JSON.parse(trimmed);
    if (!json || typeof json !== 'object' || !Array.isArray(json.toolCalls)) return null;
    return json as ToolCallEnvelope;
  } catch {
    return null;
  }
}

export async function runConversationTurn(
  input: RunConversationTurnInput,
): Promise<RunConversationTurnResult> {
  const { conversationId, userId, content } = input;
  const startedAt = process.hrtime.bigint();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      orgId: true,
      model: true,
      temperature: true,
      systemPrompt: true,
      toolsEnabled: true,
      kbConfig: true,
      chatProfileId: true, // Include ChatProfile ID (42.md)
      metadata: true, // Include metadata for presetId (35.md)
      chatProfile: {
        select: {
          id: true,
          name: true,
          modelProvider: true,
          modelName: true,
          temperature: true,
          topP: true,
          maxTokens: true,
          systemTemplateId: true,
          systemTemplateVersion: true,
          enableTools: true,
          enableRag: true,
          safetyLevel: true,
          providerConfig: true
        }
      }
    }
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Create the user message first so history is consistent
  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'USER',
      content,
      meta: {},
      orgId: conversation.orgId ?? undefined,
    },
  });

  // Emit message_sent event
  if (conversation.orgId) {
    await emitEvent({
      type: 'conversation.message_sent',
      context: {
        orgId: conversation.orgId,
        userId,
        conversationId: conversation.id,
        messageId: userMessage.id
      },
      metadata: {
        modelId: conversation.model,
        hasTools: Boolean(conversation.toolsEnabled),
        hasRag: Boolean((conversation.kbConfig as any)?.rag?.enabled)
      }
    }).catch((err) => {
      logger.error({ err }, 'Failed to emit message_sent event');
    });
  }

  // Load recent history (e.g. last 50 messages)
  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: {
      role: true,
      content: true,
    },
  });

  // If ChatProfile is present, use its model config (42.md)
  // ChatProfile varsa, model yapılandırmasını kullan (42.md)
  let effectiveModelId = resolveModelId(conversation.model);
  let effectiveTemperature = typeof conversation.temperature === 'number'
    ? conversation.temperature
    : undefined;
  // These are assigned but not currently used in LLM calls - kept for future use
  // @ts-ignore - intentionally unused, reserved for future use
  let _effectiveTopP = undefined;
  // @ts-ignore - intentionally unused, reserved for future use
  let _effectiveMaxTokens: number | null | undefined = undefined;
  void _effectiveTopP; // Suppress unused variable warning
  void _effectiveMaxTokens; // Suppress unused variable warning

  if (conversation.chatProfile) {
    const profile = conversation.chatProfile;
    effectiveModelId = `${profile.modelProvider}:${profile.modelName}`;
    effectiveTemperature = profile.temperature;
    _effectiveTopP = profile.topP;
    _effectiveMaxTokens = profile.maxTokens;
    void _effectiveTopP; // Suppress unused variable warning
    void _effectiveMaxTokens; // Suppress unused variable warning

    // Render system prompt from template if present (42.md)
    if (profile.systemTemplateId && profile.systemTemplateVersion && conversation.orgId) {
      const { renderSystemPromptFromProfile } = await import('../promptStudio/render');
      const rendered = await renderSystemPromptFromProfile(profile.id, {
        orgId: conversation.orgId,
        userId,
        conversationId: conversation.id
      });
      if (rendered && !conversation.systemPrompt) {
        // Only use rendered prompt if no custom system prompt exists
        // Yalnızca özel sistem istemi yoksa işlenmiş istemi kullan
        (conversation as any).systemPrompt = rendered;
      }
    }
  }

  const modelConfig = getModelConfig(effectiveModelId);
  const provider = getProviderForModel(modelConfig);

  const temperature = effectiveTemperature ?? modelConfig.defaultTemperature;

  const toolsEnabled = (conversation.toolsEnabled as any) || {};
  const structuredToolsEnabled = Boolean(toolsEnabled.structuredTools);

  // RAG retrieval (if enabled)
  let ragContextText: string | null = null;
  const kbConfig = (conversation.kbConfig as any) || {};
  if (kbConfig.rag?.enabled && conversation.orgId) {
    const maxChunks = kbConfig.rag.maxChunks ?? 4;
    try {
      const chunks = await retrieveRelevantChunks({
        orgId: conversation.orgId,
        spaceId: kbConfig.rag.spaceId ?? null,
        query: content, // The latest user message content
        limit: maxChunks
      });

      if (chunks.length > 0) {
        ragContextText = chunks
          .map((c) => c.text)
          .join('\n\n');

        // Emit RAG usage event
        await emitEvent({
          type: 'conversation.rag_used',
          context: {
            orgId: conversation.orgId!,
            userId,
            conversationId: conversation.id
          },
          metadata: {
            spaceId: kbConfig.rag.spaceId ?? null,
            chunkCount: chunks.length
          }
        }).catch((err) => {
          logger.error({ err }, 'Failed to emit rag_used event');
        });
      }
    } catch (err) {
      logger.warn({
        event: 'rag.retrieval.error',
        conversationId: conversation.id,
        orgId: conversation.orgId,
        error: (err as Error).message
      }, 'RAG retrieval failed, continuing without context');
    }
  }

  // Build base provider messages (history)
  // System messages priority: Org AI Policy → Preset → Custom → RAG → History
  const baseMessages: ProviderMessage[] = [];

  // 1. Org AI Policy system prompt (if present)
  if (conversation.orgId) {
    try {
      const policy = await getOrgAiPolicy(conversation.orgId);
      if (policy && policy.systemPrompt.trim()) {
        baseMessages.push({
          role: 'system',
          content: policy.systemPrompt.trim()
        });
      }
    } catch (err) {
      logger.warn({
        event: 'org.policy.load.error',
        conversationId: conversation.id,
        orgId: conversation.orgId,
        error: (err as Error).message
      }, 'Failed to load org AI policy, continuing without it');
    }
  }

  // 2. Conversation preset system prompt (if present)
  // Konuşma preset sistem istemi (varsa)
  const metadata = (conversation.metadata as Record<string, any>) || {};
  const presetId = metadata.presetId as string | undefined;
  
  if (presetId && conversation.orgId) {
    try {
      const preset = await prisma.conversationPreset.findFirst({
        where: {
          id: presetId,
          orgId: conversation.orgId
        },
        select: {
          systemPrompt: true
        }
      });

      if (preset && preset.systemPrompt && preset.systemPrompt.trim()) {
        baseMessages.push({
          role: 'system',
          content: preset.systemPrompt.trim()
        });
      }
    } catch (err) {
      logger.warn({
        event: 'preset.load.error',
        conversationId: conversation.id,
        presetId,
        orgId: conversation.orgId,
        error: (err as Error).message
      }, 'Failed to load preset system prompt, continuing without it');
    }
  }

  // 3. Conversation-specific system prompt (user-edited)
  if (conversation.systemPrompt && conversation.systemPrompt.trim()) {
    baseMessages.push({
      role: 'system',
      content: conversation.systemPrompt.trim(),
    });
  }

  // 4. RAG context system message (if enabled)
  if (ragContextText) {
    baseMessages.push({
      role: 'system',
      content:
        'You have access to the following knowledge base context. Use it to answer the user question. ' +
        'If the context does not contain the answer, say so explicitly.\n\n' +
        ragContextText
    });
  }

  for (const msg of history) {
    const role = (msg.role as ChatRole) || 'USER';

    if (role === 'SYSTEM') {
      baseMessages.push({ role: 'system', content: msg.content });
    } else if (role === 'USER') {
      baseMessages.push({ role: 'user', content: msg.content });
    } else if (role === 'ASSISTANT') {
      baseMessages.push({ role: 'assistant', content: msg.content });
    } else if (role === 'TOOL') {
      baseMessages.push({ role: 'tool', content: msg.content });
    }
  }

  const ctx: ToolContext = {
    userId,
    orgId: conversation.orgId,
    conversationId: conversation.id,
  };

  // If structured tools are enabled, run a two-phase orchestration:
  //   1) Ask the model if it wants to call tools.
  //   2) If it returns a ToolCallEnvelope, execute tools and then ask again with tool results.

  if (structuredToolsEnabled) {
    const tools = await listToolsForContext(ctx);
    const toolsPrompt = buildToolsSystemPrompt(tools);

    const planningMessages: ProviderMessage[] = [{ role: 'system', content: toolsPrompt }, ...baseMessages];

    const planResult = await provider.chat(planningMessages, {
      model: modelConfig.providerModel,
      temperature,
      toolsEnabled,
    });

    const envelope = parseToolEnvelopeCandidate(planResult.content);

    if (envelope && envelope.toolCalls.length > 0) {
      // Emit tool_call event
      if (conversation.orgId) {
        await emitEvent({
          type: 'conversation.tool_call',
          context: {
            orgId: conversation.orgId,
            userId,
            conversationId: conversation.id
          },
          metadata: {
            toolNames: envelope.toolCalls.map((t) => t.tool),
            modelId: conversation.model
          }
        }).catch((err) => {
          logger.error({ err }, 'Failed to emit tool_call event');
        });
      }

      // Execute tools
      const toolResults = await executeToolEnvelope(envelope, ctx);

      // Store tool result message
      const toolMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'TOOL',
          content: JSON.stringify(toolResults, null, 2),
          meta: {
            toolsEnvelope: envelope as unknown as Prisma.JsonValue,
          },
        },
      });

      // Ask model again with tool results appended
      const messagesWithTools: ProviderMessage[] = [
        ...baseMessages,
        {
          role: 'tool',
          content:
            'Tool results (JSON):\n' +
            JSON.stringify({ toolResults }, null, 2) +
            '\nUse this information to answer the user. Respond normally to the user now.',
        },
      ];

      const finalResult = await provider.chat(messagesWithTools, {
        model: modelConfig.providerModel,
        temperature,
        toolsEnabled,
      });

      const assistantMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: finalResult.content,
          meta: {
            usage: (finalResult.usage || {}) as unknown as Prisma.JsonValue,
            toolMessageId: toolMessage.id,
          },
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastActivityAt: new Date(),
        },
      });

      const diffNs = Number(process.hrtime.bigint() - startedAt);
      const durationSec = diffNs / 1e9;

      chatTurnDurationSeconds
        .labels(modelConfig.id, conversation.orgId || 'none', 'true')
        .observe(durationSec);

      // Record usage for analytics (45.md)
      // Analitik için kullanımı kaydet (45.md)
      if (conversation.orgId && finalResult.usage) {
        const modelParts = modelConfig.id.split(':');
        const provider = modelParts[0] || 'ollama';
        const modelName = modelParts.slice(1).join(':') || modelConfig.id;

        await recordUsage({
          orgId: conversation.orgId,
          userId,
          conversationId: conversation.id,
          provider,
          modelName,
          feature: 'chat',
          inputTokens: typeof finalResult.usage.promptTokens === 'number' ? finalResult.usage.promptTokens : 0,
          outputTokens: typeof finalResult.usage.completionTokens === 'number' ? finalResult.usage.completionTokens : 0
        }).catch((err) => {
          logger.error({ err }, 'Failed to record usage');
        });
      }

      logger.info(
        {
          event: 'chat.turn.completed',
          conversationId: conversation.id,
          orgId: conversation.orgId,
          model: modelConfig.id,
          temperature,
          toolsEnabled,
          structuredToolsEnabled: true,
          assistantMessageId: assistantMessage.id,
          toolsUsed: true,
          toolResultsCount: toolResults.length,
          toolNames: toolResults.map((r) => r.tool),
          durationMs: Math.round(durationSec * 1000),
        },
        'Chat turn completed with tools',
      );

      // Dispatch webhook event if org context exists
      if (conversation.orgId) {
        await dispatchWebhookEvent({
          type: 'chat.turn.completed',
          orgId: conversation.orgId,
          conversationId: conversation.id,
          data: {
            assistantMessageId: assistantMessage.id,
            model: modelConfig.id,
            toolsUsed: true,
            toolResultsCount: toolResults.length,
          },
        }).catch((err) => {
          logger.error({ err }, 'Failed to dispatch webhook event');
        });
      }

      return {
        assistantMessageId: assistantMessage.id,
        assistantContent: assistantMessage.content,
        usage: finalResult.usage,
      };
    }

    // If no valid tool envelope, fall through to normal single-pass behavior below.
  }

  // Single-pass behavior (no tools or tools not used)
  const result = await provider.chat(baseMessages, {
    model: modelConfig.providerModel,
    temperature,
    toolsEnabled,
  });

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: result.content,
      meta: {
        usage: (result.usage || {}) as unknown as Prisma.JsonValue,
      },
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastActivityAt: new Date(),
    },
  });

  const diffNs = Number(process.hrtime.bigint() - startedAt);
  const durationSec = diffNs / 1e9;

  chatTurnDurationSeconds
    .labels(modelConfig.id, conversation.orgId || 'none', structuredToolsEnabled ? 'false' : 'none')
    .observe(durationSec);

  // Record usage for analytics (45.md)
  // Analitik için kullanımı kaydet (45.md)
  if (conversation.orgId && result.usage) {
    const modelParts = modelConfig.id.split(':');
    const provider = modelParts[0] || 'ollama';
    const modelName = modelParts.slice(1).join(':') || modelConfig.id;

    await recordUsage({
      orgId: conversation.orgId,
      userId,
      conversationId: conversation.id,
      provider,
      modelName,
      feature: 'chat',
      inputTokens: typeof result.usage.promptTokens === 'number' ? result.usage.promptTokens : 0,
      outputTokens: typeof result.usage.completionTokens === 'number' ? result.usage.completionTokens : 0
    }).catch((err) => {
      logger.error({ err }, 'Failed to record usage');
    });
  }

  logger.info(
    {
      event: 'chat.turn.completed',
      conversationId: conversation.id,
      orgId: conversation.orgId,
      model: modelConfig.id,
      temperature,
      toolsEnabled,
      structuredToolsEnabled,
      assistantMessageId: assistantMessage.id,
      toolsUsed: false,
      durationMs: Math.round(durationSec * 1000),
    },
    'Chat turn completed',
  );

  // Dispatch webhook event if org context exists
  if (conversation.orgId) {
    await dispatchWebhookEvent({
      type: 'chat.turn.completed',
      orgId: conversation.orgId,
      conversationId: conversation.id,
      data: {
        assistantMessageId: assistantMessage.id,
        model: modelConfig.id,
        toolsUsed: false,
      },
    }).catch((err) => {
      logger.error({ err }, 'Failed to dispatch webhook event');
    });
  }

  return {
    assistantMessageId: assistantMessage.id,
    assistantContent: assistantMessage.content,
    usage: result.usage,
  };
}
