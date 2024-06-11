import formbody from '@fastify/formbody';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Static, Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';

const AnythingFantocciOptions = Type.Object({
  prefix: Type.String({ pattern: '/S+' }),
});

type AnythingFantocciOptions = Static<typeof AnythingFantocciOptions>;

export const anythingFantocci: FastifyPluginAsync<AnythingFantocciOptions> =
  async function (fastify) {
    fastify
      .withTypeProvider<TypeBoxTypeProvider>()
      .register(formbody)
      .route({
        method: ['DELETE', 'PATCH', 'POST', 'PUT', 'OPTIONS'],
        schema: {
          tags: ['request-inspection'],
          produces: ['application/json'],
          consumes: [
            'text/plain',
            'application/json',
            'application/x-www-form-urlencoded',
          ],
          body: Type.Union([Type.String(), Type.Any()]),
        },
        url: '/',
        prefixTrailingSlash: 'no-slash',
        handler: async (req, reply) => {
          reply.send({
            headers: req.headers,
            params: req.params,
            body: req.body,
          });
        },
      })
      .route({
        method: ['GET', 'HEAD'],
        schema: {
          tags: ['request-inspection'],
          produces: ['application/json'],
        },
        url: '/',
        prefixTrailingSlash: 'no-slash',
        handler: async (req, reply) => {
          reply.send({
            headers: req.headers,
            params: req.params,
            body: req.body,
          });
        },
      });
  };
