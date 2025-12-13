import '@fastify/jwt';
import { JwtPayload } from '../src/auth/types';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload; // payload used when signing
    user: JwtPayload; // payload decoded from token
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: import('fastify').preHandlerHookHandler;
  }
}

