import fastifySwagger from '@fastify/swagger';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { ReferenceConfiguration } from '@scalar/api-reference';
import apiReference from '@scalar/fastify-api-reference';
import fastify from 'fastify';
import { createCertificate } from './certUtils.js';
import type { FantocciOptions } from './options.js';
import { anythingFantocci } from './plugin/anything.js';
import { oauthFantocci } from './plugin/oauth/oauth.js';
import { oidcFantocci } from './plugin/oidc/oidc.js';
import { colorsFantocci } from './plugin/colors.js';

export async function Fantocci({ https, anything, oidc, colors }: FantocciOptions) {
  let certs: Awaited<ReturnType<typeof createCertificate>> | undefined = undefined;
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
          version: '0.2.30',
        },
        tags: [
          { name: 'oauth', description: 'OAuth2 testing __endpoint__' },
          { name: 'anything', description: 'Anything endpoints' },
        ],
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
      configuration: {
        title: 'Our API Reference',
        metaData: {
          title: 'Fantocci HTTP Test Suite',
          applicationName: 'Fantocci',
        },
        layout: 'modern',
      } as ReferenceConfiguration,
      routePrefix: '/ui',
    });

  await fantocci.register(oauthFantocci, { prefix: '/oauth' });
  if (oidc) {
    await fantocci.register(oidcFantocci, {
      prefix: '/oidc',
      ...oidc,
    });
  }
  await fantocci
    .register(anythingFantocci, {
      prefix: '/anything',
      maxDelay: anything.maxDelay,
      delay: anything.delay,
    })
    .register(colorsFantocci, {
      title: colors.title,
      description: colors.description,
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
