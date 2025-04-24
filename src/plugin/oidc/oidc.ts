import type { IncomingHttpHeaders } from 'node:http';
import formbody from '@fastify/formbody';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { type Static, Type } from '@sinclair/typebox';
import type { FastifyPluginAsync } from 'fastify';
import { jwtDecode } from 'jwt-decode';
import { Issuer } from 'openid-client';

export const OIDCFantocciOptions = Type.Object({
  prefix: Type.Optional(Type.String({ pattern: '/S+' })),
  tokenHeader: Type.Optional(Type.String()),
  issuer: Type.String({ format: 'uri' }),
  clientId: Type.String(),
  clientSecret: Type.String(),
  discovery: Type.Optional(Type.String({ format: 'uri' })),
});

export type OIDCFantocciOptions = Static<typeof OIDCFantocciOptions>;

export const oidcFantocci: FastifyPluginAsync<OIDCFantocciOptions> = async (
  fastify,
  { tokenHeader, discovery, clientId, clientSecret, issuer }
) => {
  const oidcIssuer: Issuer = await Issuer.discover(resolveWellKnownUri(discovery ?? issuer));
  const client = new oidcIssuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
  });
  const headerTypeBuilder = (tokenHeader: string | undefined) => {
    if (tokenHeader) return Type.Object({ [tokenHeader]: Type.String() });
    return Type.Object({
      authorization: Type.Optional(Type.TemplateLiteral('Bearer ${string}')),
    });
  };

  const headerType = headerTypeBuilder(tokenHeader);

  fastify
    .withTypeProvider<TypeBoxTypeProvider>()
    .register(formbody)
    .get(
      '/introspect',
      {
        schema: {
          tags: ['oidc-tools'],
          produces: ['application/json'],
          headers: headerType,
          response: {
            '200': Type.Object({ active: Type.Boolean() }, { additionalProperties: true }),
            '400': Type.Object({
              message: Type.String(),
              hint: Type.Optional(Type.String()),
            }),
            '500': Type.Object({
              message: Type.String(),
              name: Type.String(),
            }),
          },
        },
      },
      async (request, reply) => {
        const token = getToken(request.headers, tokenHeader);
        if (!token) {
          return reply.status(400).send({
            message: 'Token is not provided in request',
            hint: tokenHeader
              ? `${tokenHeader} or Authorization heder don't contain a token`
              : `Authorization heder don't contain a token`,
          });
        }
        const { raw, token: tokenBody } = token;
        if (!tokenBody.iss) {
          return reply.status(400).send({
            message: 'Token does not contain an issuer',
          });
        }
        if (tokenBody.iss !== issuer) {
          return reply.status(400).send({
            message: 'Token issuer does not match the expected issuer',
          });
        }
        try {
          const response = await client.introspect(raw);
          return reply.send(response);
        } catch (error) {
          if (error instanceof Error) {
            return reply.status(500).send({ name: error.name, message: error.message });
          }
          reply.status(500).send({
            message: 'An error occured while introspecting the token',
          });
        }
      }
    )
    .get(
      '/jwt',
      {
        schema: { tags: ['oidc-tools'], produces: ['application/json'] },
      },
      async (request, reply) => {
        const token = getToken(request.headers, tokenHeader);
        if (!token) {
          return reply.status(400).send({
            message: 'Token is not provided in request',
            hint: tokenHeader
              ? `${tokenHeader} or Authorization heder don't contain a token`
              : `Authorization heder don't contain a token`,
          });
        }
        const { token: tokenBody } = token;
        return reply.send(tokenBody);
      }
    )
    .get(
      '/userinfo',
      {
        schema: { tags: ['oidc-tools'], produces: ['application/json'] },
      },
      async (request, reply) => {
        const token = getToken(request.headers, tokenHeader);
        if (!token) {
          return reply.status(400).send({
            message: 'Token is not provided in request',
            hint: tokenHeader
              ? `${tokenHeader} or Authorization heder don't contain a token`
              : `Authorization heder don't contain a token`,
          });
        }
        const { raw, token: tokenBody } = token;
        if (!tokenBody.iss) {
          return reply.status(400).send({
            message: 'Token does not contain an issuer',
          });
        }
        if (tokenBody.iss !== issuer) {
          return reply.status(400).send({
            message: 'Token issuer does not match the expected issuer',
          });
        }
        try {
          const response = await client.userinfo(raw);
          return reply.send(response);
        } catch (error) {
          if (error instanceof Error) {
            return reply.status(500).send({ name: error.name, message: error.message });
          }
          reply.status(500).send({
            message: 'An error occured while introspecting the token',
          });
        }
      }
    );
};

export function resolveWellKnownUri(uri: string): string {
  const parsed = new URL(uri);
  if (parsed.pathname.includes('/.well-known/')) {
    return uri;
  }
  let pathname: string;
  if (parsed.pathname.endsWith('/')) {
    pathname = `${parsed.pathname}.well-known/openid-configuration`;
  } else {
    pathname = `${parsed.pathname}/.well-known/openid-configuration`;
  }

  return new URL(pathname, parsed).toString();
}

function getToken(headers: IncomingHttpHeaders, tokenHeader: string | undefined) {
  let rawToken: string | undefined;

  if (tokenHeader) {
    const tokenHeaderValue = headers[tokenHeader.toLowerCase() as Lowercase<string>];
    if (tokenHeaderValue !== undefined && typeof tokenHeaderValue !== 'string') return;
    rawToken = tokenHeaderValue;
  }
  if (!rawToken) {
    if (!headers['authorization']) return;
    if (typeof headers['authorization'] !== 'string') return;
    rawToken = headers['authorization'].split('Bearer')[1];
  }
  if (!rawToken) return;
  return { raw: rawToken, token: jwtDecode(rawToken) };
}
