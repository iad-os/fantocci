import dotenv from 'dotenv';
import { Fantocci } from './Fantocci.js';
import { normalizePort } from './normalizePort.js';
import { FantocciOptions } from './options.js';
export * from './plugin/oauthFantocci.js';
export { Fantocci };
dotenv.config();

export default async function start({ port, host, https }: FantocciOptions) {
  const app = await Fantocci(https);
  const { promise, resolve, reject } = promiseKeeper<typeof app>();
  app.listen(
    {
      port: await normalizePort(port),
      host,
    },
    function (err, address) {
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
  let resolve: Parameters<
      ConstructorParameters<typeof Promise<T>>[0]
    >[0] = () => {
      return;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject: Parameters<ConstructorParameters<typeof Promise<T>>[0]>[1] = () => {
      return;
    };

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
