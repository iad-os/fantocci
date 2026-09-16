import type { Loader } from '@ghii/ghii-v2';
import { yamlLoader } from '@ghii/yaml-loader';
import minimist from 'minimist';
import { compact } from '../utils/object.js';

export const DEFAULT_CONFIG_FILE = 'fantocci.yaml';

type Env = Record<string, string | undefined>;

function toInt(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toHttps(value: string | undefined): string | false | undefined {
  if (value === undefined || value === '') return undefined;
  if (value === 'false' || value === '0') return false;
  return value;
}

/**
 * Configuration from environment variables.
 *
 * | Variable                                             | Path                 |
 * |------------------------------------------------------|----------------------|
 * | PORT, HOST, HTTPS, LOG_LEVEL                         | port, host, https, logLevel |
 * | ANYTHING_DELAY, ANYTHING_MAX_DELAY                   | anything.*           |
 * | COLORS_TITLE, COLORS_DESCRIPTION                     | colors.*             |
 * | OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET,     | oidc.*               |
 * | OIDC_DISCOVERY, OIDC_TOKEN_HEADER                    |                      |
 */
export function envLoader(env: Env = process.env): Loader {
  return () => {
    const anything = compact({
      delay: toInt(env['ANYTHING_DELAY']),
      maxDelay: toInt(env['ANYTHING_MAX_DELAY']),
    });
    const colors = compact({
      title: env['COLORS_TITLE'],
      description: env['COLORS_DESCRIPTION'],
    });
    const oidc = compact({
      issuer: env['OIDC_ISSUER'],
      clientId: env['OIDC_CLIENT_ID'],
      clientSecret: env['OIDC_CLIENT_SECRET'],
      discovery: env['OIDC_DISCOVERY'],
      tokenHeader: env['OIDC_TOKEN_HEADER'],
    });
    return compact({
      port: toInt(env['PORT']),
      host: env['HOST'],
      https: toHttps(env['HTTPS']),
      logLevel: env['LOG_LEVEL'],
      anything: Object.keys(anything).length ? anything : undefined,
      colors: Object.keys(colors).length ? colors : undefined,
      oidc: Object.keys(oidc).length ? oidc : undefined,
    });
  };
}

export const CLI_ALIASES = {
  p: 'port',
  h: 'host',
  c: 'config',
  cn: 'https',
  d: 'anything-delay',
  md: 'anything-max-delay',
  l: 'log-level',
} as const;

export function parseArgv(argv: string[]) {
  return minimist(argv, {
    alias: CLI_ALIASES,
    string: [
      'host',
      'https',
      'config',
      'log-level',
      'schema',
    ],
    boolean: [
      'help',
      'version',
    ],
  });
}

/**
 * Configuration from CLI flags. The first positional argument is the port.
 *
 * `fantocci [port] [-p port] [-h host] [--https cn1,cn2] [-d ms] [--anything-max-delay ms] [-l level] [--no-oidc]`
 */
export function cliLoader(argv: string[] = process.argv.slice(2)): Loader {
  return () => {
    const args = parseArgv(argv);
    const anything = compact({
      delay: toInt(String(args['anything-delay'] ?? '')),
      maxDelay: toInt(String(args['anything-max-delay'] ?? '')),
    });
    return compact({
      port: toInt(String(args['port'] ?? args._[0] ?? '')),
      host: args['host'] as string | undefined,
      https: toHttps(args['https'] as string | undefined),
      logLevel: args['log-level'] as string | undefined,
      anything: Object.keys(anything).length ? anything : undefined,
      // minimist turns `--no-oidc` into `oidc: false`
      oidc: args['oidc'] === false ? false : undefined,
    });
  };
}

/** Resolve the YAML config path: `--config` flag, then FANTOCCI_CONFIG, then ./fantocci.yaml */
export function resolveConfigFile(argv: string[] = process.argv.slice(2), env: Env = process.env): string {
  const fromCli = parseArgv(argv)['config'] as string | undefined;
  return fromCli || env['FANTOCCI_CONFIG'] || DEFAULT_CONFIG_FILE;
}

/** Configuration from a YAML file. A missing file is not an error. */
export function fileLoader(file: string, logger: (err: unknown, message: string) => void = () => {}): Loader {
  return yamlLoader(
    {
      throwOnError: false,
      logger,
    },
    file,
  );
}
