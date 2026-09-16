import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { typeboxEngine } from '../config/engine.js';
import { cliLoader, createConfig, envLoader, FantocciOptions, loadConfig, resolveConfigFile } from '../config/index.js';

const noEnv = {};

describe('config: defaults', () => {
  it('an empty configuration is valid and fully defaulted', async () => {
    const config = await loadConfig({
      argv: [],
      env: noEnv,
      file: false,
    });
    expect(config).toEqual({
      port: 3000,
      host: '0.0.0.0',
      https: false,
      logLevel: 'info',
      anything: {
        delay: 1,
        maxDelay: 600000,
      },
      colors: {
        title: 'Colors',
        description: 'This is a colors plugin',
      },
      oidc: false,
    });
  });
});

describe('config: environment loader', () => {
  it('maps and coerces variables', async () => {
    const values = await envLoader({
      PORT: '4000',
      HOST: '127.0.0.1',
      HTTPS: 'localhost,*.lo.test',
      LOG_LEVEL: 'debug',
      ANYTHING_DELAY: '5',
      COLORS_TITLE: 'Hello',
      OIDC_ISSUER: 'https://issuer.test',
      OIDC_CLIENT_ID: 'cid',
      OIDC_CLIENT_SECRET: 'sec',
    })();
    expect(values).toEqual({
      port: 4000,
      host: '127.0.0.1',
      https: 'localhost,*.lo.test',
      logLevel: 'debug',
      anything: {
        delay: 5,
      },
      colors: {
        title: 'Hello',
      },
      oidc: {
        issuer: 'https://issuer.test',
        clientId: 'cid',
        clientSecret: 'sec',
      },
    });
  });
  it('ignores unset and empty variables', async () => {
    expect(
      await envLoader({
        PORT: '',
        HOST: undefined,
      })(),
    ).toEqual({});
  });
  it('HTTPS=false disables https', async () => {
    expect(
      await envLoader({
        HTTPS: 'false',
      })(),
    ).toEqual({
      https: false,
    });
  });
});

describe('config: cli loader', () => {
  it('reads flags, aliases and the positional port', async () => {
    expect(
      await cliLoader([
        '4001',
        '-h',
        'localhost',
        '-d',
        '7',
        '--anything-max-delay',
        '9',
        '--no-oidc',
      ])(),
    ).toEqual({
      port: 4001,
      host: 'localhost',
      anything: {
        delay: 7,
        maxDelay: 9,
      },
      oidc: false,
    });
    expect(
      await cliLoader([
        '-p',
        '4002',
        '--https',
        'localhost',
        '-l',
        'warn',
      ])(),
    ).toEqual({
      port: 4002,
      https: 'localhost',
      logLevel: 'warn',
    });
  });
  it('resolves the config file from --config, then FANTOCCI_CONFIG, then the default', () => {
    expect(
      resolveConfigFile(
        [
          '--config',
          'a.yaml',
        ],
        {
          FANTOCCI_CONFIG: 'b.yaml',
        },
      ),
    ).toBe('a.yaml');
    expect(
      resolveConfigFile([], {
        FANTOCCI_CONFIG: 'b.yaml',
      }),
    ).toBe('b.yaml');
    expect(resolveConfigFile([], {})).toBe('fantocci.yaml');
  });
});

describe('config: precedence and validation', () => {
  it('file < env < cli', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fantocci-'));
    const file = join(dir, 'fantocci.yaml');
    writeFileSync(file, 'port: 1000\nhost: file-host\nhttps: "false"\nanything:\n  delay: 3\n');
    const config = await loadConfig({
      argv: [
        '--port',
        '3000',
      ],
      env: {
        PORT: '2000',
        HOST: 'env-host',
      },
      file,
    });
    expect(config.port).toBe(3000);
    expect(config.host).toBe('env-host');
    expect(config.https).toBe(false);
    expect(config.anything).toEqual({
      delay: 3,
      maxDelay: 600000,
    });
  });
  it('a missing file is not an error', async () => {
    const config = await loadConfig({
      argv: [],
      env: noEnv,
      file: '/definitely/missing.yaml',
    });
    expect(config.port).toBe(3000);
  });
  it('rejects invalid values with detailed errors', async () => {
    await expect(
      loadConfig({
        argv: [
          '--port',
          '99999',
        ],
        env: noEnv,
        file: false,
      }),
    ).rejects.toThrow();
    const result = typeboxEngine(FantocciOptions).validate({
      port: 99999,
      oidc: {
        issuer: 'x',
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.map((e) => e.path)).toEqual(
        expect.arrayContaining([
          '/port',
        ]),
      );
    }
  });
  it('exposes a JSON schema', () => {
    const schema = JSON.parse(
      createConfig({
        argv: [],
        env: noEnv,
        file: false,
      }).jsonSchema(),
    );
    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining([
        'port',
        'host',
        'https',
        'logLevel',
        'anything',
        'colors',
        'oidc',
      ]),
    );
  });
});
