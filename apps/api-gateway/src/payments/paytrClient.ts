// apps/api-gateway/src/payments/paytrClient.ts

import crypto from 'crypto';

interface PaytrConfig {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
}

// PaytrCheckoutRequest interface removed - not used

export interface PaytrCreateCheckoutParams {
  merchant_oid: string; // unique order id
  email: string;
  payment_amount: number; // minor unit (e.g. kuruş)
  user_name: string;
  user_address: string;
  user_phone: string;
  merchant_ok_url: string;
  merchant_fail_url: string;
  no_installment?: number; // 1 or 0
  max_installment?: number;
  user_basket?: string; // JSON string as expected by PAYTR
  debug_on?: number;
}

export interface PaytrCheckoutResponse {
  status: 'success' | 'failed';
  token?: string;
  reason?: string;
}

export class PaytrClient {
  private readonly cfg: PaytrConfig;

  constructor(cfg: PaytrConfig) {
    this.cfg = cfg;
  }

  private generateHash(params: PaytrCreateCheckoutParams): string {
    // Example hash logic; adjust to actual PAYTR requirements
    const hashStr = [
      this.cfg.merchantId,
      params.email,
      params.payment_amount,
      params.merchant_oid,
      this.cfg.merchantSalt
    ].join('');

    return crypto
      .createHmac('sha256', this.cfg.merchantKey)
      .update(hashStr)
      .digest('base64');
  }

  async createCheckoutToken(params: PaytrCreateCheckoutParams): Promise<PaytrCheckoutResponse> {
    const hash = this.generateHash(params);

    const body = new URLSearchParams({
      merchant_id: this.cfg.merchantId,
      user_email: params.email,
      payment_amount: String(params.payment_amount),
      merchant_oid: params.merchant_oid,
      user_name: params.user_name,
      user_address: params.user_address,
      user_phone: params.user_phone,
      merchant_ok_url: params.merchant_ok_url,
      merchant_fail_url: params.merchant_fail_url,
      no_installment: String(params.no_installment ?? 1),
      max_installment: String(params.max_installment ?? 0),
      user_basket: params.user_basket ?? '[]',
      debug_on: String(params.debug_on ?? 0),
      paytr_token: hash
    });

    const res = await fetch(`${process.env.PAYTR_BASE_URL || 'https://www.paytr.com'}/odeme/api/get-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!res.ok) {
      const text = await res.text();
      return { status: 'failed', reason: `HTTP ${res.status}: ${text}` };
    }

    const json = (await res.json()) as any;

    if (json.status !== 'success') {
      return { status: 'failed', reason: json.reason || 'PAYTR error' };
    }

    return { status: 'success', token: json.token };
  }

  verifyWebhook(params: {
    merchantOid: string;
    status: string;
    totalAmount: string;
    hash: string;
  }): boolean {
    const hashData = `${this.cfg.merchantId}${params.merchantOid}${params.status}${params.totalAmount}${this.cfg.merchantSalt}`;
    const expectedHash = crypto
      .createHash('sha256')
      .update(hashData)
      .digest('hex')
      .toUpperCase();

    return expectedHash === params.hash.toUpperCase();
  }
}

export function initPaytrClient(): PaytrClient | null {
  const baseUrl = process.env.PAYTR_BASE_URL;
  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

  if (!baseUrl || !merchantId || !merchantKey || !merchantSalt) {
    return null;
  }

  return new PaytrClient({ merchantId, merchantKey, merchantSalt });
}
