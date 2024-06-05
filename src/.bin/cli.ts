#!/usr/bin/env node

import start from '../index.js';

start(process.env.PORT, process.env.HOST)
  .then((app) => {
    console.log(`Service started :${app.server.address()}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
