import { fastify } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anythingPlugin } from '../plugins/anything.js';

describe('anything plugin', () => {
  const app = fastify().register(anythingPlugin, {
    prefix: '/anything',
    delay: 0,
    maxDelay: 300,
  });
  beforeAll(() => app.ready());
  afterAll(() => app.close());

  it('echoes a GET request', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/anything?foo=bar',
      headers: {
        'x-test': '1',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.method).toBe('GET');
    expect(body.querystring).toEqual({
      foo: 'bar',
    });
    expect(body.headers['x-test']).toBe('1');
    expect(body.originalUrl).toBe('/anything?foo=bar');
  });

  it('echoes any body as a string, whatever the content type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/anything',
      headers: {
        'content-type': 'application/vnd.custom',
      },
      payload: 'raw payload',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().body).toBe('raw payload');
    expect(res.json().method).toBe('POST');
  });

  it.each([
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ] as const)('accepts %s', async (method) => {
    const res = await app.inject({
      method,
      url: '/anything',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().method).toBe(method);
  });

  it('sets the status from the query string or the header', async () => {
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/anything?status=418',
        })
      ).statusCode,
    ).toBe(418);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/anything',
          headers: {
            status: '503',
          },
        })
      ).statusCode,
    ).toBe(503);
  });

  it('applies the smallest requested delay', async () => {
    const started = Date.now();
    const res = await app.inject({
      method: 'GET',
      url: '/anything/250?delay=60',
      headers: {
        delay: '120',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(Date.now() - started).toBeGreaterThanOrEqual(55);
    expect(Date.now() - started).toBeLessThan(200);
    expect(res.json().params).toEqual({
      delay: 250,
    });
  });

  it('rejects a delay above maxDelay', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/anything/5000',
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid status code', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/anything?status=999',
    });
    expect(res.statusCode).toBe(400);
  });
});
