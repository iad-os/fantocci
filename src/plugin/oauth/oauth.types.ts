import { Static, Type } from '@sinclair/typebox';
import { Simplify } from 'type-fest';
import { expiresIn, issueNow } from './oauth.utils';

export const AccessTokenLikeRFC9068 = Type.Object({
  //https://datatracker.ietf.org/doc/html/rfc9068#section-2.2
  iss: Type.String({
    description: 'REQUIRED - as defined in Section 4.1.1 of [RFC7519]',
    examples: ['https://fantocci.iad2.cloud'],
  }),
  exp: Type.Number({
    description: 'REQUIRED - as defined in Section 4.1.4 of [RFC7519]',
    examples: [expiresIn(36000)],
  }),
  aud: Type.Union([Type.String(), Type.Array(Type.String())], {
    description:
      "REQUIRED - as defined in Section 4.1.3 of [RFC7519]. See Section 3 for indications on how an authorization server should determine the value of 'aud' depending on the request.",
  }),
  sub: Type.String({
    description:
      "REQUIRED - as defined in Section 4.1.2 of [RFC7519]. In cases of access tokens obtained through grants where a resource owner is involved, such as the authorization code grant, the value of 'sub' SHOULD correspond to the subject identifier of the resource owner. In cases of access tokens obtained through grants where no resource owner is involved, such as the client credentials grant, the value of 'sub' SHOULD correspond to an identifier the authorization server uses to indicate the client application. See Section 5 for more details on this scenario. Also, see Section 6 for a discussion about how different choices in assigning 'sub' values can impact privacy.",
  }),
  client_id: Type.String({
    description:
      'REQUIRED - as defined in Section 4.3 of [RFC8693]. The client_id claim carries the client identifier of the OAuth 2.0 [RFC6749] client that requested the token.',
  }),
  iat: Type.Number({
    description:
      'REQUIRED - as defined in Section 4.1.6 of [RFC7519]. This claim identifies the time at which the JWT access token was issued.',
    examples: [issueNow()],
  }),
  jti: Type.String({
    description:
      'REQUIRED - as defined in Section 4.1.7 of [RFC7519]. The "jti" (JWT ID) claim provides a unique identifier for the JWT.',
  }),

  auth_time: Type.Optional(
    Type.String({
      examples: [issueNow()],
      description:
        'Time when the End-User authentication occurred. Its value is a JSON number representing the number of seconds from 1970-01-01T00:00:00Z as measured in UTC until the date/time.',
    })
  ),
  acr: Type.Optional(
    Type.String({
      description:
        'Authentication Context Class Reference. String specifying an Authentication Context Class Reference value that identifies the Authentication Context Class that the authentication performed satisfied. The value "0" indicates the End-User authentication did not meet the requirements of ISO/IEC 29115 [ISO29115] level 1. For historic reasons, the value "0" is used to indicate that there is no confidence that the same person is actually there. Authentications with level 0 SHOULD NOT be used to authorize access to any resource of any monetary value. (This corresponds to the OpenID 2.0 PAPE [OpenID.PAPE] nist_auth_level 0.) An absolute URI or an RFC 6711 [RFC6711] registered name SHOULD be used as the acr value; registered names MUST NOT be used with a different meaning than that which is registered. Parties using this claim will need to agree upon the meanings of the values used, which may be context specific. The acr value is a case-sensitive string.',
    })
  ),
  amr: Type.Optional(
    Type.Array(Type.String(), {
      description:
        'Authentication Methods References. JSON array of strings that are identifiers for authentication methods used in the authentication. For instance, values might indicate that both password and OTP authentication methods were used. The definition of particular values to be used in the amr Claim is beyond the scope of this specification. Parties using this claim will need to agree upon the meanings of the values used, which may be context specific. The amr value is an array of case-sensitive strings.',
    })
  ),
  scope: Type.Optional(
    Type.String({
      examples: ['openid'],
      description:
        'The value of the scope claim is a JSON string containing a space-separated list of scopes associated with the token, in the format described in Section 3.3 of [RFC6749].',
    })
  ),
  resource_access: Type.Optional(
    Type.Record(
      Type.String(),
      Type.Object(
        {
          roles: Type.Array(Type.String(), {}),
        },
        {
          examples: [
            {
              nightswatch: {
                roles: ['raven', 'snow'],
              },
              stark: {
                roles: ['bastard'],
              },
              tagaryen: {
                roles: ['heir'],
              },
            },
          ],
        }
      )
    )
  ),
  realm_access: Type.Optional(
    Type.Object({
      roles: Type.Array(Type.String(), {
        examples: [['ghost']],
      }),
    })
  ),
});

export const FantocciFakerProps = Type.Object({
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
  omit: Type.Optional(
    Type.Array(
      Type.Exclude(Type.KeyOf(AccessTokenLikeRFC9068), Type.Literal('active'))
    )
  ),
});

export type AccessTokenLikeRFC9068 = Static<typeof AccessTokenLikeRFC9068>;

export type FantocciFakerProps = Static<typeof FantocciFakerProps>;

export const FakeAccessToken = Type.Intersect([
  AccessTokenLikeRFC9068,
  Type.Object(
    { additional_fake_props: FantocciFakerProps },
    {
      additionalProperties: true,
      description: 'Configure fake token generator',
    }
  ),
]);

export type FakeAccessToken = Simplify<
  Static<typeof FakeAccessToken> & { [key: string]: unknown }
>;

