import dotenv from 'dotenv';
import { Fantocci } from './Fantocci.js';
import { normalizePort } from './normalizePort.js';
import type { FantocciOptions } from './options.js';
export * from './plugin/oauth/oauth.js';
export * from './plugin/oauth/oauth.types.js';
export * from './plugin/oauth/oauth.utils.js';
export { Fantocci };
dotenv.config();

export default async function start(opts: FantocciOptions) {
  const { port, host } = opts;
  const app = await Fantocci(opts);
  const { promise, resolve, reject } = promiseKeeper<typeof app>();
  app.listen(
    {
      port: await normalizePort(port),
      host,
    },
    (err, address) => {
      if (err) {
        app.log.error(err);
        reject(err);
        process.exit(1);
      }
      app.log.info(`server listening on ${address}`);
      resolve(app);
    }
  );
  return promise;
}

function promiseKeeper<T = unknown>() {
  let resolve: Parameters<ConstructorParameters<typeof Promise<T>>[0]>[0] = () => {
    return;
  };
  let reject: Parameters<ConstructorParameters<typeof Promise<T>>[0]>[1] = () => {
    return;
  };

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
