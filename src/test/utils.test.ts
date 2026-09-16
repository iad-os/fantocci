import { describe, expect, it } from 'vitest';
import { calculateDelay } from '../plugins/anything.js';
import { createCertificate } from '../utils/certificate.js';
import { escapeHtml } from '../utils/html.js';
import { compact, omit } from '../utils/object.js';
import { normalizePort } from '../utils/port.js';

describe('normalizePort', () => {
  it('accepts numbers and numeric strings', () => {
    expect(normalizePort(3000)).toBe(3000);
    expect(normalizePort('8080')).toBe(8080);
    expect(normalizePort(0)).toBe(0);
  });
  it('rejects invalid values', () => {
    expect(() => normalizePort('abc')).toThrow(/Invalid port/);
    expect(() => normalizePort(70000)).toThrow(/Invalid port/);
    expect(() => normalizePort(-1)).toThrow(/Invalid port/);
    expect(() => normalizePort(1.5)).toThrow(/Invalid port/);
  });
});

describe('calculateDelay', () => {
  const bounds = {
    maxDelay: 1000,
    defaultDelay: 10,
  };
  it('falls back to the default when nothing is requested', () => {
    expect(calculateDelay(bounds)).toBe(10);
    expect(calculateDelay(bounds, undefined, undefined)).toBe(10);
  });
  it('picks the smallest requested delay', () => {
    expect(calculateDelay(bounds, 500, 200, undefined)).toBe(200);
  });
  it('never exceeds maxDelay', () => {
    expect(calculateDelay(bounds, 5000)).toBe(1000);
    expect(
      calculateDelay({
        maxDelay: 5,
        defaultDelay: 10,
      }),
    ).toBe(5);
  });
});

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<b class="x">Tom & 'Jerry'</b>`)).toBe(
      '&lt;b class=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/b&gt;',
    );
  });
});

describe('object helpers', () => {
  it('omit removes keys without mutating the source', () => {
    const source = {
      a: 1,
      b: 2,
      c: 3,
    };
    expect(
      omit(source, [
        'a',
        'c',
      ]),
    ).toEqual({
      b: 2,
    });
    expect(source).toEqual({
      a: 1,
      b: 2,
      c: 3,
    });
  });
  it('compact drops undefined values only', () => {
    expect(
      compact({
        a: 1,
        b: undefined,
        c: null,
        d: false,
        e: '',
      }),
    ).toEqual({
      a: 1,
      c: null,
      d: false,
      e: '',
    });
  });
});

describe('createCertificate', () => {
  it('creates a CA and a leaf certificate', async () => {
    const certs = await createCertificate({
      cert: {
        domains: [
          'localhost',
        ],
        validity: 1,
        organization: 'Test',
      },
    });
    expect(certs.ca.cert).toContain('BEGIN CERTIFICATE');
    expect(certs.certs.key).toContain('PRIVATE KEY');
  });
});
