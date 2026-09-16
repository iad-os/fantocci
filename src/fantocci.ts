import { createRequire } from 'node:module';
import fastifySwagger from '@fastify/swagger';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import apiReference from '@scalar/fastify-api-reference';
import fastify, { type FastifyInstance } from 'fastify';
import type { FantocciOptions } from './config/schema.js';
import { anythingPlugin } from './plugins/anything.js';
import { colorsPlugin } from './plugins/colors.js';
import { oauthPlugin } from './plugins/oauth/oauth.js';
import { oidcPlugin } from './plugins/oidc.js';
import { createCertificate } from './utils/certificate.js';

const { version, description } = createRequire(import.meta.url)('../package.json') as {
  version: string;
  description: string;
};

export const FANTOCCI_VERSION = version;

/**
 * Build a configured, not yet listening, Fantocci instance.
 *
 * Routes:
 * - `/ui` API reference (Scalar) with `/ui/openapi.json`
 * - `/anything[/:delay]` request echo with delay and status control
 * - `/oauth/*` fake OAuth2 token builder and introspection
 * - `/oidc/*` OIDC tools (only when `oidc` is configured)
 * - `/red`, `/blue`, ... colored HTML pages
 */
export async function Fantocci({ https, logLevel, anything, oidc, colors }: FantocciOptions): Promise<FastifyInstance> {
  const certs = https
    ? await createCertificate({
        cert: {
          domains: https.split(',').map((d) => d.trim()),
          validity: 365,
          organization: 'IAD Srl',
        },
      })
    : undefined;

  const logger = {
    level: logLevel,
  };
  // The HTTP and HTTP/2-over-TLS flavours of FastifyInstance differ only in the raw
  // server generic; expose the default one so callers get a single, stable type.
  const app = (certs
    ? fastify({
        logger,
        trustProxy: true,
        http2: true,
        https: {
          allowHTTP1: true,
          ca: certs.ca.cert,
          key: certs.certs.key,
          cert: certs.certs.cert,
        },
      })
    : fastify({
        logger,
        trustProxy: true,
      })) as unknown as FastifyInstance;
  app.withTypeProvider<TypeBoxTypeProvider>();

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Fantocci HTTP Test Suite',
        description,
        version,
      },
      tags: [
        {
          name: 'anything',
          description: 'Request echo with delay and status control',
        },
        {
          name: 'oauth',
          description: 'Fake OAuth2 token builder and RFC 7662 introspection',
        },
        {
          name: 'oidc',
          description: 'Tools backed by a real OIDC provider',
        },
        {
          name: 'colors',
          description: 'Colored HTML pages',
        },
      ],
      components: {
        securitySchemes: {
          'Basic Authentication': {
            type: 'http',
            scheme: 'basic',
            description: 'client_id:client_secret',
          },
        },
      },
    },
    hideUntagged: false,
  });
  await app.register(apiReference, {
    routePrefix: '/ui',
    configuration: {
      metaData: {
        title: 'Fantocci HTTP Test Suite',
        applicationName: 'Fantocci',
      },
    },
  });

  await app.register(oauthPlugin, {
    prefix: '/oauth',
  });
  if (oidc)
    await app.register(oidcPlugin, {
      prefix: '/oidc',
      ...oidc,
    });
  await app.register(anythingPlugin, {
    prefix: '/anything',
    ...anything,
  });
  await app.register(colorsPlugin, colors);

  app.get(
    '/',
    {
      schema: {
        hide: true,
      },
    },
    async (_request, reply) => reply.redirect('/ui/'),
  );
  app.get(
    '/health',
    {
      schema: {
        hide: true,
      },
    },
    async () => ({
      status: 'ok',
      version,
    }),
  );

  return app;
}
