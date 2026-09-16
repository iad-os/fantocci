import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../config/index.js';
import { Fantocci } from '../fantocci.js';

describe('Fantocci app', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await Fantocci(
      await loadConfig({
        argv: [
          '--log-level',
          'silent',
        ],
        env: {},
        file: false,
      }),
    );
    await app.ready();
  });
  afterAll(() => app.close());

  it('redirects / to the API reference', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/ui/');
  });

  it('exposes a health endpoint', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(res.json()).toMatchObject({
      status: 'ok',
    });
  });

  it('serves the API reference and the OpenAPI document', async () => {
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/ui/',
        })
      ).statusCode,
    ).toBe(200);
    const spec = (
      await app.inject({
        method: 'GET',
        url: '/ui/openapi.json',
      })
    ).json();
    expect(spec.openapi).toMatch(/^3\.1/);
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining([
        '/anything',
        '/anything/{delay}',
        '/oauth/introspect',
        '/oauth/_build_fake',
        '/red',
      ]),
    );
    expect(Object.keys(spec.paths)).not.toContain('/oidc/jwt');
  });

  it('mounts the plugins', async () => {
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/anything',
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/green',
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/oidc/jwt',
        })
      ).statusCode,
    ).toBe(404);
  });
});
