// apps/api-gateway/src/services/audit.ts

import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';

export async function writeAuditLog(params: {
  orgId?: string | null;
  user?: JwtPayload | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
}): Promise<void> {
  try {
    await prisma.event.create({
      data: {
        orgId: params.orgId ?? '',
        userId: params.user?.userId ?? null,
        type: params.action,
        metadata: {
          ...(params.metadata || {}),
          ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
          ...(params.userAgent ? { userAgent: params.userAgent } : {})
        }
      }
    });
  } catch (err) {
    // Don't fail the request if audit logging fails
    // Audit logging hatası durumunda isteği başarısız etme
    console.error('Failed to write audit log:', err);
  }
}





