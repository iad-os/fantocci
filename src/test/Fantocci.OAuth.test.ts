import { fastify } from 'fastify';
import { buildToken, FakeToken, oauthFantocci } from '../oauthFantocci';
import { describe, it, expect } from 'vitest';
describe('OAuth2 Test Suite', () => {
  const fantocci = fastify({ logger: { level: 'debug' } }).register(
    oauthFantocci
  );
  const aValidPayload: FakeToken = {
    additional_fake_props: {
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      active: true,
      diffIssuers: false
    },
    sub: 'daniele-test',
    iss: 'sso.fantocci.it/auth/realms/master',
    active: true,
    exp: 1321243123,
    aud: 'cli',
    azp: 'test-test',
    iat: 4523433254,
    cached: false,
    jti: 'testest'
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
  });
});

