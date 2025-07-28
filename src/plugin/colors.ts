import type { FastifyPluginAsync } from 'fastify';


const colorsHtmlRespone = (color: string, title: string, text: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      background: #f9f9f9;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .color-box {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      padding: 2rem 3rem;
      text-align: center;
    }
    .color-title {
      color: ${color};
      margin-bottom: 1rem;
      font-size: 2.5rem;
    }
    .color-text {
      color: #333;
      font-size: 1.2rem;
    }
  </style>
</head>
<body>
  <div class="color-box">
    <div class="color-title">${title}</div>
    <div class="color-text">${text}</div>
  </div>
</body>
</html>
`;
export const colorsFantocci: FastifyPluginAsync = async (fastify) => {
  fastify.removeAllContentTypeParsers();
  fastify.addContentTypeParser('*', (_, payload, done) => {
    let data = '';
    payload.on('data', (chunk) => {
      data += chunk;
    });
    payload.on('end', () => {
      done(null, data);
    });
  });
  fastify
    //.register(formbody)
    .all('/red', {
      schema: {
        tags: ['colors'],
      }
    }, async (_, reply) => {
      reply.header('Content-Type', 'text/html');
      reply.send(colorsHtmlRespone('red', 'Red', 'Red'));
    })
    .all('/blue', {
      schema: {
        tags: ['colors'],
      }
    }, async (_, reply) => {
      reply.header('Content-Type', 'text/html');
      reply.send(colorsHtmlRespone('blue', 'Blue', 'Blue'));
    })
    .all('/green', {
      schema: {
        tags: ['colors'],
      }
    }, async (_, reply) => {
      reply.header('Content-Type', 'text/html');
      reply.send(colorsHtmlRespone('green', 'Green', 'Green'));
    })
    .all('/yellow', {
      schema: {
        tags: ['colors'],
      }
    }, async (_, reply) => {
      reply.header('Content-Type', 'text/html');
      reply.send(colorsHtmlRespone('yellow', 'Yellow', 'Yellow'));
    })
    .all('/purple', {
      schema: {
        tags: ['colors'],
      }
    }, async (_, reply) => {
      reply.header('Content-Type', 'text/html');
      reply.send(colorsHtmlRespone('purple', 'Purple', 'Purple'));
    })
    .all('/orange', {
      schema: {
        tags: ['colors'],
      }
    }, async (_, reply) => {
      reply.header('Content-Type', 'text/html');
      reply.send(colorsHtmlRespone('orange', 'Orange', 'Orange'));
    })
    .all('/pink', {
      schema: {
        tags: ['colors'],
      }
    }, async (_, reply) => {
      reply.header('Content-Type', 'text/html');
      reply.send(colorsHtmlRespone('pink', 'Pink', 'Pink'));
    });
};