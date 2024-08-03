import { fastify } from 'fastify';
import {
  buildFakeAccessToken,
  buildToken,
  expireIn60,
  issueNow,
  jwtId,
  oauthFantocci,
} from '../plugin/oauth/oauth.js';
import { describe, it, expect } from 'vitest';
import { FakeAccessToken } from '../plugin/oauth/oauth.types.js';
describe('OAuth2 Test Suite', () => {
  const fantocci = fastify({ logger: { level: 'debug' } }).register(
    oauthFantocci
  );

  it('build fake token', async () => {
    const aValidPayload: FakeAccessToken = {
      client_id: 'clientId',
      iss: 'http://myhost',
      exp: expireIn60(),
      iat: issueNow(),
      jti: jwtId(),
      aud: 'dev',
      sub: 'a-man-have-a-subject',
      additional_fake_props: {
        clientId: 'clientId',
        clientSecret: 'clientSecret',
        active: true,
      },
    };
    const aValidTokenB64 = buildToken(aValidPayload);
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
    const tPayload = {
      client_id: 'clientId',
      iss: 'http://myhost',
      exp: expireIn60(),
      iat: issueNow(),
      jti: jwtId(),
      aud: 'dev',
      sub: 'a-man-have-a-subject',
    };
    const fakerConf = {
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      active: true,
    };
    const token = buildFakeAccessToken(tPayload, fakerConf);
    const res = await fantocci.inject({
      method: 'POST',
      path: '/introspect',
      headers: {
        host: 'myhost',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(
          `${fakerConf.clientId}:${fakerConf.clientSecret}`
        ).toString('base64')}`,
      },
      payload: `token=${token}`,
    });
    fantocci.log.debug(res, 'Response');
    const { statusCode } = res;
    expect(statusCode).toBe(200);
    expect(res.json()).toEqual({ active: true, ...tPayload });
  });
  it('fail introspect', async () => {
    const tPayload = {
      client_id: 'clientId',
      iss: 'http://myhost',
      exp: expireIn60(),
      iat: issueNow(),
      jti: jwtId(),
      aud: 'dev',
      sub: 'a-man-have-a-subject',
    };
    const fakerConf = {
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      active: true,
    };
    const token = buildFakeAccessToken(tPayload, fakerConf);
    const res = await fantocci.inject({
      method: 'POST',
      path: '/introspect',
      headers: {
        host: 'not.myhost',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(
          `${fakerConf.clientId}:${fakerConf.clientSecret}`
        ).toString('base64')}`,
      },
      payload: `token=${token}`,
    });
    fantocci.log.debug(res, 'Response');
    const { statusCode } = res;
    expect(statusCode).toBe(200);
    expect(res.json()).toEqual({
      active: false,
    });
  });
  it('fail with 401 if credential clientId is wrong', async () => {
    const tPayload = {
      client_id: 'clientId',
      iss: 'http://myhost',
      exp: expireIn60(),
      iat: issueNow(),
      jti: jwtId(),
      aud: 'dev',
      sub: 'a-man-have-a-subject',
    };
    const fakerConf = {
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      active: true,
    };
    const token = buildFakeAccessToken(tPayload, fakerConf);
    const res = await fantocci.inject({
      method: 'POST',
      path: '/introspect',
      headers: {
        host: 'not.myhost',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(
          `not${fakerConf.clientId}:${fakerConf.clientSecret}`
        ).toString('base64')}`,
      },
      payload: `token=${token}`,
    });
    fantocci.log.debug(res, 'Response');
    const { statusCode } = res;
    expect(statusCode).toBe(401);
  });
  it('fail with 401 if credential clientSecret is wrong', async () => {
    const tPayload = {
      client_id: 'clientId',
      iss: 'http://myhost',
      exp: expireIn60(),
      iat: issueNow(),
      jti: jwtId(),
      aud: 'dev',
      sub: 'a-man-have-a-subject',
    };
    const fakerConf = {
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      active: true,
    };
    const token = buildFakeAccessToken(tPayload, fakerConf);
    const res = await fantocci.inject({
      method: 'POST',
      path: '/introspect',
      headers: {
        host: 'not.myhost',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(
          `${fakerConf.clientId}:not${fakerConf.clientSecret}`
        ).toString('base64')}`,
      },
      payload: `token=${token}`,
    });
    fantocci.log.debug(res, 'Response');
    const { statusCode } = res;
    expect(statusCode).toBe(401);
  });

  it('omit from introspect', async () => {
    const tPayload = {
      client_id: 'clientId',
      iss: 'http://myhost',
      exp: expireIn60(),
      iat: issueNow(),
      jti: jwtId(),
      aud: 'dev',
      sub: 'a-man-have-a-subject',
    };
    const fakerConf: FantocciFakerProps = {
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      active: true,
      omit: ['exp', 'iat', 'jti', 'sub', 'aud', 'iss', 'client_id'],
    };
    const token = buildFakeAccessToken(tPayload, fakerConf);
    const res = await fantocci.inject({
      method: 'POST',
      path: '/introspect',
      headers: {
        host: 'myhost',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(
          `${fakerConf.clientId}:${fakerConf.clientSecret}`
        ).toString('base64')}`,
      },
      payload: `token=${token}`,
    });
    fantocci.log.debug(res, 'Response');
    const { statusCode } = res;
    expect(statusCode).toBe(200);
    expect(res.json()).toEqual({
      active: true,
    });
  });
});
