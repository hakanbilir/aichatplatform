export interface JwtPayload {
  userId: string;
  orgId: string | null;
  isSuperadmin?: boolean;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
}

