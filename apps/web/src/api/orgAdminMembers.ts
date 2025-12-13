// apps/web/src/api/orgAdminMembers.ts

import { apiRequest } from './client';

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

export interface OrgMembersResponse {
  members: OrgMemberDto[];
  invitations: OrgInvitationDto[];
}

export async function fetchOrgMembers(token: string, orgId: string): Promise<OrgMembersResponse> {
  return apiRequest<OrgMembersResponse>(
    `/orgs/${orgId}/admin/members`,
    { method: 'GET' },
    token
  );
}

export async function inviteOrgMember(
  token: string,
  orgId: string,
  email: string,
  role: string,
  expiresInDays = 7
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `/orgs/${orgId}/admin/members/invite`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, role, expiresInDays })
    },
    token
  );
}

export async function updateMemberRole(
  token: string,
  orgId: string,
  userId: string,
  role: string
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/admin/members/${userId}/role`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role })
    },
    token
  );
}

export async function updateMemberStatus(
  token: string,
  orgId: string,
  userId: string,
  disabled: boolean
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/admin/members/${userId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ disabled })
    },
    token
  );
}

