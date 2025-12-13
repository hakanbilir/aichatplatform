// apps/api-gateway/src/admin/types.ts

export interface OrgMemberDto {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  status: 'active' | 'disabled';
  joinedAt: string;
}

export interface OrgInvitationDto {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string | null;
}

