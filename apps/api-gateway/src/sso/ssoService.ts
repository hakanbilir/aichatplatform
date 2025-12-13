// apps/api-gateway/src/sso/ssoService.ts

import { prisma } from '@ai-chat/db';
import { checkSeatLimit } from '../billing/seatService';

export async function findOrProvisionUserFromSso(
  orgId: string,
  email: string,
  name: string | null,
  idpGroups: string[],
  connectionId: string
) {
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // JIT provisioning
    const seatCheck = await checkSeatLimit(orgId);
    if (!seatCheck.allowed) {
      throw new Error(`Seat limit reached (${seatCheck.current}/${seatCheck.limit})`);
    }

    user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash: '' // SSO users don't have passwords
      }
    });
  }

  // Ensure org membership
  const membership = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } }
  });

  if (!membership) {
    const seatCheck = await checkSeatLimit(orgId);
    if (!seatCheck.allowed) {
      throw new Error(`Seat limit reached (${seatCheck.current}/${seatCheck.limit})`);
    }

    // Map IdP groups to roles (simplified - adjust based on your RBAC)
    let role = 'MEMBER';
    if (idpGroups.some((g) => g.toLowerCase().includes('admin'))) {
      role = 'ADMIN';
    }

    await prisma.orgMember.create({
      data: {
        userId: user.id,
        orgId,
        role: role as any
      }
    });
  }

  // Audit login
  await prisma.ssoLoginAudit.create({
    data: {
      orgId,
      userId: user.id,
      type: 'saml', // or 'oidc'
      connectionId,
      email,
      status: 'success',
      ip: undefined,
      userAgent: undefined
    }
  });

  return user;
}
