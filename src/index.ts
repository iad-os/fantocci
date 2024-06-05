import { Fantocci } from './Fantocci.js';
import dotenv from 'dotenv';
import { normalizePort } from './normalizePort.js';
export * from './oauthFantocci.js';
export { Fantocci };
dotenv.config();

export default async function start(
  port: string | number = 3000,
  host = '0.0.0.0'
) {
  const app = await Fantocci();
  app.listen(
    {
      port: normalizePort(port),
      host,
    },
    function (err, address) {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      app.log.info(`server listening on ${address}`);
    }
  );
  return app;
}
