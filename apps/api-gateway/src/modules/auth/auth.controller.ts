import { Controller, Post, Body, UseGuards, Get, Request, Param, Query, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: FastifyRequest) {
    // Extract IP address from request / İstekten IP adresini çıkar
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    // Extract correlation ID if present / Varsa korelasyon ID'sini çıkar
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      undefined;

    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
      ipAddress,
      correlationId,
    );
    return this.authService.login(user);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  async refresh(@Request() req: any) {
    return this.authService.refresh(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Request() req: any) {
    return {
      id: req.user.sub,
      email: req.user.email,
    };
  }

  @Get('sso/:orgSlug/login')
  async initiateSso(@Param('orgSlug') orgSlug: string) {
    return this.authService.initiateSso(orgSlug);
  }

  @Post('sso/saml/acs')
  async samlAcs(@Body() body: any, @Request() req: any) {
    return this.authService.handleSamlAcs(body, req);
  }

  @Get('sso/oidc/callback')
  async oidcCallback(@Query() query: any, @Request() req: any) {
    return this.authService.handleOidcCallback(query, req);
  }
}
