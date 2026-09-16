import type { FastifyInstance } from 'fastify';

/**
 * Replace every content type parser of this encapsulation context with a
 * catch-all parser that hands the raw body to the handler as a UTF-8 string.
 * Useful for request-inspection endpoints that must accept any payload.
 */
export function useRawBodyParser(fastify: FastifyInstance): void {
  fastify.removeAllContentTypeParsers();
  fastify.addContentTypeParser(
    '*',
    {
      parseAs: 'string',
    },
    (_request, body, done) => {
      done(null, body);
    },
  );
}
