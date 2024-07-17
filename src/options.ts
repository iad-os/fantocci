import ghii from '@ghii/ghii-es';
import { Static, Type } from '@sinclair/typebox';
import { Simplify } from 'type-fest';
import minimist from 'minimist';
import { Value } from '@sinclair/typebox/value';
import { AnythingFantocciOptions } from './plugin/anything';

export const FantocciOptions = Type.Object(
  {
    port: Type.Number({
      default: 3000,
      description: 'Port to listen on',
      minimum: 0,
      maximum: 65535,
    }),
    host: Type.String({ default: '0.0.0.0', description: 'Host to listen on' }),
    https: Type.Union(
      [
        Type.String({
          description:
            'Comma separated Common names for the certificate, e.g. "localhost',
        }),
        Type.Literal(false),
      ],
      {
        default: false,
        description:
          'If false disable HTTPS, if true certs will be generated automatically',
      }
    ),
    anything: Type.Optional(AnythingFantocciOptions),
  },
  { additionalProperties: false }
);

export type FantocciOptions = Simplify<Static<typeof FantocciOptions>>;

export default ghii(FantocciOptions)
  .loader(async () => {
    return Value.Create(FantocciOptions);
  })
  .loader(async () => {
    return {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
      host: process.env.HOST,
    };
  })
  .loader(async () => {
    if (process.env.ANYTHING_DELAY || process.env.ANYTHING_MAX_DELAY)
      return {
        anything: {
          delay: process.env.ANYTHING_DELAY
            ? parseInt(process.env.ANYTHING_DELAY, 10)
            : undefined,
          maxDelay: process.env.ANYTHING_MAX_DELAY
            ? parseInt(process.env.ANYTHING_MAX_DELAY, 10)
            : undefined,
        },
      };
    return {};
  })
  .loader(async () => {
    const { _, p, h, cn, d, md } = minimist(process.argv.slice(2), {
      alias: {
        p: 'port',
        h: 'host',
        cn: 'common-name',
        d: 'anything-delay',
        md: 'max-delay',
      },
    });
    return {
      port: p || _[0],
      host: h,
      https: cn,
      anything: {
        delay: d ? parseInt(d, 10) : undefined,
        maxDelay: md ? parseInt(md, 10) : undefined,
      },
    };
  });
