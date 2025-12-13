// apps/api-gateway/src/apiKeys/utils.ts

import crypto from 'node:crypto';

export interface GeneratedApiKey {
  raw: string;
  hash: string;
}

export function generateOrgApiKey(orgId: string): GeneratedApiKey {
  const raw = `org_${orgId}_${crypto.randomBytes(24).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashExistingToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

