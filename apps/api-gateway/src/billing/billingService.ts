// apps/api-gateway/src/billing/billingService.ts

import { prisma } from '@ai-chat/db';

export async function getDefaultPlan() {
  const plan = await prisma.billingPlan.findFirst({
    where: { isDefault: true, isActive: true }
  });
  return plan;
}

export async function ensureOrgSubscription(orgId: string) {
  let sub = await prisma.orgSubscription.findUnique({
    where: { orgId },
    include: { plan: true }
  });

  if (!sub) {
    const defaultPlan = await getDefaultPlan();
    if (!defaultPlan) {
      throw new Error('No default billing plan configured');
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    sub = await prisma.orgSubscription.create({
      data: {
        orgId,
        planId: defaultPlan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paymentProvider: 'paytr'
      },
      include: { plan: true }
    });
  }

  return sub;
}

export async function changeOrgPlan(orgId: string, planCode: string) {
  const plan = await prisma.billingPlan.findFirst({
    where: { code: planCode, isActive: true }
  });
  if (!plan) {
    throw new Error('PLAN_NOT_FOUND');
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const sub = await prisma.orgSubscription.upsert({
    where: { orgId },
    update: {
      planId: plan.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false
    },
    create: {
      orgId,
      planId: plan.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      paymentProvider: 'paytr'
    },
    include: { plan: true }
  });

  return sub;
}

// Legacy functions for backward compatibility
export async function getOrgSubscription(orgId: string) {
  return ensureOrgSubscription(orgId);
}

export async function createOrUpdateSubscription(
  orgId: string,
  planId: string,
  paymentProvider: string,
  providerCustomerId: string | null
) {
  const plan = await prisma.billingPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    throw new Error(`Billing plan ${planId} not found`);
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return prisma.orgSubscription.upsert({
    where: { orgId },
    update: {
      planId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      paymentProvider,
      providerCustomerId: providerCustomerId ?? undefined
    },
    create: {
      orgId,
      planId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      paymentProvider,
      providerCustomerId: providerCustomerId ?? null
    }
  });
}
