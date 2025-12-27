import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@mergenhan/db';
export interface LoginDto {
  email: string;
  password: string;
}
export interface JwtPayload {
  sub: string;
  email: string;
  isSuperAdmin?: boolean;
  iat?: number;
  exp?: number;
}
export declare class AuthService {
  private prisma;
  private jwtService;
  constructor(prisma: PrismaService, jwtService: JwtService);
  validateUser(email: string, password: string): Promise<any>;
  login(user: any): Promise<{
    access_token: string;
    user: {
      id: any;
      email: any;
      name: any;
      isSuperAdmin: any;
    };
  }>;
  validateApiKey(hashedKey: string): Promise<any>;
}
//# sourceMappingURL=auth.service.d.ts.map
