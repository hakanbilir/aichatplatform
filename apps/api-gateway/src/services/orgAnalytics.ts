// apps/api-gateway/src/services/orgAnalytics.ts

import { prisma } from '@ai-chat/db';
import { getOrgQuotaWindowUsage, OrgQuotaWindowUsage } from './orgQuotaGuard';

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
  const windowDays = options.windowDays && options.windowDays > 0 ? options.windowDays : 30;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const org = await prisma.organization.findUnique({
    where: { id: options.orgId },
    select: { id: true, name: true }
  });

  if (!org) {
    throw new Error('Org not found');
  }

  const quota = await getOrgQuotaWindowUsage(org.id, windowDays);

  // Chat turns = assistant messages in conversations belonging to this org
  // Chat turn'ları = bu org'a ait konuşmalardaki asistan mesajları
  const assistantMessages = await prisma.message.findMany({
    where: {
      role: 'ASSISTANT',
      createdAt: {
        gte: since
      },
      conversation: {
        orgId: org.id
      }
    },
    select: {
      id: true,
      createdAt: true,
      conversationId: true,
      conversation: {
        select: {
          model: true
        }
      },
      meta: true
    }
  });

  const totals = {
    chatTurns: 0,
    chatTurnsWithTools: 0,
    chatTurnsWithoutTools: 0
  };

  const byModelMap = new Map<string, number>();
  const byUserMap = new Map<string, number>();
  const byToolMap = new Map<string, number>();

  totals.chatTurns = assistantMessages.length;

  for (const msg of assistantMessages) {
    const model = msg.conversation?.model || 'default';
    byModelMap.set(model, (byModelMap.get(model) || 0) + 1);

    // Tools: we expect meta.toolMessageId or meta.tools to indicate tool usage
    // Araçlar: tool kullanımını belirtmek için meta.toolMessageId veya meta.tools bekliyoruz
    const usedTools = Boolean((msg.meta as any)?.toolMessageId || (msg.meta as any)?.tools);

    if (usedTools) {
      totals.chatTurnsWithTools += 1;
    } else {
      totals.chatTurnsWithoutTools += 1;
    }
  }

  // Top tools by calls: we look at TOOL messages in this org
  // En çok kullanılan araçlar: bu org'daki TOOL mesajlarına bakıyoruz
  const toolMessages = await prisma.message.findMany({
    where: {
      role: 'TOOL',
      createdAt: {
        gte: since
      },
      conversation: {
        orgId: org.id
      }
    },
    select: {
      meta: true
    }
  });

  for (const msg of toolMessages) {
    const toolsMeta = (msg.meta as any) || {};
    const results = toolsMeta.toolResults as { tool: string }[] | undefined;

    if (Array.isArray(results)) {
      for (const r of results) {
        if (!r || typeof r.tool !== 'string') continue;
        byToolMap.set(r.tool, (byToolMap.get(r.tool) || 0) + 1);
      }
    }

    // Also check for direct tool name in meta
    // Ayrıca meta'da doğrudan tool adını kontrol et
    if (typeof toolsMeta.tool === 'string') {
      byToolMap.set(toolsMeta.tool, (byToolMap.get(toolsMeta.tool) || 0) + 1);
    }
  }

  // Top users: we count USER messages in org conversations
  // En aktif kullanıcılar: org konuşmalarındaki USER mesajlarını sayıyoruz
  const userMessages = await prisma.message.groupBy({
    by: ['authorId'],
    where: {
      role: 'USER',
      createdAt: {
        gte: since
      },
      conversation: {
        orgId: org.id
      }
    },
    _count: {
      _all: true
    }
  });

  for (const row of userMessages) {
    if (!row.authorId) continue;
    byUserMap.set(row.authorId, (byUserMap.get(row.authorId) || 0) + row._count._all);
  }

  const byModel: OrgAnalyticsModelUsageItem[] = Array.from(byModelMap.entries())
    .map(([model, chatTurns]) => ({ model, chatTurns }))
    .sort((a, b) => b.chatTurns - a.chatTurns);

  const byTool: OrgAnalyticsToolUsageItem[] = Array.from(byToolMap.entries())
    .map(([tool, calls]) => ({ tool, calls }))
    .sort((a, b) => b.calls - a.calls);

  const byUser: OrgAnalyticsUserUsageItem[] = Array.from(byUserMap.entries())
    .map(([userId, chatTurns]) => ({ userId, chatTurns }))
    .sort((a, b) => b.chatTurns - a.chatTurns);

  return {
    org,
    windowDays,
    quota,
    totals,
    byModel,
    byTool,
    byUser
  };
}





