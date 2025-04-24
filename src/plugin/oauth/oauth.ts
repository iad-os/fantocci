import formbody from '@fastify/formbody';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { type Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import type { FastifyPluginAsync } from 'fastify';
import omit from 'lodash.omit';
import {
  buildFakeAccessToken,
  buildToken,
  decodeToken,
  expiresIn,
  extractToken,
  issueNow,
  jwtId,
} from './oauth.utils.js';
import { FakeAccessToken } from './oauth.types.js';

export const OAuthFantocciOptions = Type.Object({
  prefix: Type.String({ pattern: '/S+' }),
});

export type OAuthFantocciOptions = Static<typeof OAuthFantocciOptions>;

export const oauthFantocci: FastifyPluginAsync<OAuthFantocciOptions> = async (fastify) => {
  fastify
    .withTypeProvider<TypeBoxTypeProvider>()
    .register(formbody)
    .post(
      '/introspect',
      {
        schema: {
          tags: ['oauth'],
          consumes: ['application/x-www-form-urlencoded'],
          produces: ['application/json'],
          security: [{ 'Basic Authentication': ['Basic Authentication'] }],
          body: Type.Object(
            {
              token: Type.String({
                description: 'A valid JWT Access Token, use /_build_fake to generate one',
                examples: [
                  buildFakeAccessToken(
                    {
                      iss: 'https://fantocci.iad2.cloud',
                      exp: expiresIn(36000),
                      aud: 'fake',
                      sub: jwtId(),
                      client_id: 'a-client-id',
                      iat: issueNow(),
                      jti: jwtId(),
                    },
                    {
                      clientId: 'clientId',
                      clientSecret: 'clientSecret',
                      active: true,
                      omit: [],
                    }
                  ),
                ],
              }),
            },
            {
              examples: [
                `token=${buildFakeAccessToken(
                  {
                    iss: 'https://fantocci.iad2.cloud',
                    exp: expiresIn(36000),
                    aud: 'fake',
                    sub: jwtId(),
                    client_id: 'a-client-id',
                    iat: issueNow(),
                    jti: jwtId(),
                  },
                  {
                    clientId: 'clientId',
                    clientSecret: 'clientSecret',
                    active: true,
                    omit: [],
                  }
                )}`,
              ],
            }
          ),
          response: {
            '200': Type.Object({ active: Type.Boolean() }, { additionalProperties: true }),
            '401': Type.Object({ message: Type.String() }),
          },
        },
      },
      async (request, reply) => {
        const fakeToken = Value.Cast(FakeAccessToken, JSON.parse(decodeToken(extractToken(request.body.token))));
        const { additional_fake_props, ...payload } = fakeToken;
        const [type, credentials] = (request.headers.authorization ?? '').split(' ');
        if (!credentials || type !== 'Basic') {
          return reply.status(401).send({ message: 'Unauthorized' });
        }
        const [clientId, clientSecret] = Buffer.from(credentials, 'base64').toString('utf-8').split(':');

        if (clientId !== additional_fake_props.clientId || clientSecret !== additional_fake_props.clientSecret) {
          return reply.status(401).send({ message: 'Unauthorized' });
        }

        if (new URL(fakeToken.iss).host !== request.hostname) {
          return reply.send({ active: false });
        }

        return reply.send(
          additional_fake_props.active
            ? {
                ...omit(payload, additional_fake_props.omit ?? []),
                active: true,
              }
            : { active: false }
        );
      }
    )
    .post(
      '/_build_fake',
      {
        schema: {
          tags: ['oauth'],
          body: FakeAccessToken,
          consumes: ['application/json'],
        },
      },
      (req, reply) => {
        reply.send(buildToken(req.body));
      }
    )
    .get(
      '/_decode_token',
      {
        schema: { tags: ['oauth'], produces: ['application/json'] },
      },
      async (req, reply) => {
        const bearerToken = req.headers['authorization'];
        if (!bearerToken) {
          return { message: 'token not provided' };
        }
        const token = bearerToken.split('Bearer')[1];
        if (!token) return reply.status(400).send({ message: 'invalid token' });
        return JSON.parse(decodeToken(extractToken(token)));
      }
    );
};
