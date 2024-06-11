import ghii from '@ghii/ghii-es';
import { Static, Type } from '@sinclair/typebox';
import { Simplify } from 'type-fest';
import minimist from 'minimist';
import { Value } from '@sinclair/typebox/value';

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
    const { _, p, h, cn } = minimist(process.argv.slice(2), {
      alias: { p: 'port', h: 'host', cn: 'common-name' },
    });
    return { port: p || _[0], host: h, https: cn };
  });
