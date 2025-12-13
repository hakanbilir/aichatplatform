// apps/api-gateway/src/tools/conversationSearchTool.ts

import { ToolDefinition, ToolContext } from './types';
import { prisma } from '@ai-chat/db';

interface ConversationSearchArgs {
  query: string;
  limit?: number;
}

interface ConversationSearchResultItem {
  role: 'SYSTEM' | 'USER' | 'ASSISTANT' | 'TOOL';
  content: string;
  createdAt: string;
}

interface ConversationSearchResult {
  conversationId: string;
  query: string;
  matches: ConversationSearchResultItem[];
}

export const conversationSearchTool: ToolDefinition<ConversationSearchArgs, ConversationSearchResult> = {
  name: 'conversation.searchMessages',
  description:
    'Searches recent messages in this conversation for the given query string and returns the best matches.',
  argsSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 1 },
      limit: { type: 'number', minimum: 1, maximum: 50 },
    },
    required: ['query'],
    additionalProperties: false,
  },
  async execute(args, ctx: ToolContext) {
    if (!ctx.conversationId) {
      throw new Error('No conversation context available');
    }

    const limit = typeof args.limit === 'number' ? args.limit : 20;

    const messages = await prisma.message.findMany({
      where: {
        conversationId: ctx.conversationId,
        content: {
          contains: args.query,
          mode: 'insensitive',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    const matches: ConversationSearchResultItem[] = messages.map((m: { role: string; content: string; createdAt: Date }) => ({
      role: m.role as ConversationSearchResultItem['role'],
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      conversationId: ctx.conversationId,
      query: args.query,
      matches,
    };
  },
};

