import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { DatabaseModule } from '@mergenhan/db';
import { SsoController } from './sso/sso.controller';
import { SsoService } from './sso/sso.service';
import { EnterpriseModule } from '../enterprise/enterprise.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    PassportModule,
    forwardRef(() => EnterpriseModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '7d';
        return {
          secret: configService.get<string>('JWT_SECRET') || 'change-me',
          signOptions: {
            expiresIn: expiresIn,
          },
        } as any; // JWT accepts string format like '7d', '24h', etc. / JWT '7d', '24h' gibi string formatını kabul eder
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, SsoController],
  providers: [AuthService, JwtStrategy, LocalStrategy, SsoService],
  exports: [AuthService, SsoService],
})
export class AuthModule {}
