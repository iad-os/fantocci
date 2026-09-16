import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import Type, { type Static } from 'typebox';
import { escapeHtml } from '../utils/html.js';
import { useRawBodyParser } from '../utils/raw-body.js';

export const ColorsOptions = Type.Object({
  title: Type.String(),
  description: Type.String(),
});
export type ColorsOptions = Static<typeof ColorsOptions>;

export const COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
] as const;
export type Color = (typeof COLORS)[number];

export function colorPage(color: Color, title: string, text: string): string {
  const safeTitle = escapeHtml(title);
  const safeText = escapeHtml(text);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} - ${color}</title>
  <style>
    body { background: ${color}; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.07); padding: 2rem 3rem; text-align: center; }
    .title { color: ${color}; margin-bottom: 1rem; font-size: 2.5rem; }
    .text { color: #333; font-size: 1.2rem; }
  </style>
</head>
<body>
  <div class="box">
    <div class="title">${safeTitle}</div>
    <div class="text">${safeText}</div>
  </div>
</body>
</html>
`;
}

/**
 * One HTML page per color (`/red`, `/blue`, ...). Any method is accepted.
 * Handy to visually tell apart deployments behind a router, canary or A/B split.
 */
export const colorsPlugin: FastifyPluginAsyncTypebox<ColorsOptions> = async (fastify, { title, description }) => {
  useRawBodyParser(fastify);
  for (const color of COLORS) {
    fastify.all(
      `/${color}`,
      {
        schema: {
          tags: [
            'colors',
          ],
          summary: `A ${color} page`,
          response: {
            200: Type.String({
              description: 'HTML page',
            }),
          },
        },
      },
      async (_request, reply) => reply.type('text/html; charset=utf-8').send(colorPage(color, title, description)),
    );
  }
};
