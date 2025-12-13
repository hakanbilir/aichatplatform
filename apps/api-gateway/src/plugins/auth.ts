import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getConfig } from '@ai-chat/config';

// Extend FastifyInstance to include the authenticate method
// FastifyInstance'ı authenticate metodunu içerecek şekilde genişlet
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const config = getConfig();

async function authPlugin(app: FastifyInstance) {
  // Register JWT plugin
  // JWT plugin'ini kaydet
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN,
    },
  });

  // Decorate a reusable authenticate hook
  // Yeniden kullanılabilir authenticate hook'unu dekore et
  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
      }
    },
  );
}

export default fp(authPlugin);

