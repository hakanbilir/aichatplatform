// apps/api-gateway/src/services/chatEngine.ts

import { prisma } from '@ai-chat/db';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Prisma types are available via workspace
import type { Prisma } from '@prisma/client';
import { ChatStreamEvent } from '@ai-chat/core-types';

import { ProviderMessage, ProviderUsage } from '../providers/base';
import { getModelConfig, resolveModelId } from '../config/models';
import { ToolCallEnvelope, ToolContext } from '../tools/types';
import { logger } from '../observability/logger';
import { chatTurnDurationSeconds } from '../metrics';
import { emitEvent } from '../events/emitter';
import { recordUsage } from '../usage/usageTracker';

import { getProviderForModel } from './modelRouter';
import { listToolsForContext, executeToolEnvelope } from './toolEngine';
import { buildToolsSystemPrompt } from './chatEngineToolsPrompt';
import { dispatchWebhookEvent } from './webhookDispatch';
import { retrieveRelevantChunks } from './knowledgeRetrieval';
import { getOrgAiPolicy } from './orgAiPolicy';


export type ChatRole = 'SYSTEM' | 'USER' | 'ASSISTANT' | 'TOOL';

export interface RunConversationTurnInput {
  conversationId: string;
  userId: string;
  content: string; // latest user message content
  overrides?: {
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
  };
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

async function prepareConversationContext(conversationId: string, userId: string, content: string, overrides?: RunConversationTurnInput['overrides']) {
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
      chatProfileId: true,
      metadata: true,
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

  let effectiveModelId = resolveModelId(overrides?.model ?? conversation.model);
  let effectiveTemperature = overrides?.temperature ?? (typeof conversation.temperature === 'number'
    ? conversation.temperature
    : undefined);

  // If overrides are present, they take precedence over ChatProfile too?
  // Usually explicit user overrides (if allowed) win.

  if (conversation.chatProfile && !overrides?.model) {
    const profile = conversation.chatProfile;
    effectiveModelId = `${profile.modelProvider}:${profile.modelName}`;
    effectiveTemperature = profile.temperature;

    if (profile.systemTemplateId && profile.systemTemplateVersion && conversation.orgId) {
      const { renderSystemPromptFromProfile } = await import('../promptStudio/render');
      const rendered = await renderSystemPromptFromProfile(profile.id, {
        orgId: conversation.orgId,
        userId,
        conversationId: conversation.id
      });
      if (rendered && !conversation.systemPrompt) {
        (conversation as any).systemPrompt = rendered;
      }
    }
  }

  const modelConfig = getModelConfig(effectiveModelId);
  const temperature = effectiveTemperature ?? modelConfig.defaultTemperature;
  const toolsEnabled = (conversation.toolsEnabled as any) || {};
  const structuredToolsEnabled = Boolean(toolsEnabled.structuredTools);

  // RAG retrieval
  let ragContextText: string | null = null;
  const kbConfig = (conversation.kbConfig as any) || {};
  if (kbConfig.rag?.enabled && conversation.orgId) {
    const maxChunks = kbConfig.rag.maxChunks ?? 4;
    try {
      const chunks = await retrieveRelevantChunks({
        orgId: conversation.orgId,
        spaceId: kbConfig.rag.spaceId ?? null,
        query: content,
        limit: maxChunks
      });

      if (chunks.length > 0) {
        ragContextText = chunks.map((c) => c.text).join('\n\n');
        await emitEvent({
          type: 'conversation.rag_used',
          context: { orgId: conversation.orgId!, userId, conversationId: conversation.id },
          metadata: { spaceId: kbConfig.rag.spaceId ?? null, chunkCount: chunks.length }
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

  const baseMessages: ProviderMessage[] = [];
  if (conversation.orgId) {
    try {
      const policy = await getOrgAiPolicy(conversation.orgId);
      if (policy && policy.systemPrompt.trim()) {
        baseMessages.push({ role: 'system', content: policy.systemPrompt.trim() });
      }
    } catch (err) {
      logger.warn({ error: (err as Error).message }, 'Failed to load org AI policy');
    }
  }

  const metadata = (conversation.metadata as Record<string, any>) || {};
  const presetId = metadata.presetId as string | undefined;
  if (presetId && conversation.orgId) {
    try {
      const preset = await prisma.conversationPreset.findFirst({
        where: { id: presetId, orgId: conversation.orgId },
        select: { systemPrompt: true }
      });
      if (preset && preset.systemPrompt && preset.systemPrompt.trim()) {
        baseMessages.push({ role: 'system', content: preset.systemPrompt.trim() });
      }
    } catch (err) {
      logger.warn({ error: (err as Error).message }, 'Failed to load preset system prompt');
    }
  }

  if (conversation.systemPrompt && conversation.systemPrompt.trim()) {
    baseMessages.push({ role: 'system', content: conversation.systemPrompt.trim() });
  }

  if (ragContextText) {
    baseMessages.push({
      role: 'system',
      content: 'You have access to the following knowledge base context. Use it to answer the user question. If the context does not contain the answer, say so explicitly.\n\n' + ragContextText
    });
  }

  for (const msg of history) {
    const role = (msg.role as ChatRole) || 'USER';
    baseMessages.push({ role: role === 'TOOL' ? 'tool' : role.toLowerCase() as any, content: msg.content });
  }

  const ctx: ToolContext = {
    userId,
    orgId: conversation.orgId,
    conversationId: conversation.id,
  };

  return {
    conversation,
    modelConfig,
    provider: getProviderForModel(modelConfig),
    temperature,
    toolsEnabled,
    structuredToolsEnabled,
    baseMessages,
    ctx
  };
}

async function* streamWithThoughtParsing(
  stream: AsyncGenerator<ChatStreamEvent, void, unknown>,
  onContent: (token: string) => void,
  onThought: (token: string) => void
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  let isThinking = false;

  for await (const event of stream) {
    if (event.type === 'token' && event.token) {
      const content = event.token;

      if (!isThinking) {
        if (content.includes('<think>')) {
          isThinking = true;
          const parts = content.split('<think>');
          if (parts[0]) {
            yield { type: 'token', token: parts[0] };
            onContent(parts[0]);
          }
          yield { type: 'thought_start' };

          const remaining = parts[1] || '';
          if (remaining.includes('</think>')) {
            const innerParts = remaining.split('</think>');
            if (innerParts[0]) {
              yield { type: 'thought_token', token: innerParts[0] };
              onThought(innerParts[0]);
            }
            yield { type: 'thought_end' };
            isThinking = false;
            if (innerParts[1]) {
              yield { type: 'token', token: innerParts[1] };
              onContent(innerParts[1]);
            }
          } else if (remaining) {
            yield { type: 'thought_token', token: remaining };
            onThought(remaining);
          }
        } else {
          yield event;
          onContent(content);
        }
      } else {
        if (content.includes('</think>')) {
          const parts = content.split('</think>');
          if (parts[0]) {
            yield { type: 'thought_token', token: parts[0] };
            onThought(parts[0]);
          }
          yield { type: 'thought_end' };
          isThinking = false;
          if (parts[1]) {
            yield { type: 'token', token: parts[1] };
            onContent(parts[1]);
          }
        } else {
          yield { type: 'thought_token', token: content };
          onThought(content);
        }
      }
    } else {
      yield event;
    }
  }
}

async function finalizeConversationTurn(
  conversation: any,
  modelConfig: any,
  userId: string,
  content: string,
  usage?: ProviderUsage,
  toolMessageId?: string,
  thought?: string
) {
  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content,
      meta: {
        usage: (usage || {}) as unknown as Prisma.JsonValue,
        toolMessageId: toolMessageId,
        thought: thought || undefined,
      },
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastActivityAt: new Date() },
  });

  // Analytics
  if (conversation.orgId && usage) {
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
      inputTokens: usage.promptTokens || 0,
      outputTokens: usage.completionTokens || 0
    }).catch((err) => {
      logger.error({ err }, 'Failed to record usage');
    });
  }

  return assistantMessage;
}

export async function runConversationTurn(
  input: RunConversationTurnInput,
): Promise<RunConversationTurnResult> {
  const startedAt = process.hrtime.bigint();
  const { conversation, modelConfig, provider, temperature, toolsEnabled, structuredToolsEnabled, baseMessages, ctx } =
    await prepareConversationContext(input.conversationId, input.userId, input.content, input.overrides);

  // Tools Logic
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
      if (conversation.orgId) {
        await emitEvent({
          type: 'conversation.tool_call',
          context: { orgId: conversation.orgId, userId: input.userId, conversationId: conversation.id },
          metadata: { toolNames: envelope.toolCalls.map((t) => t.tool), modelId: conversation.model }
        }).catch((err) => logger.error({ err }, 'Failed to emit tool_call event'));
      }

      const toolResults = await executeToolEnvelope(envelope, ctx);

      const toolMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'TOOL',
          content: JSON.stringify(toolResults, null, 2),
          meta: { toolsEnvelope: envelope as unknown as Prisma.JsonValue },
        },
      });

      const messagesWithTools: ProviderMessage[] = [
        ...baseMessages,
        {
          role: 'tool',
          content: 'Tool results (JSON):\n' + JSON.stringify({ toolResults }, null, 2) + '\nUse this information to answer the user. Respond normally to the user now.',
        },
      ];

      const finalResult = await provider.chat(messagesWithTools, {
        model: modelConfig.providerModel,
        temperature,
        toolsEnabled,
      });

      const assistantMessage = await finalizeConversationTurn(
        conversation,
        modelConfig,
        input.userId,
        finalResult.content,
        finalResult.usage,
        toolMessage.id
      );

      const diffNs = Number(process.hrtime.bigint() - startedAt);
      const durationSec = diffNs / 1e9;
      chatTurnDurationSeconds.labels(modelConfig.id, conversation.orgId || 'none', 'true').observe(durationSec);

      return {
        assistantMessageId: assistantMessage.id,
        assistantContent: assistantMessage.content,
        usage: finalResult.usage,
      };
    }
  }

  // Single pass
  const result = await provider.chat(baseMessages, {
    model: modelConfig.providerModel,
    temperature,
    toolsEnabled,
  });

  const assistantMessage = await finalizeConversationTurn(
    conversation,
    modelConfig,
    input.userId,
    result.content,
    result.usage
  );

  const diffNs = Number(process.hrtime.bigint() - startedAt);
  const durationSec = diffNs / 1e9;
  chatTurnDurationSeconds.labels(modelConfig.id, conversation.orgId || 'none', structuredToolsEnabled ? 'false' : 'none').observe(durationSec);

  return {
    assistantMessageId: assistantMessage.id,
    assistantContent: assistantMessage.content,
    usage: result.usage,
  };
}

export async function* streamConversationTurn(
  input: RunConversationTurnInput,
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const startedAt = process.hrtime.bigint();
  const { conversation, modelConfig, provider, temperature, toolsEnabled, structuredToolsEnabled, baseMessages, ctx } =
    await prepareConversationContext(input.conversationId, input.userId, input.content, input.overrides);

  if (!provider.chatStream) {
    throw new Error('Provider does not support streaming');
  }

  let finalContent = '';
  let finalThought = '';
  let finalUsage: ProviderUsage | undefined;
  let toolMessageId: string | undefined;

  // Tools Logic (Hybrid: Plan non-streaming, Final streaming)
  if (structuredToolsEnabled) {
    const tools = await listToolsForContext(ctx);
    const toolsPrompt = buildToolsSystemPrompt(tools);
    const planningMessages: ProviderMessage[] = [{ role: 'system', content: toolsPrompt }, ...baseMessages];

    // Planning phase is non-streaming to simplify JSON parsing
    const planResult = await provider.chat(planningMessages, {
      model: modelConfig.providerModel,
      temperature,
      toolsEnabled,
    });

    const envelope = parseToolEnvelopeCandidate(planResult.content);

    if (envelope && envelope.toolCalls.length > 0) {
      if (conversation.orgId) {
        await emitEvent({
          type: 'conversation.tool_call',
          context: { orgId: conversation.orgId, userId: input.userId, conversationId: conversation.id },
          metadata: { toolNames: envelope.toolCalls.map((t) => t.tool), modelId: conversation.model }
        }).catch((err) => logger.error({ err }, 'Failed to emit tool_call event'));
      }

      // Emit tool start events to client
      for (const call of envelope.toolCalls) {
        yield {
           type: 'tool_start',
           toolName: call.tool,
           toolCallId: call.id, // Ensure tool calls have IDs or fallback
        };
      }

      const toolResults = await executeToolEnvelope(envelope, ctx);

      // Emit tool end events
      for (let i = 0; i < envelope.toolCalls.length; i++) {
        const call = envelope.toolCalls[i];
        const result = toolResults[i];
        yield {
            type: 'tool_end',
            toolName: call.tool,
            toolCallId: call.id,
            toolResult: result
        };
      }

      const toolMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'TOOL',
          content: JSON.stringify(toolResults, null, 2),
          meta: { toolsEnvelope: envelope as unknown as Prisma.JsonValue },
        },
      });
      toolMessageId = toolMessage.id;

      const messagesWithTools: ProviderMessage[] = [
        ...baseMessages,
        {
          role: 'tool',
          content: 'Tool results (JSON):\n' + JSON.stringify({ toolResults }, null, 2) + '\nUse this information to answer the user. Respond normally to the user now.',
        },
      ];

      // Stream Final Answer
      const stream = provider.chatStream(messagesWithTools, {
        model: modelConfig.providerModel,
        temperature,
        toolsEnabled,
      });

      for await (const event of streamWithThoughtParsing(stream, (c) => finalContent += c, (t) => finalThought += t)) {
        if (event.type === 'end') {
          if (event.usage) finalUsage = event.usage;
          yield {
            ...event,
            finalMessage: { role: 'assistant', content: finalContent }
          };
        } else {
          yield event;
        }
      }
    } else {
        // Fallback: Plan phase didn't produce tools, but it might have produced an answer?
        // Usually if we prompt for tools, and it returns text, that text IS the answer.
        // We should just stream that text to the user?
        // But we already fetched it non-streaming.
        // To be "streaming", we want the user to see it token by token.
        // Since we did a non-streaming call, we already have the full content.
        // We can simulate streaming it out, or just send it as one chunk.
        // OR: Better approach: If we want streaming, maybe we shouldn't do non-streaming planning?
        // But parsing JSON from a stream is hard.
        // Compromise: If plan fails, we assume it's a direct answer. We just stream it as a single chunk (simulated).
        // Or re-run as stream? (Wasteful).

        // Let's optimize: If no tools used, we yield the content we got.
        finalContent = planResult.content;
        finalUsage = planResult.usage;

        // Yield synthetic start/token/end
        yield { type: 'start' };
        yield { type: 'token', token: finalContent };
        yield { type: 'end', usage: finalUsage, finalMessage: { role: 'assistant', content: finalContent } };
    }
  } else {
    // Single pass streaming
    const stream = provider.chatStream(baseMessages, {
      model: modelConfig.providerModel,
      temperature,
      toolsEnabled,
    });

    for await (const event of streamWithThoughtParsing(stream, (c) => finalContent += c, (t) => finalThought += t)) {
      if (event.type === 'end') {
        if (event.usage) finalUsage = event.usage;
        yield {
          ...event,
          finalMessage: { role: 'assistant', content: finalContent }
        };
      } else {
        yield event;
      }
    }
  }

  // Finalize (save to DB)
  if (finalContent || toolMessageId) {
      // If we have toolMessageId but no final content (rare), we still save something?
      // Assistant usually replies.
      await finalizeConversationTurn(
        conversation,
        modelConfig,
        input.userId,
        finalContent,
        finalUsage,
        toolMessageId,
        finalThought
      );
  }

  const diffNs = Number(process.hrtime.bigint() - startedAt);
  const durationSec = diffNs / 1e9;
  chatTurnDurationSeconds.labels(modelConfig.id, conversation.orgId || 'none', structuredToolsEnabled ? 'mixed' : 'false').observe(durationSec);
}
