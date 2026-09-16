import type { IncomingHttpHeaders } from 'node:http';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { type JwtPayload, jwtDecode } from 'jwt-decode';
import * as oidc from 'openid-client';
import Type, { type Static } from 'typebox';

export const OidcOptions = Type.Object(
  {
    issuer: Type.String({
      format: 'uri',
      description: 'Expected `iss` claim and default discovery base URL',
    }),
    clientId: Type.String({
      description: 'Client used to call the introspection endpoint',
    }),
    clientSecret: Type.String({
      description: 'Secret of the client (client_secret_post)',
    }),
    discovery: Type.Optional(
      Type.String({
        format: 'uri',
        description: 'Discovery document URL, when it differs from `<issuer>/.well-known/openid-configuration`',
      }),
    ),
    tokenHeader: Type.Optional(
      Type.String({
        description: 'Extra header to read the raw token from, before the Authorization header',
      }),
    ),
  },
  {
    description: 'OIDC tools backed by a real identity provider',
  },
);
export type OidcOptions = Static<typeof OidcOptions>;

const TAGS = [
  'oidc',
];

const ErrorReply = Type.Object({
  message: Type.String(),
  hint: Type.Optional(Type.String()),
});
const UpstreamErrorReply = Type.Object({
  name: Type.String(),
  message: Type.String(),
});

export type DecodedToken = {
  raw: string;
  payload: JwtPayload & Record<string, unknown>;
};

/** Read a raw JWT from `tokenHeader` (if configured) or from `Authorization: Bearer ...`. */
export function getToken(headers: IncomingHttpHeaders, tokenHeader?: string): DecodedToken | undefined {
  let raw: string | undefined;
  if (tokenHeader) {
    const value = headers[tokenHeader.toLowerCase()];
    if (typeof value === 'string' && value) raw = value;
  }
  if (!raw && typeof headers.authorization === 'string') {
    raw = /^Bearer\s+(.+)$/i.exec(headers.authorization)?.[1]?.trim();
  }
  if (!raw) return undefined;
  try {
    return {
      raw,
      payload: jwtDecode<JwtPayload & Record<string, unknown>>(raw),
    };
  } catch {
    return undefined;
  }
}

/**
 * Tools to poke at a real OIDC provider with the caller's token:
 *
 * - `GET /jwt` decodes the token (no verification)
 * - `GET /introspect` proxies RFC 7662 introspection with the configured client
 * - `GET /userinfo` proxies the UserInfo endpoint
 *
 * Tokens whose `iss` does not match the configured issuer are rejected upfront.
 */
export const oidcPlugin: FastifyPluginAsyncTypebox<OidcOptions> = async (
  fastify,
  { issuer, clientId, clientSecret, discovery, tokenHeader },
) => {
  const server = new URL(discovery ?? issuer);
  const config = await oidc.discovery(server, clientId, clientSecret, undefined, {
    execute:
      server.protocol === 'http:'
        ? [
            oidc.allowInsecureRequests,
          ]
        : [],
  });
  fastify.log.info(
    {
      issuer: config.serverMetadata().issuer,
    },
    'oidc discovery completed',
  );

  const headers = Type.Object(
    tokenHeader
      ? {
          [tokenHeader.toLowerCase()]: Type.Optional(Type.String()),
          authorization: Type.Optional(Type.String()),
        }
      : {
          authorization: Type.Optional(Type.String()),
        },
    {
      additionalProperties: true,
    },
  );

  const tokenHint = tokenHeader
    ? `provide the token in the "${tokenHeader}" header or as "Authorization: Bearer <token>"`
    : 'provide the token as "Authorization: Bearer <token>"';

  /** Extract and pre-validate the token or send the proper 400 reply. */
  function requireToken(request: FastifyRequest, reply: FastifyReply, checkIssuer: boolean) {
    const token = getToken(request.headers, tokenHeader);
    if (!token) {
      reply.status(400).send({
        message: 'Token not provided or not decodable',
        hint: tokenHint,
      });
      return undefined;
    }
    if (checkIssuer && token.payload.iss !== issuer) {
      reply.status(400).send({
        message: 'Token issuer does not match the configured issuer',
        hint: `expected "${issuer}", got "${token.payload.iss ?? '<missing>'}"`,
      });
      return undefined;
    }
    return token;
  }

  async function proxy<T>(reply: FastifyReply, call: () => Promise<T>) {
    try {
      return await reply.send(await call());
    } catch (error) {
      fastify.log.warn(
        {
          err: error,
        },
        'upstream oidc call failed',
      );
      const { name, message } =
        error instanceof Error
          ? error
          : {
              name: 'Error',
              message: String(error),
            };
      return reply.status(502).send({
        name,
        message,
      });
    }
  }

  fastify
    .get(
      '/jwt',
      {
        schema: {
          tags: TAGS,
          summary: 'Decode the token payload (no signature check)',
          headers,
          response: {
            200: Type.Record(Type.String(), Type.Unknown()),
            400: ErrorReply,
          },
        },
      },
      async (request, reply) => {
        const token = requireToken(request, reply, false);
        if (!token) return;
        return reply.send(token.payload);
      },
    )
    .get(
      '/introspect',
      {
        schema: {
          tags: TAGS,
          summary: 'Introspect the token at the identity provider',
          headers,
          response: {
            200: Type.Object(
              {
                active: Type.Boolean(),
              },
              {
                additionalProperties: true,
              },
            ),
            400: ErrorReply,
            502: UpstreamErrorReply,
          },
        },
      },
      async (request, reply) => {
        const token = requireToken(request, reply, true);
        if (!token) return;
        return proxy(reply, () => oidc.tokenIntrospection(config, token.raw));
      },
    )
    .get(
      '/userinfo',
      {
        schema: {
          tags: TAGS,
          summary: 'Fetch UserInfo claims with the token',
          headers,
          response: {
            200: Type.Record(Type.String(), Type.Unknown()),
            400: ErrorReply,
            502: UpstreamErrorReply,
          },
        },
      },
      async (request, reply) => {
        const token = requireToken(request, reply, true);
        if (!token) return;
        const expectedSubject = typeof token.payload.sub === 'string' ? token.payload.sub : oidc.skipSubjectCheck;
        return proxy(reply, () => oidc.fetchUserInfo(config, token.raw, expectedSubject));
      },
    );
};
