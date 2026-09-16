import Type, { type Static } from 'typebox';
import { OidcOptions } from '../plugins/oidc.js';

const A_DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Full Fantocci configuration. Every field has a default, so an empty object
 * is a valid configuration. Values may come from a YAML file, environment
 * variables or CLI flags (in increasing order of precedence).
 */
export const FantocciOptions = Type.Object(
  {
    port: Type.Number({
      default: 3000,
      minimum: 0,
      maximum: 65535,
      description: 'TCP port to listen on',
    }),
    host: Type.String({
      default: '0.0.0.0',
      description: 'Host/interface to bind',
    }),
    https: Type.Union(
      [
        Type.String({
          minLength: 1,
        }),
        Type.Literal(false),
      ],
      {
        default: false,
        description:
          'Comma separated common names for a self-signed certificate (e.g. "localhost,*.lo.example"). false disables HTTPS.',
      },
    ),
    logLevel: Type.Union(
      [
        Type.Literal('fatal'),
        Type.Literal('error'),
        Type.Literal('warn'),
        Type.Literal('info'),
        Type.Literal('debug'),
        Type.Literal('trace'),
        Type.Literal('silent'),
      ],
      {
        default: 'info',
        description: 'Pino log level',
      },
    ),
    anything: Type.Object(
      {
        delay: Type.Number({
          default: 1,
          minimum: 0,
          maximum: A_DAY_MS,
          description: 'Default response delay in milliseconds for /anything',
        }),
        maxDelay: Type.Number({
          default: 1000 * 60 * 10,
          minimum: 1,
          maximum: A_DAY_MS,
          description: 'Upper bound for any requested delay in milliseconds',
        }),
      },
      {
        default: {},
        description: 'Request inspection endpoint',
      },
    ),
    colors: Type.Object(
      {
        title: Type.String({
          default: 'Colors',
          description: 'Title shown on the colored HTML pages',
        }),
        description: Type.String({
          default: 'This is a colors plugin',
          description: 'Text shown on the colored HTML pages',
        }),
      },
      {
        default: {},
        description: 'Colored HTML pages (handy for routing/canary demos)',
      },
    ),
    oidc: Type.Union(
      [
        OidcOptions,
        Type.Literal(false),
      ],
      {
        default: false,
        description: 'OIDC tools backed by a real identity provider. false disables the /oidc endpoints.',
      },
    ),
  },
  {
    additionalProperties: false,
    $id: 'https://github.com/iad-os/fantocci/fantocci.schema.json',
  },
);

export type FantocciOptions = Static<typeof FantocciOptions>;
export type AnythingOptions = FantocciOptions['anything'];
export type ColorsOptions = FantocciOptions['colors'];
