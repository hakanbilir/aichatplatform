// apps/api-gateway/src/billing/seatService.ts

import { prisma } from '@ai-chat/db';

export async function countActiveSeats(orgId: string): Promise<number> {
  return prisma.orgMember.count({
    where: {
      orgId,
      isDisabled: false
    }
  });
}

export async function checkSeatLimit(orgId: string): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const subscription = await prisma.orgSubscription.findUnique({
    where: { orgId },
    include: { plan: true }
  });

  if (!subscription || !subscription.plan) {
    return { allowed: true, current: 0, limit: null };
  }

  const limits = subscription.plan.limits as any;
  const maxSeats = limits?.max_seats ?? null;

  if (maxSeats === null) {
    return { allowed: true, current: 0, limit: null };
  }

  const current = await countActiveSeats(orgId);

  return {
    allowed: current < maxSeats,
    current,
    limit: maxSeats
  };
}
