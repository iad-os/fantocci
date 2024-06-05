import fastify from 'fastify';
import { oauthFantocci } from './oauthFantocci.js';
import fastifySwagger from '@fastify/swagger';
import { Type } from '@sinclair/typebox';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import formbody from '@fastify/formbody';
import apiReference from '@scalar/fastify-api-reference';

export async function Fantocci() {
  const fantocci = await fastify({
    logger: { level: 'debug' },
  }).withTypeProvider<TypeBoxTypeProvider>();
  await fantocci
    .register(fastifySwagger, {
      prefix: '/ui',
      openapi: {
        info: {
          title: 'Fantocci HTTP Test Suite',
          description: 'testing the fastify swagger api',
          version: '0.1.0',
        },
        components: {
          securitySchemes: {
            'Basic Authentication': {
              type: 'http',
              description: ' Basic authentication',
              scheme: 'basic',
            },
          },
        },
        servers: [],
      },
      hideUntagged: false,
    })
    .register(apiReference, {
      routePrefix: '/ui',
    });

  await fantocci
    .register(oauthFantocci, { prefix: '/oauth' })
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
      url: '/anything',
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
      url: '/anything',
      handler: async (req, reply) => {
        reply.send({
          headers: req.headers,
          params: req.params,
          body: req.body,
        });
      },
    })
    .route({
      method: ['GET'],
      url: '/',
      schema: {
        hide: true,
      },
      handler: (_, reply) => {
        reply.redirect('/ui');
      },
    });

  return fantocci;
}
