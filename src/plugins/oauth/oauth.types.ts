import Type, { type Static } from 'typebox';

/** JWT access token claims as described by RFC 9068 §2.2, plus common Keycloak extras. */
export const AccessTokenLikeRFC9068 = Type.Object({
  iss: Type.String({
    description: 'REQUIRED - issuer, as defined in Section 4.1.1 of RFC7519',
    examples: [
      'https://fantocci.example.com',
    ],
  }),
  exp: Type.Number({
    description: 'REQUIRED - expiration time (seconds since epoch), RFC7519 §4.1.4',
  }),
  aud: Type.Union(
    [
      Type.String(),
      Type.Array(Type.String()),
    ],
    {
      description: 'REQUIRED - audience, RFC7519 §4.1.3',
    },
  ),
  sub: Type.String({
    description: 'REQUIRED - subject, RFC7519 §4.1.2',
  }),
  client_id: Type.String({
    description: 'REQUIRED - client identifier, RFC8693 §4.3',
  }),
  iat: Type.Number({
    description: 'REQUIRED - issued at (seconds since epoch), RFC7519 §4.1.6',
  }),
  jti: Type.String({
    description: 'REQUIRED - unique JWT identifier, RFC7519 §4.1.7',
  }),
  auth_time: Type.Optional(
    Type.Number({
      description: 'Time when the end-user authentication occurred',
    }),
  ),
  acr: Type.Optional(
    Type.String({
      description: 'Authentication Context Class Reference',
    }),
  ),
  amr: Type.Optional(
    Type.Array(Type.String(), {
      description: 'Authentication Methods References',
    }),
  ),
  scope: Type.Optional(
    Type.String({
      examples: [
        'openid',
      ],
      description: 'Space separated scopes, RFC6749 §3.3',
    }),
  ),
  resource_access: Type.Optional(
    Type.Record(
      Type.String(),
      Type.Object({
        roles: Type.Array(Type.String()),
      }),
      {
        description: 'Keycloak style per-client roles',
        examples: [
          {
            nightswatch: {
              roles: [
                'raven',
                'snow',
              ],
            },
          },
        ],
      },
    ),
  ),
  realm_access: Type.Optional(
    Type.Object(
      {
        roles: Type.Array(Type.String()),
      },
      {
        description: 'Keycloak style realm roles',
      },
    ),
  ),
});
export type AccessTokenLikeRFC9068 = Static<typeof AccessTokenLikeRFC9068>;

/** Instructions for the fake introspection endpoint, embedded in the token itself. */
export const FantocciFakerProps = Type.Object({
  clientId: Type.String({
    minLength: 1,
    maxLength: 100,
    examples: [
      'clientId',
    ],
  }),
  clientSecret: Type.String({
    minLength: 1,
    maxLength: 100,
    examples: [
      'clientSecret',
    ],
  }),
  active: Type.Boolean({
    description: 'Whether introspection reports the token as active',
  }),
  omit: Type.Optional(
    Type.Array(Type.KeyOf(AccessTokenLikeRFC9068), {
      description: 'Claims to leave out of the introspection response',
    }),
  ),
});
export type FantocciFakerProps = Static<typeof FantocciFakerProps>;

export const FakeAccessToken = Type.Intersect([
  AccessTokenLikeRFC9068,
  Type.Object(
    {
      additional_fake_props: FantocciFakerProps,
    },
    {
      additionalProperties: true,
      description: 'Configure the fake token generator',
    },
  ),
]);
export type FakeAccessToken = Static<typeof FakeAccessToken> & Record<string, unknown>;
