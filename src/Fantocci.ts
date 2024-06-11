import fastifySwagger from '@fastify/swagger';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import apiReference from '@scalar/fastify-api-reference';
import fastify from 'fastify';
import { anythingFantocci } from './plugin/anything.js';
import { oauthFantocci } from './plugin/oauthFantocci.js';
import { FantocciOptions } from './options.js';
import { createCertificate } from './certUtils.js';

export async function Fantocci(https: FantocciOptions['https']) {
  let certs: Awaited<ReturnType<typeof createCertificate>> | undefined =
    undefined;
  if (https) {
    certs = await createCertificate({
      cert: {
        domains: https.split(','),
        validity: 365,
        organization: 'IAD Srl',
        email: 'fantocci@iad2.it',
      },
    });
  }

  const fantocci = await fastify({
    logger: { level: 'debug' },
    ...(certs
      ? {
          http2: true,
          https: {
            allowHTTP1: true, // f
            ca: certs.ca.cert,
            key: certs.certs.key,
            cert: certs.certs.cert,
          },
        }
      : {}),
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
    .register(anythingFantocci, { prefix: '/anything' })

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
