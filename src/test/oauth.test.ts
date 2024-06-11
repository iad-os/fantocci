import { fastify } from 'fastify';
import {
  buildToken,
  FakeToken,
  oauthFantocci,
} from '../plugin/oauthFantocci.js';
import { describe, it, expect } from 'vitest';
describe('OAuth2 Test Suite', () => {
  const fantocci = fastify({ logger: { level: 'debug' } }).register(
    oauthFantocci
  );
  const aValidPayload: FakeToken = {
    client_id: 'clientId',
    iss: 'http://myhost',
    exp: 1234567890,
    iat: 1234567890,
    jti: 'jti',
    aud: 'dev',
    sub: 'a-man-have-a-subject',
    additional_fake_props: {
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      active: true,
    },
  };
  const aValidTokenB64 = buildToken(aValidPayload);

  it('build fake token', async () => {
    const { body } = await fantocci.inject({
      method: 'POST',
      path: '/_build_fake',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(aValidPayload),
    });

    expect(body).toBe(aValidTokenB64);
  });
  it('pass introspect', async () => {
    const res = await fantocci.inject({
      method: 'POST',
      path: '/introspect',
      headers: {
        host: 'myhost',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(
          `${aValidPayload?.additional_fake_props?.clientId}:${aValidPayload?.additional_fake_props?.clientSecret}`
        ).toString('base64')}`,
      },
      payload: `token=${aValidTokenB64}`,
    });
    fantocci.log.debug(res, 'Response');
    const { statusCode } = res;
    expect(statusCode).toBe(200);
    expect(res.json()).toEqual({
      active: true,
      aud: 'dev',
      client_id: 'clientId',
      exp: 1234567890,
      iat: 1234567890,
      iss: 'http://myhost',
      jti: 'jti',
      sub: 'a-man-have-a-subject',
    });
  });
  it('fail introspect', async () => {
    const res = await fantocci.inject({
      method: 'POST',
      path: '/introspect',
      headers: {
        host: 'not.myhost',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(
          `${aValidPayload?.additional_fake_props?.clientId}:${aValidPayload?.additional_fake_props?.clientSecret}`
        ).toString('base64')}`,
      },
      payload: `token=${aValidTokenB64}`,
    });
    fantocci.log.debug(res, 'Response');
    const { statusCode } = res;
    expect(statusCode).toBe(200);
    expect(res.json()).toEqual({
      active: false,
    });
  });
  it('fail with 401 if credential clientId is wrong', async () => {
    const res = await fantocci.inject({
      method: 'POST',
      path: '/introspect',
      headers: {
        host: 'not.myhost',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(
          `not${aValidPayload?.additional_fake_props?.clientId}:${aValidPayload?.additional_fake_props?.clientSecret}`
        ).toString('base64')}`,
      },
      payload: `token=${aValidTokenB64}`,
    });
    fantocci.log.debug(res, 'Response');
    const { statusCode } = res;
    expect(statusCode).toBe(401);
  });
  it('fail with 401 if credential clientSecret is wrong', async () => {
    const res = await fantocci.inject({
      method: 'POST',
      path: '/introspect',
      headers: {
        host: 'not.myhost',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(
          `${aValidPayload?.additional_fake_props?.clientId}:not${aValidPayload?.additional_fake_props?.clientSecret}`
        ).toString('base64')}`,
      },
      payload: `token=${aValidTokenB64}`,
    });
    fantocci.log.debug(res, 'Response');
    const { statusCode } = res;
    expect(statusCode).toBe(401);
  });
});
