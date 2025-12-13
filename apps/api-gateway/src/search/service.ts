// apps/api-gateway/src/search/service.ts

import { prisma } from '@ai-chat/db';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Prisma types are available via workspace
import type { Prisma } from '@prisma/client';
import {
  ConversationSearchFilters,
  ConversationSearchRequest,
  ConversationSearchResponse,
  ConversationSearchHit,
  ConversationSearchHitMessageSnippet
} from './types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function clampPageSize(size: number | undefined): number {
  if (!size || size <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(size, MAX_PAGE_SIZE);
}

function buildFilterWhere(orgId: string, filters?: ConversationSearchFilters): Prisma.ConversationWhereInput {
  const where: Prisma.ConversationWhereInput = { orgId };

  if (!filters) return where;

  if (filters.modelIds && filters.modelIds.length > 0) {
    where.model = { in: filters.modelIds };
  }

  if (filters.createdByUserIds && filters.createdByUserIds.length > 0) {
    where.userId = { in: filters.createdByUserIds };
  }

  if (filters.createdAfter || filters.createdBefore) {
    where.createdAt = {};
    if (filters.createdAfter) {
      where.createdAt.gte = new Date(filters.createdAfter);
    }
    if (filters.createdBefore) {
      where.createdAt.lte = new Date(filters.createdBefore);
    }
  }

  // metadata flags stored as JSON booleans, e.g. { hasTools: true, hasRag: true }
  if (filters.hasTools !== undefined) {
    where.metadata = {
      path: ['hasTools'],
      equals: filters.hasTools
    } as any;
  }

  if (filters.hasRag !== undefined) {
    where.metadata = {
      ...(where.metadata as any),
      path: ['hasRag'],
      equals: filters.hasRag
    } as any;
  }

  if (filters.hasFiles !== undefined) {
    where.metadata = {
      ...(where.metadata as any),
      path: ['hasFiles'],
      equals: filters.hasFiles
    } as any;
  }

  return where;
}

function createSnippet(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + '…';
}

export async function searchConversations(
  req: ConversationSearchRequest
): Promise<ConversationSearchResponse> {
  const pageSize = clampPageSize(req.pageSize);
  const offset = (req.page <= 0 ? 0 : req.page) * pageSize;

  const trimmed = req.query.trim();

  // If query is empty, just filter conversations
  if (!trimmed) {
    const conversationWhere = buildFilterWhere(req.orgId, req.filters);
    const total = await prisma.conversation.count({ where: conversationWhere });
    const conversations = await prisma.conversation.findMany({
      where: conversationWhere,
      select: {
      id: true,
      title: true,
      metadata: true,
      orgId: true,
      model: true,
      createdAt: true,
      updatedAt: true,
      lastActivityAt: true
    },
      orderBy: req.sort === 'recent' ? { updatedAt: 'desc' } : { createdAt: 'desc' },
      skip: offset,
      take: pageSize
    });

    const hits: ConversationSearchHit[] = conversations.map((conv: { id: string; title: string; metadata: unknown; orgId: string | null; model: string; createdAt: Date; updatedAt: Date; lastActivityAt: Date }) => {
      const metadata: any = conv.metadata || {};
      return {
        conversationId: conv.id,
        conversationTitle: conv.title,
        modelId: conv.model,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        hasTools: Boolean(metadata.hasTools),
        hasRag: Boolean(metadata.hasRag),
        hasFiles: Boolean(metadata.hasFiles),
        messages: []
      };
    });

    return {
      total,
      page: req.page,
      pageSize,
      hits
    };
  }

  // Build tsquery for FTS
  const tsQuery = trimmed
    .split(/\s+/)
    .map((token) => token + ':*')
    .join(' & ');

  // Use raw SQL for FTS search on messages
  const messageMatches = await prisma.$queryRawUnsafe<Array<{ id: string; conversationId: string; role: string; createdAt: Date; content: string }>>(
    `
    SELECT m.id, m."conversationId", m.role, m."createdAt", m.content
    FROM "Message" m
    WHERE m."orgId" = $1
      AND m."contentTsv" @@ to_tsquery('simple', $2)
    LIMIT 500
    `,
    req.orgId,
    tsQuery
  );

  const byConversation = new Map<string, ConversationSearchHitMessageSnippet[]>();

  for (const msg of messageMatches) {
    const list = byConversation.get(msg.conversationId) ?? [];
    if (list.length >= 3) continue; // up to 3 snippets per conversation
    list.push({
      messageId: msg.id,
      role: msg.role,
      createdAt: new Date(msg.createdAt).toISOString(),
      snippet: createSnippet(msg.content, 200)
    });
    byConversation.set(msg.conversationId, list);
  }

  // Get conversation IDs
  const conversationIds = Array.from(byConversation.keys());

  if (conversationIds.length === 0) {
    return {
      total: 0,
      page: req.page,
      pageSize,
      hits: []
    };
  }

  // Apply filters and pagination
  const conversationWhere = buildFilterWhere(req.orgId, req.filters);
  const total = conversationIds.length;
  const pagedIds = conversationIds.slice(offset, offset + pageSize);

  const conversations = await prisma.conversation.findMany({
    where: {
      ...conversationWhere,
      id: { in: pagedIds }
    },
    orderBy: req.sort === 'recent' ? { updatedAt: 'desc' } : { createdAt: 'desc' }
  });

    const hits: ConversationSearchHit[] = conversations.map((conv: { id: string; title: string; metadata: unknown; orgId: string | null; model: string; createdAt: Date; updatedAt: Date; lastActivityAt: Date }) => {
    const metadata: any = conv.metadata || {};
    const snippets = byConversation.get(conv.id) || [];

    return {
      conversationId: conv.id,
      conversationTitle: conv.title,
      modelId: conv.model,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      hasTools: Boolean(metadata.hasTools),
      hasRag: Boolean(metadata.hasRag),
      hasFiles: Boolean(metadata.hasFiles),
      messages: snippets
    };
  });

  return {
    total,
    page: req.page,
    pageSize,
    hits
  };
}

