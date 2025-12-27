import { apiRequest } from './client';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  isSuperadmin: boolean;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  activeOrg: OrganizationSummary | null;
  organizations?: OrganizationSummary[];
}

export async function signup(data: {
  email: string;
  password: string;
  name: string;
  orgName?: string;
}): Promise<AuthResponse> {
  // Ensure orgName is undefined if empty, not empty string
  // Boşsa orgName'i undefined yap, boş string değil
  const payload = {
    ...data,
    orgName: data.orgName?.trim() || undefined,
  };
  
  return apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(data: { email: string; password: string }): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface MeResponse {
  user: AuthUser;
  activeOrg: OrganizationSummary | null;
  organizations: OrganizationSummary[];
}

export async function getMe(token: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', { method: 'GET' }, token);
}

export async function getOrganizations(token: string): Promise<{ organizations: OrganizationSummary[] }> {
  return apiRequest<{ organizations: OrganizationSummary[] }>('/orgs', { method: 'GET' }, token);
}

