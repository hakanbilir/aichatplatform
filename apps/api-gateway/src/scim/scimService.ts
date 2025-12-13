// apps/api-gateway/src/scim/scimService.ts

import { prisma } from '@ai-chat/db';
import { checkSeatLimit } from '../billing/seatService';

interface ScimUser {
  id?: string;
  userName: string;
  name: {
    givenName?: string;
    familyName?: string;
    formatted?: string;
  };
  emails: Array<{ value: string; primary?: boolean }>;
  active: boolean;
}

// ScimGroup interface removed - not currently used

export async function createUserFromScim(
  orgId: string,
  scimUser: ScimUser,
  _connectionId: string // Reserved for future audit logging
) {
  const email = scimUser.emails.find((e) => e.primary)?.value || scimUser.emails[0]?.value;
  if (!email) {
    throw new Error('SCIM user missing email');
  }

  const seatCheck = await checkSeatLimit(orgId);
  if (!seatCheck.allowed) {
    throw new Error(`Seat limit reached (${seatCheck.current}/${seatCheck.limit})`);
  }

  const name = scimUser.name.formatted || `${scimUser.name.givenName || ''} ${scimUser.name.familyName || ''}`.trim() || email.split('@')[0];

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: name || undefined,
      isSuperadmin: false
    },
    create: {
      email,
      name: name || undefined,
      passwordHash: '' // SCIM users don't have passwords
    }
  });

  // Ensure org membership
  const membership = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } }
  });

  if (!membership) {
    await prisma.orgMember.create({
      data: {
        userId: user.id,
        orgId,
        role: 'MEMBER'
      }
    });
  }

  // Map SCIM ID to local ID
  const scimId = scimUser.id || email;
  const existing = await prisma.scimResourceMap.findFirst({
    where: {
      orgId,
      resourceType: 'User',
      scimId
    }
  });

  if (existing) {
    await prisma.scimResourceMap.update({
      where: { id: existing.id },
      data: { localId: user.id }
    });
  } else {
    await prisma.scimResourceMap.create({
      data: {
        orgId,
        resourceType: 'User',
        scimId,
        localId: user.id
      }
    });
  }

  await prisma.scimAudit.create({
    data: {
      orgId,
      resourceType: 'User',
      scimId: scimUser.id || email,
      localId: user.id,
      action: 'create',
      status: 'success'
    }
  });

  return user;
}

export async function updateUserFromScim(
  orgId: string,
  scimUserId: string,
  scimUser: ScimUser,
  _connectionId: string // Reserved for future audit logging
) {
  const map = await prisma.scimResourceMap.findFirst({
    where: {
      orgId,
      resourceType: 'User',
      scimId: scimUserId
    }
  });

  if (!map) {
    throw new Error('SCIM user mapping not found');
  }

  // Email is not used in updateUserFromScim - user is identified by map.localId
  // @ts-ignore - intentionally unused
  const _email = scimUser.emails.find((e) => e.primary)?.value || scimUser.emails[0]?.value;
  void _email; // Suppress unused variable warning
  const name = scimUser.name.formatted || `${scimUser.name.givenName || ''} ${scimUser.name.familyName || ''}`.trim();

  await prisma.user.update({
    where: { id: map.localId },
    data: {
      name: name || undefined
    }
  });

  // Update membership active status
  if (scimUser.active === false) {
    await prisma.orgMember.updateMany({
      where: { userId: map.localId, orgId },
      data: { isDisabled: true }
    });
  } else {
    await prisma.orgMember.updateMany({
      where: { userId: map.localId, orgId },
      data: { isDisabled: false }
    });
  }

  await prisma.scimAudit.create({
    data: {
      orgId,
      resourceType: 'User',
      scimId: scimUserId,
      localId: map.localId,
      action: 'update',
      status: 'success'
    }
  });
}

export async function deleteUserFromScim(
  orgId: string,
  scimUserId: string,
  _connectionId: string // Reserved for future audit logging
) {
  const map = await prisma.scimResourceMap.findFirst({
    where: {
      orgId,
      resourceType: 'User',
      scimId: scimUserId
    }
  });

  if (!map) {
    throw new Error('SCIM user mapping not found');
  }

  // Soft delete: disable org membership
  await prisma.orgMember.updateMany({
    where: { userId: map.localId, orgId },
    data: { isDisabled: true }
  });

  await prisma.scimAudit.create({
    data: {
      orgId,
      resourceType: 'User',
      scimId: scimUserId,
      localId: map.localId,
      action: 'delete',
      status: 'success'
    }
  });
}
