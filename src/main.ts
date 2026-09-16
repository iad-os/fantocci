/**
 * Library entry point: build and run Fantocci programmatically, or reuse the
 * fake OAuth token helpers in your own tests.
 */
import type { FastifyInstance } from 'fastify';
import { Fantocci } from './fantocci.js';
import { normalizePort } from './utils/port.js';

export type { AnythingOptions, ColorsOptions } from './config/index.js';
export {
  configJsonSchema,
  createConfig,
  type FantocciConfigSources,
  FantocciOptions,
  loadConfig,
} from './config/index.js';
export { FANTOCCI_VERSION, Fantocci } from './fantocci.js';
export { anythingPlugin, calculateDelay } from './plugins/anything.js';
export { COLORS, type Color, colorsPlugin } from './plugins/colors.js';
export { oauthPlugin } from './plugins/oauth/oauth.js';
export * from './plugins/oauth/oauth.types.js';
export * from './plugins/oauth/oauth.utils.js';
export { getToken, OidcOptions, oidcPlugin } from './plugins/oidc.js';
export { createCertificate } from './utils/certificate.js';
export { normalizePort } from './utils/port.js';

import type { FantocciOptions as Options } from './config/index.js';

/** Build Fantocci and start listening. Resolves with the running instance. */
export async function start(options: Options): Promise<FastifyInstance> {
  const app = await Fantocci(options);
  await app.listen({
    port: normalizePort(options.port),
    host: options.host,
  });
  return app;
}

export default start;
