// apps/api-gateway/src/rbac/guards.ts

import { prisma } from '@ai-chat/db';
import type { OrgPermission, OrgRole } from './roles';

interface UserLike {
  id: string;
  isSuperadmin?: boolean;
}

export async function getUserOrgRole(userId: string, orgId: string): Promise<OrgRole | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId, orgId },
    select: { role: true },
  });
  const role = membership?.role;
  // SUPERADMIN is not an org role, it's a user flag
  // SUPERADMIN bir org rolü değil, kullanıcı bayrağıdır
  if (role === 'SUPERADMIN' || !role) {
    return null;
  }
  return role as OrgRole;
}

export async function userHasOrgPermission(
  user: UserLike,
  orgId: string,
  permission: OrgPermission,
): Promise<boolean> {
  if (user.isSuperadmin) {
    return true;
  }

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, orgId },
    select: { role: true },
  });

  if (!membership) {
    return false;
  }

  const { role } = membership;

  // SUPERADMIN is not an org role
  // SUPERADMIN bir org rolü değildir
  if (role === 'SUPERADMIN') {
    return false;
  }

  // Lazy import to avoid circular deps if any
  // Döngüsel bağımlılıkları önlemek için tembel import
  const { roleHasPermission } = await import('./roles');
  return roleHasPermission(role as OrgRole, permission);
}

export async function assertOrgPermission(
  user: UserLike,
  orgId: string,
  permission: OrgPermission,
): Promise<void> {
  const ok = await userHasOrgPermission(user, orgId, permission);
  if (!ok) {
    const error = new Error('Forbidden');
    (error as any).statusCode = 403;
    throw error;
  }
}

