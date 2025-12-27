import { AuthService, LoginDto } from './auth.service';
export declare class AuthController {
  private authService;
  constructor(authService: AuthService);
  login(loginDto: LoginDto): Promise<{
    access_token: string;
    user: {
      id: any;
      email: any;
      name: any;
      isSuperAdmin: any;
    };
  }>;
  getProfile(req: any): Promise<{
    id: any;
    email: any;
  }>;
}
//# sourceMappingURL=auth.controller.d.ts.map
