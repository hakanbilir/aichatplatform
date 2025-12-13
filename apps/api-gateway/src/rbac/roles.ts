// apps/api-gateway/src/rbac/roles.ts

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type OrgPermission =
  | 'org:read'
  | 'org:update'
  | 'org:delete'
  | 'member:list'
  | 'member:invite'
  | 'member:update'
  | 'member:remove'
  | 'conversation:read'
  | 'conversation:write'
  | 'conversation:chat'
  | 'org:chat:read'
  | 'org:chat:write'
  | 'analytics:view'
  | 'org:analytics:read'
  | 'org:audit:read'
  | 'org:integrations:read'
  | 'org:integrations:write'
  | 'org:settings:read'
  | 'org:settings:write'
  | 'org:settings:manage'
  | 'org:admin:members:read'
  | 'org:admin:members:write'
  | 'org:admin:api-keys:read'
  | 'org:admin:api-keys:write'
  | 'org:tools:manage'
  | 'org:safety:read'
  | 'org:safety:write'
  | 'org:prompt-templates:read'
  | 'org:prompt-templates:write'
  | 'org:chat-profiles:read'
  | 'org:chat-profiles:write'
  | 'org:models:read'
  | 'org:models:write'
  | 'org:experiments:read'
  | 'org:experiments:write'
  | 'org:billing:read'
  | 'org:billing:write'
  | 'org:sso:read'
  | 'org:sso:write'
  | 'org:scim:read'
  | 'org:scim:write';

export const ORG_ROLE_HIERARCHY: OrgRole[] = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'];

export const ORG_ROLE_PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
  VIEWER: [
    'org:read',
    'conversation:read',
    'analytics:view',
    'org:analytics:read',
  ],
  MEMBER: [
    'org:read',
    'conversation:read',
    'conversation:write',
    'conversation:chat',
    'org:chat:read',
    'org:chat:write',
    'analytics:view',
    'org:analytics:read',
  ],
  ADMIN: [
    'org:read',
    'org:update',
    'member:list',
    'member:invite',
    'member:update',
    'member:remove',
    'conversation:read',
    'conversation:write',
    'conversation:chat',
    'org:chat:read',
    'org:chat:write',
    'analytics:view',
    'org:analytics:read',
    'org:audit:read',
    'org:integrations:read',
    'org:integrations:write',
    'org:settings:read',
    'org:settings:write',
    'org:admin:members:read',
    'org:admin:members:write',
    'org:admin:api-keys:read',
    'org:admin:api-keys:write',
    'org:tools:manage',
    'org:safety:read',
    'org:prompt-templates:read',
    'org:prompt-templates:write',
    'org:chat-profiles:read',
    'org:chat-profiles:write',
    'org:models:read',
    'org:models:write',
    'org:experiments:read',
    'org:experiments:write',
  ],
  OWNER: [
    'org:read',
    'org:update',
    'org:delete',
    'member:list',
    'member:invite',
    'member:update',
    'member:remove',
    'conversation:read',
    'conversation:write',
    'conversation:chat',
    'org:chat:read',
    'org:chat:write',
    'analytics:view',
    'org:analytics:read',
    'org:audit:read',
    'org:integrations:read',
    'org:integrations:write',
    'org:settings:read',
    'org:settings:write',
    'org:settings:manage',
    'org:admin:members:read',
    'org:admin:members:write',
    'org:admin:api-keys:read',
    'org:admin:api-keys:write',
    'org:tools:manage',
    'org:safety:read',
    'org:safety:write',
    'org:prompt-templates:read',
    'org:prompt-templates:write',
    'org:chat-profiles:read',
    'org:chat-profiles:write',
    'org:models:read',
    'org:models:write',
    'org:experiments:read',
    'org:experiments:write',
    'org:billing:read',
    'org:billing:write',
    'org:sso:read',
    'org:sso:write',
    'org:scim:read',
    'org:scim:write',
  ],
};

export function roleHasPermission(role: OrgRole, permission: OrgPermission): boolean {
  const perms = ORG_ROLE_PERMISSIONS[role] ?? [];
  return perms.includes(permission);
}

