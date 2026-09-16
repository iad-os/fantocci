import { fastify } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { oauthPlugin } from '../plugins/oauth/oauth.js';
import type { FakeAccessToken, FantocciFakerProps } from '../plugins/oauth/oauth.types.js';
import { buildFakeAccessToken, buildToken, expireIn60, issueNow, jwtId } from '../plugins/oauth/oauth.utils.js';

const claims = () => ({
  client_id: 'clientId',
  iss: 'http://myhost',
  exp: expireIn60(),
  iat: issueNow(),
  jti: jwtId(),
  aud: 'dev',
  sub: 'a-man-have-a-subject',
});
const faker: FantocciFakerProps = {
  clientId: 'clientId',
  clientSecret: 'clientSecret',
  active: true,
};
const basic = (id: string, secret: string) => `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;

describe('oauth plugin', () => {
  const app = fastify().register(oauthPlugin, {
    prefix: '/oauth',
  });
  beforeAll(() => app.ready());
  afterAll(() => app.close());

  const introspect = (token: string, host: string, authorization: string) =>
    app.inject({
      method: 'POST',
      url: '/oauth/introspect',
      headers: {
        host,
        'content-type': 'application/x-www-form-urlencoded',
        authorization,
      },
      payload: `token=${token}`,
    });

  it('builds a fake token', async () => {
    const payload: FakeAccessToken = {
      ...claims(),
      additional_fake_props: faker,
    };
    const res = await app.inject({
      method: 'POST',
      url: '/oauth/_build_fake',
      payload,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(buildToken(payload));
  });

  it('introspects an active token', async () => {
    const payload = claims();
    const res = await introspect(buildFakeAccessToken(payload, faker), 'myhost', basic('clientId', 'clientSecret'));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      active: true,
      ...payload,
    });
  });

  it('reports inactive when the issuer host differs from the request host', async () => {
    const res = await introspect(
      buildFakeAccessToken(claims(), faker),
      'not.myhost',
      basic('clientId', 'clientSecret'),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      active: false,
    });
  });

  it('reports inactive when the token says so', async () => {
    const token = buildFakeAccessToken(claims(), {
      ...faker,
      active: false,
    });
    const res = await introspect(token, 'myhost', basic('clientId', 'clientSecret'));
    expect(res.json()).toEqual({
      active: false,
    });
  });

  it.each([
    [
      'wrong client id',
      basic('nope', 'clientSecret'),
    ],
    [
      'wrong secret',
      basic('clientId', 'nope'),
    ],
    [
      'missing credentials',
      '',
    ],
    [
      'not basic',
      'Bearer abc',
    ],
  ])('answers 401 with %s', async (_label, authorization) => {
    const res = await introspect(buildFakeAccessToken(claims(), faker), 'myhost', authorization);
    expect(res.statusCode).toBe(401);
  });

  it('omits the requested claims', async () => {
    const token = buildFakeAccessToken(claims(), {
      ...faker,
      omit: [
        'exp',
        'iat',
        'jti',
        'sub',
        'aud',
        'iss',
        'client_id',
      ],
    });
    const res = await introspect(token, 'myhost', basic('clientId', 'clientSecret'));
    expect(res.json()).toEqual({
      active: true,
    });
  });

  it('answers 400 on a malformed token', async () => {
    const res = await introspect('not-a-jwt', 'myhost', basic('clientId', 'clientSecret'));
    expect(res.statusCode).toBe(400);
  });

  it('decodes a bearer token', async () => {
    const payload = claims();
    const res = await app.inject({
      method: 'GET',
      url: '/oauth/_decode_token',
      headers: {
        authorization: `Bearer ${buildToken(payload)}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(payload);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/oauth/_decode_token',
        })
      ).statusCode,
    ).toBe(400);
  });
});
