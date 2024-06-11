import options from './options.js';

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
    console.log(
      JSON.stringify(options.snapshot(), null, 2),
      'CONFIG-SNAPSHOT - OK'
    );
  } catch (err) {
    console.error(err, 'CONFIG-SNAPSHOT - KO');
    process.exit(1);
  }
})();
