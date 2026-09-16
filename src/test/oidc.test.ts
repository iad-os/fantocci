import { type FastifyInstance, fastify } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildToken, expireIn60, issueNow } from '../plugins/oauth/oauth.utils.js';
import { getToken, oidcPlugin } from '../plugins/oidc.js';

/** Minimal fake identity provider: discovery, introspection and userinfo. */
async function startIssuer() {
  const idp = fastify();
  await idp.register(import('@fastify/formbody'));
  let issuer = '';
  idp.get('/realm/.well-known/openid-configuration', async () => ({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    introspection_endpoint: `${issuer}/introspect`,
    userinfo_endpoint: `${issuer}/userinfo`,
    jwks_uri: `${issuer}/certs`,
  }));
  idp.post<{
    Body: Record<string, string>;
  }>('/realm/introspect', async (req, reply) => {
    if (req.body['client_id'] !== 'cid' || req.body['client_secret'] !== 'sec') {
      return reply.status(401).send({
        error: 'invalid_client',
      });
    }
    return {
      active: req.body['token'] === 'good-token' || req.body['token']?.includes('.'),
      received: req.body['token'],
    };
  });
  idp.get('/realm/userinfo', async (req, reply) => {
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer '))
      return reply.status(401).send({
        error: 'invalid_token',
      });
    return {
      sub: 'user-1',
      name: 'User One',
    };
  });
  const address = await idp.listen({
    port: 0,
    host: '127.0.0.1',
  });
  issuer = `${address}/realm`;
  return {
    idp,
    issuer,
  };
}

describe('oidc plugin', () => {
  let idp: FastifyInstance;
  let issuer: string;
  let app: FastifyInstance;
  const token = () =>
    buildToken({
      iss: issuer,
      sub: 'user-1',
      exp: expireIn60(),
      iat: issueNow(),
    });

  beforeAll(async () => {
    ({ idp, issuer } = await startIssuer());
    app = fastify();
    await app.register(oidcPlugin, {
      prefix: '/oidc',
      issuer,
      clientId: 'cid',
      clientSecret: 'sec',
      tokenHeader: 'x-auth-token',
    });
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
    await idp.close();
  });

  it('decodes the token from the Authorization header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/oidc/jwt',
      headers: {
        authorization: `Bearer ${token()}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sub).toBe('user-1');
  });

  it('prefers the configured token header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/oidc/jwt',
      headers: {
        'x-auth-token': token(),
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().iss).toBe(issuer);
  });

  it('answers 400 without a token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/oidc/introspect',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().hint).toContain('x-auth-token');
  });

  it('answers 400 when the issuer does not match', async () => {
    const other = buildToken({
      iss: 'https://other.example',
      sub: 'u',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/oidc/introspect',
      headers: {
        authorization: `Bearer ${other}`,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/issuer/);
  });

  it('proxies introspection to the provider with client credentials', async () => {
    const raw = token();
    const res = await app.inject({
      method: 'GET',
      url: '/oidc/introspect',
      headers: {
        authorization: `Bearer ${raw}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      active: true,
      received: raw,
    });
  });

  it('proxies userinfo', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/oidc/userinfo',
      headers: {
        authorization: `Bearer ${token()}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      sub: 'user-1',
      name: 'User One',
    });
  });
});

describe('getToken', () => {
  const raw = buildToken({
    sub: 'x',
  });
  it('reads Bearer tokens case-insensitively', () => {
    expect(
      getToken({
        authorization: `bearer ${raw}`,
      })?.payload,
    ).toEqual({
      sub: 'x',
    });
  });
  it('ignores non-JWT values', () => {
    expect(
      getToken({
        authorization: 'Bearer nope',
      }),
    ).toBeUndefined();
    expect(
      getToken({
        authorization: 'Basic abc',
      }),
    ).toBeUndefined();
    expect(getToken({})).toBeUndefined();
  });
  it('falls back to Authorization when the custom header is empty', () => {
    expect(
      getToken(
        {
          'x-auth-token': '',
          authorization: `Bearer ${raw}`,
        },
        'X-Auth-Token',
      )?.raw,
    ).toBe(raw);
  });
});
