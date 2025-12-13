// apps/api-gateway/src/routes/paytrWebhook.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { PaytrClient } from '../payments/paytrClient';
import { createOrUpdateSubscription } from '../billing/billingService';

export default async function paytrWebhookRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.post('/billing/paytr/webhook', async (req, reply) => {
    const body = req.body as any;

    const paytr = new PaytrClient({
      merchantId: process.env.PAYTR_MERCHANT_ID || '',
      merchantKey: process.env.PAYTR_MERCHANT_KEY || '',
      merchantSalt: process.env.PAYTR_MERCHANT_SALT || ''
    });

    const isValid = paytr.verifyWebhook({
      merchantOid: body.merchant_oid,
      status: body.status,
      totalAmount: body.total_amount,
      hash: body.hash
    });

    if (!isValid) {
      return reply.code(400).send({ error: 'INVALID_HASH' });
    }

    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        providerReference: body.merchant_oid,
        paymentProvider: 'paytr'
      },
      include: {
        org: true
      }
    });

    if (!transaction) {
      return reply.code(404).send({ error: 'TRANSACTION_NOT_FOUND' });
    }

    const status = body.status === 'success' ? 'completed' : 'failed';

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        responsePayload: body
      }
    });

    if (status === 'completed') {
      const requestPayload = transaction.requestPayload as any;
      const planId = requestPayload?.planId;

      if (planId) {
        await createOrUpdateSubscription(transaction.orgId, planId, 'paytr', body.customer_id || null);

        // Optional: emitEvent('billing.subscription_updated', { orgId: transaction.orgId, planId })
      }
    }

    return reply.send({ ok: true });
  });
}
