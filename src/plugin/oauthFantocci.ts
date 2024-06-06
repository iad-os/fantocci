import formbody from '@fastify/formbody';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Static, Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';

const OAuthFantocciOptions = Type.Object({
  prefix: Type.String({ pattern: '/S+' }),
});

type OAuthFantocciOptions = Static<typeof OAuthFantocciOptions>;

const FakeToken = Type.Object(
  {
    additional_fake_props: Type.Object({
      clientId: Type.String({
        minLength: 1,
        maxLength: 100,
        examples: ['clientId'],
      }),
      clientSecret: Type.String({
        minLength: 1,
        maxLength: 100,
        examples: ['clientSecret'],
      }),
      active: Type.Boolean({
        description: 'Is the token still active',
      }),
      diffIssuers: Type.Optional(
        Type.Boolean({
          default: false,
          description: 'Token is issued by a different idp domain',
        })
      ),
    }),
    active: Type.Boolean({
      description:
        'REQUIRED. Boolean indicator of whether or not the presented token is currently active. The specifics of a token\'s "active" state will vary depending on the implementation of the authorization server and the information it keeps about its tokens, but a "true" value return for the "active" property will generally indicate that a given token has been issued by this authorization server, has not been revoked by the resource owner, and is within its given time window of validity (e.g., after its issuance time and before its expiration time).',
    }),
    iss: Type.String({
      description:
        'The "iss" (issuer) claim identifies the principal that issued the JWT. The processing of this claim is generally application specific. The "iss" value is a case-sensitive string containing a StringOrURI value',
    }),

    exp: Type.Number({
      description:
        'The "exp" (expiration time) claim identifies the expiration time on or after which the JWT MUST NOT be accepted for processing. The processing of the "exp" claim requires that the current date/time MUST be before the expiration date/time listed in the "exp" claim',
    }),
    aud: Type.Union([
      Type.String({
        description:
          'The "aud" (audience) claim identifies the recipients that the JWT is intended for. Each principal intended to process the JWT MUST identify itself with a value in the audience claim. If the principal processing the claim does not identify itself with a value in the "aud" claim when this claim is present, then the JWT MUST be rejected. In the general case, the "aud" value is an array of case- sensitive strings, each containing a StringOrURI value. In the special case when the JWT has one audience, the "aud" value MAY be a single case-sensitive string containing a StringOrURI value. The interpretation of audience values is generally application specific.',
      }),
      Type.Array(
        Type.String({
          description:
            'the "aud" value is an array of case- sensitive strings, each containing a StringOrURI value. In the special case when the JWT has one audience, the "aud" value MAY be a single case-sensitive string containing a StringOrURI value.',
        }),
        { default: [] }
      ),
    ]),
    sub: Type.String({
      description:
        'The "sub" (subject) claim identifies the principal that is the subject of the JWT. The claims in a JWT are normally statements about the subject. The subject value MUST either be scoped to be locally unique in the context of the issuer or be globally unique. The processing of this claim is generally application specific. The "sub" value is a case-sensitive string containing a StringOrURI value.',
    }),
    iat: Type.Number({
      description:
        'The "iat" (issued at) claim identifies the time at which the JWT was issued. This claim can be used to determine the age of the JWT. Its value MUST be a number containing a NumericDate value.',
    }),
    azp: Type.String(),
    jti: Type.String({
      description:
        'The "jti" (JWT ID) claim provides a unique identifier for the JWT. The identifier value MUST be assigned in a manner that ensures that there is a negligible probability that the same value will be accidentally assigned to a different data object; if the application uses multiple issuers, collisions MUST be prevented among values produced by different issuers as well. The "jti" claim can be used to prevent the JWT from being replayed. The "jti" value is a case- sensitive string.',
    }),
    email: Type.Optional(Type.String()),
    token_type: Type.Optional(
      Type.String({
        description:
          ' Type of the token as defined in Section 5.1 of OAuth2.0 [RFC6749].',
      })
    ),
    scope: Type.Optional(
      Type.String({
        description:
          'A JSON string containing a space-separated list of scopes associated with this token, in the format described in Section 3.3 of OAuth 2.0 [RFC6749].',
      })
    ),
    client_id: Type.Optional(
      Type.String({
        description:
          'Client identifier for the OAuth 2.0 client that requested this token.',
      })
    ),
    username: Type.Optional(
      Type.String({
        description:
          ' Human-readable identifier for the resource owner who authorized this token',
      })
    ),
    resource_access: Type.Optional(
      Type.Record(
        Type.String(),
        Type.Object({ roles: Type.Array(Type.String(), { default: [] }) })
      )
    ),
    realm_access: Type.Optional(
      Type.Object({
        roles: Type.Array(Type.String(), { default: [] }),
      })
    ),
    cached: Type.Boolean({
      default: false,
    }),
  },
  { additionalProperties: true }
);

export type FakeToken = Static<typeof FakeToken>;
export const oauthFantocci: FastifyPluginAsync<OAuthFantocciOptions> =
  async function (fastify) {
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
            body: Type.Object({
              token: Type.String(),
            }),
            response: {
              '200': Type.Object(
                { active: Type.Boolean() },
                { additionalProperties: true }
              ),
              '401': Type.Object({ message: Type.String() }),
            },
          },
        },
        async (request, reply) => {
          const fakeToken: FakeToken = JSON.parse(
            decodeToken(extractToken(request.body.token))
          );
          const { additional_fake_props, ...payload } = fakeToken;
          const [type, credentials] = (
            request.headers.authorization ?? ''
          ).split(' ');
          if (!credentials || type !== 'Basic') {
            return reply.status(401).send({ message: 'Unauthorized' });
          }
          const [clientId, clientSecret] = Buffer.from(credentials, 'base64')
            .toString('utf-8')
            .split(':');

          if (
            clientId !== additional_fake_props.clientId ||
            clientSecret !== additional_fake_props.clientSecret
          ) {
            return reply.status(401).send({ message: 'Unauthorized' });
          }
          if (additional_fake_props?.diffIssuers) {
            return reply.send({ active: false });
          }

          return reply.send(
            additional_fake_props.active
              ? {
                  ...payload,
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
            body: FakeToken,
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
          return JSON.parse(decodeToken(extractToken(token)));
        }
      );
  };

export function extractToken(token: string): string {
  const [, payload] = token.split('.');
  return payload;
}

export function decodeToken(b64Payload: string): string {
  return Buffer.from(b64Payload, 'base64').toString();
}

export function buildToken(payload: unknown): string {
  const header = toBase64({
    alg: 'RS256',
    typ: 'JWT',
    kid: 'k12345',
  });
  const payloadB64 = toBase64(payload);
  const signature = toBase64('fake-signature-simulation');
  return `${header}.${payloadB64}.${signature}`;
}

function toBase64(toConvert: unknown): string {
  return Buffer.from(JSON.stringify(toConvert)).toString('base64');
}
