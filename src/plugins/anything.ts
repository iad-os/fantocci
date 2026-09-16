import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { FastifyReply, FastifyRequest } from 'fastify';
import Type, { type Static } from 'typebox';
import { useRawBodyParser } from '../utils/raw-body.js';
import { sleep } from '../utils/sleep.js';

export const AnythingOptions = Type.Object({
  delay: Type.Number({
    minimum: 0,
  }),
  maxDelay: Type.Number({
    minimum: 1,
  }),
});
export type AnythingOptions = Static<typeof AnythingOptions>;

const TAGS = [
  'anything',
];

/** Pick the smallest requested delay, capped at `maxDelay`; fall back to `defaultDelay`. */
export function calculateDelay(
  {
    maxDelay,
    defaultDelay,
  }: {
    maxDelay: number;
    defaultDelay: number;
  },
  ...requested: (number | undefined)[]
): number {
  const wanted = requested.filter((d): d is number => d !== undefined);
  if (wanted.length === 0) return Math.min(defaultDelay, maxDelay);
  return Math.min(maxDelay, ...wanted);
}

/**
 * Echo endpoint inspired by httpbin's /anything.
 *
 * - `/anything`, `/anything/:delay` for any HTTP method
 * - delay (ms) via path param, `delay` header or `?delay=` query (the smallest wins, capped at maxDelay)
 * - response status via `status` header or `?status=` query
 */
export const anythingPlugin: FastifyPluginAsyncTypebox<AnythingOptions> = async (fastify, { delay, maxDelay }) => {
  useRawBodyParser(fastify);

  const delaySchema = Type.Optional(
    Type.Number({
      minimum: 0,
      maximum: maxDelay,
      description: 'Delay of the response in milliseconds',
    }),
  );
  const statusSchema = Type.Optional(
    Type.Number({
      minimum: 100,
      maximum: 599,
      description: 'Status code of the response',
    }),
  );
  const params = Type.Object(
    {
      delay: delaySchema,
    },
    {
      additionalProperties: true,
    },
  );
  const headers = Type.Object(
    {
      delay: delaySchema,
      status: statusSchema,
    },
    {
      additionalProperties: true,
    },
  );
  const querystring = Type.Object(
    {
      delay: delaySchema,
      status: statusSchema,
    },
    {
      additionalProperties: true,
    },
  );
  // Every field is optional and extra properties are allowed: the same schema
  // documents the echo for any status code and must not break Fastify's own
  // error replies (validation errors and so on), which share the `default` slot.
  const response = {
    default: Type.Object(
      {
        method: Type.Optional(Type.String()),
        originalUrl: Type.Optional(Type.String()),
        headers: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        params: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        querystring: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        body: Type.Optional(Type.Unknown()),
        ips: Type.Optional(Type.Array(Type.String())),
      },
      {
        additionalProperties: true,
        description: 'Echo of the incoming request',
      },
    ),
  };

  type EchoRequest = FastifyRequest<{
    Params: Static<typeof params>;
    Headers: Static<typeof headers>;
    Querystring: Static<typeof querystring>;
  }>;

  async function echo(req: EchoRequest, reply: FastifyReply) {
    await sleep(
      calculateDelay(
        {
          maxDelay,
          defaultDelay: delay,
        },
        req.params.delay,
        req.headers.delay,
        req.query.delay,
      ),
    );
    return reply.status(req.headers.status ?? req.query.status ?? 200).send({
      method: req.method,
      originalUrl: req.originalUrl,
      headers: req.headers,
      params: req.params,
      querystring: req.query,
      body: req.body,
      ips: req.ips ?? [
        req.ip,
      ],
    });
  }

  // Two explicit URLs instead of `/:delay?` so the OpenAPI document lists
  // `/anything` and `/anything/{delay}` (an optional segment is not valid OpenAPI).
  for (const url of [
    '/',
    '/:delay',
  ]) {
    fastify
      .route({
        method: [
          'GET',
          'HEAD',
        ],
        url,
        prefixTrailingSlash: 'no-slash',
        schema: {
          tags: TAGS,
          summary: 'Echo the request',
          params,
          headers,
          querystring,
          response,
        },
        handler: echo,
      })
      .route({
        method: [
          'POST',
          'PUT',
          'PATCH',
          'DELETE',
          'OPTIONS',
        ],
        url,
        prefixTrailingSlash: 'no-slash',
        schema: {
          tags: TAGS,
          summary: 'Echo the request (with body)',
          body: Type.Optional(
            Type.Unknown({
              description: 'Any payload, echoed back as a string',
            }),
          ),
          params,
          headers,
          querystring,
          response,
        },
        handler: echo,
      });
  }
};
