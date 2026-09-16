#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { configJsonSchema, createConfig, DEFAULT_CONFIG_FILE, parseArgv, resolveConfigFile } from './config/index.js';
import { FANTOCCI_VERSION } from './fantocci.js';
import { start } from './main.js';

const HELP = `fantocci ${FANTOCCI_VERSION} - httpbin-inspired HTTP test server

Usage: fantocci [port] [options]

Options:
  -p, --port <n>                Port to listen on (default 3000)
  -h, --host <host>             Host to bind (default 0.0.0.0)
      --https <cn1,cn2>         Enable HTTPS with a self-signed cert for these common names
  -l, --log-level <level>       fatal|error|warn|info|debug|trace|silent (default info)
  -d, --anything-delay <ms>     Default delay for /anything
      --anything-max-delay <ms> Max accepted delay for /anything
      --no-oidc                 Disable the /oidc endpoints even if configured
  -c, --config <file>           YAML config file (default ./${DEFAULT_CONFIG_FILE}, or $FANTOCCI_CONFIG)
      --schema [file]           Write the JSON Schema of the config file and exit
      --help                    Show this help
      --version                 Print the version

Precedence: defaults < YAML file < environment variables < CLI flags.
Environment: PORT HOST HTTPS LOG_LEVEL ANYTHING_DELAY ANYTHING_MAX_DELAY COLORS_TITLE COLORS_DESCRIPTION
             OIDC_ISSUER OIDC_CLIENT_ID OIDC_CLIENT_SECRET OIDC_DISCOVERY OIDC_TOKEN_HEADER FANTOCCI_CONFIG
`;

async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgv(argv);

  if (args['help']) {
    process.stdout.write(HELP);
    return;
  }
  if (args['version']) {
    process.stdout.write(`${FANTOCCI_VERSION}\n`);
    return;
  }
  if (args['schema'] !== undefined) {
    const out = resolve(typeof args['schema'] === 'string' && args['schema'] ? args['schema'] : 'fantocci.schema.json');
    writeFileSync(out, `${configJsonSchema()}\n`);
    process.stdout.write(`Schema written to ${out}\n`);
    return;
  }

  try {
    process.loadEnvFile();
  } catch {
    // no .env file, that's fine
  }

  const file = resolveConfigFile(argv);
  const config = createConfig({
    argv,
    file,
    logger: (err, msg) => console.warn(`[config] ${msg}`, err),
  });
  const options = await config.takeSnapshot();
  const app = await start(options);
  app.log.info(
    {
      configFile: file,
    },
    'fantocci started',
  );

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info(
      {
        signal,
      },
      'shutting down',
    );
    await app.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('fantocci failed to start:', error instanceof Error ? error.message : error);
  if (error && typeof error === 'object' && 'errors' in error) {
    console.error(
      JSON.stringify(
        (
          error as {
            errors: unknown;
          }
        ).errors,
        null,
        2,
      ),
    );
  }
  process.exit(1);
});
