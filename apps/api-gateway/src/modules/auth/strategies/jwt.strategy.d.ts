import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
  private _configService;
  constructor(_configService: ConfigService);
  validate(payload: JwtPayload): Promise<{
    sub: string;
    email: string;
    isSuperAdmin: boolean;
  }>;
}
export {};
//# sourceMappingURL=jwt.strategy.d.ts.map
