import { ghii } from '@ghii/ghii-v2';
import { typeboxEngine } from './engine.js';
import { cliLoader, envLoader, fileLoader, resolveConfigFile } from './loaders.js';
import { FantocciOptions } from './schema.js';

/** Coerce values that YAML/env deliver as strings but the schema models as `false`. */
export function normalizeInput(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const config = {
    ...(input as Record<string, unknown>),
  };
  if (config['https'] === 'false' || config['https'] === '0' || config['https'] === '') config['https'] = false;
  if (config['oidc'] === 'false' || config['oidc'] === '0' || config['oidc'] === '') config['oidc'] = false;
  return config;
}

const engine = () => typeboxEngine(FantocciOptions, normalizeInput);

export { typeboxEngine } from './engine.js';
export { cliLoader, DEFAULT_CONFIG_FILE, envLoader, fileLoader, parseArgv, resolveConfigFile } from './loaders.js';
export type { AnythingOptions, ColorsOptions } from './schema.js';
export { FantocciOptions } from './schema.js';

export type FantocciConfigSources = {
  argv?: string[];
  env?: Record<string, string | undefined>;
  /** Explicit YAML path. Defaults to `--config`, `FANTOCCI_CONFIG` or `./fantocci.yaml`. */
  file?: string | false;
  logger?: (err: unknown, message: string) => void;
};

/**
 * Build the configuration runtime. Precedence (lowest to highest):
 * schema defaults → YAML file → environment variables → CLI flags.
 */
export function createConfig({
  argv = process.argv.slice(2),
  env = process.env,
  file = resolveConfigFile(argv, env),
  logger,
}: FantocciConfigSources = {}) {
  const config = ghii(engine());
  if (file !== false) config.loader(fileLoader(file, logger));
  return config.loader(envLoader(env)).loader(cliLoader(argv));
}

/** Load, merge and validate the configuration once. */
export async function loadConfig(sources: FantocciConfigSources = {}): Promise<FantocciOptions> {
  return createConfig(sources).takeSnapshot();
}

/** JSON Schema of the configuration, e.g. for editor validation of fantocci.yaml */
export function configJsonSchema(): string {
  return engine().toJsonSchema(true);
}
