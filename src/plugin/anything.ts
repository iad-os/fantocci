import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Static, Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';

const AnythingFantocciOptions = Type.Object({
  maxDelay: Type.Number({ minimum: 1, default: 10 * 60 * 1000 }),
});

type AnythingFantocciOptions = Static<typeof AnythingFantocciOptions>;

export const anythingFantocci: FastifyPluginAsync<AnythingFantocciOptions> =
  async function (fastify, { maxDelay }) {
    fastify.removeAllContentTypeParsers();
    fastify.addContentTypeParser('*', function (request, payload, done) {
      let data = '';
      payload.on('data', (chunk) => {
        data += chunk;
      });
      payload.on('end', () => {
        done(null, data);
      });
    });
    fastify
      .withTypeProvider<TypeBoxTypeProvider>()
      //.register(formbody)
      .route({
        method: ['DELETE', 'PATCH', 'POST', 'PUT', 'OPTIONS'],
        schema: {
          tags: ['request-inspection'],
          body: Type.Union([Type.String(), Type.Any()]),
          params: Type.Object(
            {
              delay: Type.Optional(
                Type.Number({ minimum: 0, maximum: maxDelay })
              ),
            },
            { additionalProperties: true }
          ),
          headers: Type.Object(
            {
              delay: Type.Optional(
                Type.Number({ minimum: 0, maximum: maxDelay })
              ),
            },
            { additionalProperties: true }
          ),
          querystring: Type.Object(
            {
              delay: Type.Optional(
                Type.Number({ minimum: 0, maximum: maxDelay })
              ),
            },
            { additionalProperties: true }
          ),
        },
        url: '/:delay?',
        prefixTrailingSlash: 'no-slash',
        handler: async (req, reply) => {
          const delayTime = calculateDelay(
            { maxDelay, defaultDelay: 1000 },
            req.params.delay,
            req.headers.delay,
            req.query.delay
          );
          setTimeout(async () => {
            await reply.send({
              headers: req.headers,
              params: req.params,
              body: req.body,
              querystring: req.query,
              method: req.method,
              originalUrl: req.originalUrl,
              ips: req.ips,
            });
          }, delayTime);
          await reply;
        },
      })
      .route({
        method: ['GET', 'HEAD'],
        schema: {
          tags: ['request-inspection'],
          produces: ['application/json'],
          params: Type.Object(
            {
              delay: Type.Optional(
                Type.Number({ minimum: 0, maximum: maxDelay })
              ),
            },
            { additionalProperties: true }
          ),
          headers: Type.Object(
            {
              delay: Type.Optional(
                Type.Number({ minimum: 0, maximum: maxDelay })
              ),
            },
            { additionalProperties: true }
          ),
          querystring: Type.Object(
            {
              delay: Type.Optional(
                Type.Number({ minimum: 0, maximum: maxDelay })
              ),
            },
            { additionalProperties: true }
          ),
        },
        url: '/:delay?',
        prefixTrailingSlash: 'no-slash',
        handler: async (req, reply) => {
          const delayTime = calculateDelay(
            { maxDelay, defaultDelay: 1000 },
            req.params.delay,
            req.headers.delay,
            req.query.delay
          );
          setTimeout(async () => {
            await reply.send({
              headers: req.headers,
              params: req.params,
              body: req.body,
              querystring: req.query,
              method: req.method,
              originalUrl: req.originalUrl,
              ips: req.ips,
            });
          }, delayTime);
          await reply;
        },
      });
  };
function calculateDelay(
  { maxDelay, defaultDelay }: { maxDelay: number; defaultDelay: number },
  ...delayTimes: (number | undefined)[]
) {
  const delayPrefs = delayTimes.filter((d): d is number => d !== undefined);
  if (delayPrefs.length === 0) return defaultDelay;
  return delayPrefs.reduce((acc, cur) => Math.min(acc, cur), maxDelay);
}
