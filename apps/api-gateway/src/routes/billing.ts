// apps/api-gateway/src/routes/billing.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { ensureOrgSubscription } from '../billing/billingService';
import { initPaytrClient } from '../payments/paytrClient';

const changePlanSchema = z.object({
  planCode: z.string().min(1)
});

export default async function billingRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // Public list of active plans (can be cached) (46.md)
  app.get('/billing/plans', async (_req, reply) => {
    const plans = await prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPriceMinor: 'asc' }
    });

    return reply.send({
      plans: plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        currency: p.currency,
        monthlyPriceMinor: p.monthlyPriceMinor,
        yearlyPriceMinor: p.yearlyPriceMinor,
        limits: p.limits
      }))
    });
  });

  // Get org subscription
  app.get('/orgs/:orgId/billing', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:billing:read'
    );

    const sub = await ensureOrgSubscription(orgId);

    return reply.send({ subscription: sub });
  });

  // Request plan change (creates PAYTR checkout)
  app.post(
    '/orgs/:orgId/billing/change-plan',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const orgId = (req.params as any).orgId as string;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:billing:write'
      );

      const parsed = changePlanSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
      }

      const planCode = String(parsed.data.planCode || '');
      if (!planCode) {
        return reply.code(400).send({ error: 'PLAN_CODE_REQUIRED' });
      }

      const plan = await prisma.billingPlan.findFirst({ where: { code: planCode, isActive: true } });
      if (!plan) {
        return reply.code(404).send({ error: 'PLAN_NOT_FOUND' });
      }

      // Create a pending PaymentTransaction for audit
      const amountMinor = plan.monthlyPriceMinor;
      const tx = await prisma.paymentTransaction.create({
        data: {
          orgId,
          subscriptionId: null,
          paymentProvider: 'paytr',
          providerReference: '', // to be updated with PAYTR token
          status: 'pending',
          amountMinor,
          currency: plan.currency,
          reason: 'plan_change'
        }
      });

      const paytr = initPaytrClient();
      if (!paytr) {
        return reply.code(500).send({ error: 'PAYTR_NOT_CONFIGURED' });
      }

      // In a real app, fill email, name, address, phone from org/admin profile.
      const okUrl = `${process.env.APP_BASE_URL || 'http://localhost:5173'}/billing/success?orgId=${orgId}&txId=${tx.id}`;
      const failUrl = `${process.env.APP_BASE_URL || 'http://localhost:5173'}/billing/failure?orgId=${orgId}&txId=${tx.id}`;

      const checkoutRes = await paytr.createCheckoutToken({
        merchant_oid: tx.id,
        email: payload.email ?? 'billing@example.com',
        payment_amount: amountMinor,
        user_name: payload.name ?? 'Billing User',
        user_address: 'N/A',
        user_phone: 'N/A',
        merchant_ok_url: okUrl,
        merchant_fail_url: failUrl,
        no_installment: 1,
        max_installment: 0,
        user_basket: JSON.stringify([[plan.name, plan.monthlyPriceMinor.toString(), 1]]),
        debug_on: process.env.NODE_ENV === 'development' ? 1 : 0
      });

      if (checkoutRes.status === 'failed' || !checkoutRes.token) {
        await prisma.paymentTransaction.update({
          where: { id: tx.id },
          data: {
            status: 'failed',
            responsePayload: { reason: checkoutRes.reason }
          }
        });
        return reply.code(500).send({ error: 'PAYTR_CHECKOUT_FAILED', reason: checkoutRes.reason });
      }

      await prisma.paymentTransaction.update({
        where: { id: tx.id },
        data: {
          providerReference: checkoutRes.token,
          requestPayload: { planCode },
          responsePayload: { token: checkoutRes.token }
        }
      });

      // Frontend will embed PAYTR iframe with this token.
      return reply.send({
        transactionId: tx.id,
        token: checkoutRes.token
      });
    }
  );
}
