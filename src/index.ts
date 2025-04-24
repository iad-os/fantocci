import fs from 'node:fs';
import options from './options.js';
import { resolve } from 'node:path';

if (process.argv.includes('--schema')) {
  const out = process.argv[process.argv.indexOf('--schema') + 1] ?? 'fantocci.schema.json';
  fs.writeFileSync(resolve(out), options.jsonSchema());
  console.log(`Schema written to ${out}`);
} else {
  (async () => {
    try {
      await options.waitForFirstSnapshot({
        timeout: 10000,
        async onFirstSnapshot(snapshot) {
          const { default: start } = await import('./main.js');
          start(snapshot);
          return;
        },
      });
      console.log(JSON.stringify(options.snapshot(), null, 2), 'CONFIG-SNAPSHOT - OK');
    } catch (err) {
      console.error(err, 'CONFIG-SNAPSHOT - KO');
      process.exit(1);
    }
  })();
}
