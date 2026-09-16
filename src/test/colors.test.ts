import { fastify } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COLORS, colorsPlugin } from '../plugins/colors.js';

describe('colors plugin', () => {
  const app = fastify().register(colorsPlugin, {
    title: '<Canary>',
    description: 'A & B',
  });
  beforeAll(() => app.ready());
  afterAll(() => app.close());

  it.each(COLORS)('serves an HTML page for %s', async (color) => {
    const res = await app.inject({
      method: 'GET',
      url: `/${color}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.body).toContain(`background: ${color}`);
  });

  it('escapes the configured title and description', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/red',
      payload: 'ignored',
    });
    expect(res.body).toContain('&lt;Canary&gt;');
    expect(res.body).toContain('A &amp; B');
    expect(res.body).not.toContain('<Canary>');
  });
});
