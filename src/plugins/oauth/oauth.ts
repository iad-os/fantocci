import formbody from '@fastify/formbody';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import Type from 'typebox';
import Value from 'typebox/value';
import { omit } from '../../utils/object.js';
import { FakeAccessToken } from './oauth.types.js';
import { buildFakeAccessToken, buildToken, decodeJwtPayload, expiresIn, issueNow, jwtId } from './oauth.utils.js';

const TAGS = [
  'oauth',
];

const exampleToken = () =>
  buildFakeAccessToken(
    {
      iss: 'https://fantocci.example.com',
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
    },
  );

function parseBasicAuth(header: string | undefined):
  | {
      clientId: string;
      clientSecret: string;
    }
  | undefined {
  const [type, credentials] = (header ?? '').split(' ');
  if (type !== 'Basic' || !credentials) return undefined;
  const [clientId, ...secret] = Buffer.from(credentials, 'base64').toString('utf8').split(':');
  if (!clientId) return undefined;
  return {
    clientId,
    clientSecret: secret.join(':'),
  };
}

function bearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '');
  return match?.[1]?.trim() || undefined;
}

/**
 * Fake OAuth2 authorization server pieces, useful to test resource servers
 * without a real IdP:
 *
 * - `POST /_build_fake` builds a token embedding the desired introspection outcome
 * - `POST /introspect` (RFC 7662) validates Basic credentials against the ones
 *   embedded in the token and answers accordingly
 * - `GET /_decode_token` decodes the Bearer token without verifying it
 */
export const oauthPlugin: FastifyPluginAsyncTypebox = async (fastify) => {
  await fastify.register(formbody);

  fastify
    .post(
      '/_build_fake',
      {
        schema: {
          tags: TAGS,
          summary: 'Build a fake access token',
          consumes: [
            'application/json',
          ],
          body: FakeAccessToken,
          response: {
            200: Type.String({
              description: 'The fake token in compact JWT form',
            }),
          },
        },
      },
      async (req, reply) => reply.type('text/plain; charset=utf-8').send(buildToken(req.body)),
    )
    .post(
      '/introspect',
      {
        schema: {
          tags: TAGS,
          summary: 'RFC 7662 token introspection driven by the fake token itself',
          consumes: [
            'application/x-www-form-urlencoded',
          ],
          security: [
            {
              'Basic Authentication': [],
            },
          ],
          body: Type.Object(
            {
              token: Type.String({
                description: 'A fake token, see POST /_build_fake',
                examples: [
                  exampleToken(),
                ],
              }),
            },
            {
              examples: [
                {
                  token: exampleToken(),
                },
              ],
            },
          ),
          response: {
            200: Type.Object(
              {
                active: Type.Boolean(),
              },
              {
                additionalProperties: true,
              },
            ),
            400: Type.Object({
              message: Type.String(),
            }),
            401: Type.Object({
              message: Type.String(),
            }),
          },
        },
      },
      async (request, reply) => {
        let fakeToken: FakeAccessToken;
        try {
          fakeToken = Value.Repair(FakeAccessToken, decodeJwtPayload(request.body.token)) as FakeAccessToken;
        } catch {
          return reply.status(400).send({
            message: 'Malformed token',
          });
        }
        const { additional_fake_props: faker, ...claims } = fakeToken;

        const credentials = parseBasicAuth(request.headers.authorization);
        if (
          !credentials ||
          credentials.clientId !== faker.clientId ||
          credentials.clientSecret !== faker.clientSecret
        ) {
          return reply.status(401).send({
            message: 'Unauthorized',
          });
        }

        let issuerHost: string;
        try {
          issuerHost = new URL(fakeToken.iss).host;
        } catch {
          return reply.status(400).send({
            message: 'Token issuer is not a valid URL',
          });
        }
        if (issuerHost !== request.host || !faker.active) {
          return reply.send({
            active: false,
          });
        }
        return reply.send({
          ...omit(claims, faker.omit ?? []),
          active: true,
        });
      },
    )
    .get(
      '/_decode_token',
      {
        schema: {
          tags: TAGS,
          summary: 'Decode the Bearer token payload (no signature check)',
          headers: Type.Object({
            authorization: Type.Optional(Type.String()),
          }),
          response: {
            200: Type.Record(Type.String(), Type.Unknown()),
            400: Type.Object({
              message: Type.String(),
            }),
          },
        },
      },
      async (req, reply) => {
        const token = bearerToken(req.headers.authorization);
        if (!token)
          return reply.status(400).send({
            message: 'Bearer token not provided',
          });
        try {
          return await reply.send(decodeJwtPayload(token));
        } catch {
          return reply.status(400).send({
            message: 'Invalid token',
          });
        }
      },
    );
};
