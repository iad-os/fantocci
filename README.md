# Fantocci HTTP Test Server

<p align="center">
  <img src="./logo.png" alt="Fantocci logo" width="320">
</p>

[![npm](https://img.shields.io/npm/v/@iad-os/fantocci)](https://www.npmjs.com/package/@iad-os/fantocci)
[![CI](https://github.com/iad-os/fantocci/actions/workflows/ci.yml/badge.svg)](https://github.com/iad-os/fantocci/actions/workflows/ci.yml)
![node](https://img.shields.io/node/v/@iad-os/fantocci)
[![license](https://img.shields.io/npm/l/@iad-os/fantocci)](./LICENSE)

Fantocci ("puppets" in Italian) is an [httpbin](https://httpbin.org)-inspired HTTP server you point
your clients, gateways and proxies at while you test them. It echoes requests, fakes latency and
status codes, plays the part of an OAuth2 authorization server for token introspection, and lets you
poke at a real OpenID Connect provider with the token you are carrying.

Built with [Fastify](https://fastify.dev) and [TypeBox](https://github.com/sinclairzx81/typebox);
every endpoint is documented in an interactive API reference served by the app itself.

## Table of contents

- [Quick start](#quick-start)
- [Endpoints](#endpoints)
  - [Request echo: `/anything`](#request-echo-anything)
  - [Fake OAuth2 server: `/oauth`](#fake-oauth2-server-oauth)
  - [OIDC tools: `/oidc`](#oidc-tools-oidc)
  - [Colored pages: `/red`, `/blue`, ...](#colored-pages-red-blue-)
- [Configuration](#configuration)
- [Docker](#docker)
- [Use as a library](#use-as-a-library)
- [Development](#development)
- [Release](#release)

## Quick start

Requires **Node.js 24+**.

```sh
npx @iad-os/fantocci            # listens on http://0.0.0.0:3000
npx @iad-os/fantocci 8080       # first positional argument is the port
npx @iad-os/fantocci --help     # all flags
```

or with Docker (no prebuilt image is published yet, build it locally):

```sh
docker build -t fantocci . && docker run --rm -p 3000:3000 fantocci
```

Open <http://localhost:3000> to land on the API reference (`/ui/`). The raw OpenAPI document is at
`/ui/openapi.json`, and `/health` answers `{"status":"ok","version":"..."}`.

## Endpoints

### Request echo: `/anything`

`GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /anything[/:delay]`

Answers with a JSON description of the request it received: method, URL, headers, path params,
query string, raw body (as a string, whatever the content type) and client IPs.

| Control            | Where                                                | Notes                                                               |
| ------------------ | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Response delay, ms | path `/anything/1500`, header `delay`, query `?delay=` | The **smallest** requested value wins, capped at `anything.maxDelay` |
| Status code        | header `status`, query `?status=`                    | 100–599                                                             |

```sh
curl -s localhost:3000/anything/2000?status=503 -H 'x-trace: 1' -d 'hello'
```

### Fake OAuth2 server: `/oauth`

Test resource servers and gateways that validate access tokens through
[RFC 7662 introspection](https://datatracker.ietf.org/doc/html/rfc7662) without standing up an
identity provider. The trick: the token itself carries the answer the introspection endpoint must give.

1. `POST /oauth/_build_fake` — send [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068)-like
   claims plus an `additional_fake_props` object and get back an (unsigned) JWT:

   ```json
   {
     "iss": "http://localhost:3000",
     "sub": "alice", "aud": "my-api", "client_id": "my-app",
     "exp": 1900000000, "iat": 1700000000, "jti": "abc",
     "scope": "openid profile",
     "additional_fake_props": {
       "clientId": "my-app", "clientSecret": "s3cret",
       "active": true,
       "omit": ["jti"]
     }
   }
   ```

2. `POST /oauth/introspect` (`application/x-www-form-urlencoded`, `token=<jwt>`) with
   `Authorization: Basic base64(clientId:clientSecret)`:
   - `401` when the Basic credentials differ from the ones embedded in the token;
   - `{"active": false}` when `active` is false **or** the host of `iss` is not the host the
     request was sent to (so a token minted for another instance is rejected, like a real server would);
   - otherwise the claims, minus the ones listed in `omit`, with `"active": true`.

3. `GET /oauth/_decode_token` with `Authorization: Bearer <jwt>` decodes any JWT payload (no signature check).

The helpers used by these endpoints (`buildFakeAccessToken`, `buildToken`, `expiresIn`, ...) are
exported by the package, see [Use as a library](#use-as-a-library).

### OIDC tools: `/oidc`

Enabled only when the `oidc` configuration is set. Fantocci discovers the provider at startup and
uses the configured client to call it on your behalf, with the token found in the request
(`Authorization: Bearer <token>`, or the header named by `tokenHeader` if configured).

| Endpoint               | What it does                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `GET /oidc/jwt`        | Decodes the token payload (no verification)                                          |
| `GET /oidc/introspect` | Calls the provider's introspection endpoint with `clientId`/`clientSecret`           |
| `GET /oidc/userinfo`   | Calls the provider's UserInfo endpoint with the token                                |

Tokens whose `iss` differs from the configured `issuer` are rejected with `400` before any upstream
call; upstream failures are reported as `502` with the provider's error.

### Colored pages: `/red`, `/blue`, ...

`/red`, `/blue`, `/green`, `/yellow`, `/purple`, `/orange`, `/pink` answer any method with a
full-page colored HTML document showing `colors.title` and `colors.description`. Handy to tell
deployments apart behind a load balancer, a canary release or an A/B split.

## Configuration

Sources, in increasing order of precedence:

1. built-in defaults;
2. a YAML file: `./fantocci.yaml`, or the path given by `--config` / `FANTOCCI_CONFIG`
   (see [`example.fantocci.yaml`](./example.fantocci.yaml); a missing file is fine);
3. environment variables (a `.env` file in the working directory is loaded by the CLI);
4. CLI flags.

| YAML                  | Environment          | CLI                         | Default                    | Description                                                          |
| --------------------- | -------------------- | --------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `port`                | `PORT`               | `[port]`, `-p, --port`      | `3000`                     | TCP port                                                             |
| `host`                | `HOST`               | `-h, --host`                | `0.0.0.0`                  | Bind address                                                         |
| `https`               | `HTTPS`              | `--https`                   | `false`                    | Comma separated common names for a self-signed cert; `false` = HTTP  |
| `logLevel`            | `LOG_LEVEL`          | `-l, --log-level`           | `info`                     | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`         |
| `anything.delay`      | `ANYTHING_DELAY`     | `-d, --anything-delay`      | `1`                        | Default `/anything` delay, ms                                        |
| `anything.maxDelay`   | `ANYTHING_MAX_DELAY` | `--anything-max-delay`      | `600000`                   | Max accepted delay, ms                                               |
| `colors.title`        | `COLORS_TITLE`       |                             | `Colors`                   | Title on the colored pages                                           |
| `colors.description`  | `COLORS_DESCRIPTION` |                             | `This is a colors plugin`  | Text on the colored pages                                            |
| `oidc`                |                      | `--no-oidc`                 | `false`                    | Set to `false` to disable `/oidc`                                    |
| `oidc.issuer`         | `OIDC_ISSUER`        |                             |                            | Expected `iss`; discovery base URL unless `discovery` is set         |
| `oidc.clientId`       | `OIDC_CLIENT_ID`     |                             |                            | Client used for introspection                                        |
| `oidc.clientSecret`   | `OIDC_CLIENT_SECRET` |                             |                            | Its secret (`client_secret_post`)                                    |
| `oidc.discovery`      | `OIDC_DISCOVERY`     |                             |                            | Discovery document URL, when not `<issuer>/.well-known/openid-configuration` |
| `oidc.tokenHeader`    | `OIDC_TOKEN_HEADER`  |                             |                            | Extra header to read the raw token from                              |
|                       | `FANTOCCI_CONFIG`    | `-c, --config`              | `./fantocci.yaml`          | YAML file path                                                       |

The JSON Schema of the YAML file is shipped as [`fantocci.schema.json`](./fantocci.schema.json)
(regenerate it with `fantocci --schema [file]`). Add
`# yaml-language-server: $schema=./fantocci.schema.json` at the top of your file for editor
validation and completion.

When `https` is set, Fantocci generates a throw-away certificate authority and a leaf certificate
for the given names at startup and serves HTTP/2 with HTTP/1.1 fallback. Clients must skip
verification (`curl -k`) or trust the generated CA; this is meant for local testing only.

## Docker

```sh
docker build -t fantocci .
docker run --rm -p 3000:3000 -e ANYTHING_MAX_DELAY=5000 fantocci --log-level debug
docker run --rm -p 3000:3000 -v $PWD/my.yaml:/app/fantocci.yaml:ro fantocci
```

The image runs as the unprivileged `node` user, exposes port 3000 and ships a `HEALTHCHECK` on `/health`.
Arguments after the image name are passed to the CLI.

## Use as a library

```ts
import { Fantocci, loadConfig, start, buildFakeAccessToken, expiresIn, issueNow, jwtId } from '@iad-os/fantocci';

// 1. Run an instance from your test suite
const app = await Fantocci(await loadConfig({ argv: [], env: { PORT: '0' }, file: false }));
await app.listen({ port: 0 });
// ... app.server.address(), app.inject(...), await app.close()

// 2. Or just mint fake tokens for a resource server under test
const token = buildFakeAccessToken(
  { iss: 'http://localhost:3000', sub: 'alice', aud: 'api', client_id: 'app', exp: expiresIn(60), iat: issueNow(), jti: jwtId() },
  { clientId: 'app', clientSecret: 'secret', active: true },
);
```

Exports include the app factory (`Fantocci`, `start`), the configuration runtime (`createConfig`,
`loadConfig`, `configJsonSchema`, `FantocciOptions` schema and type), every plugin
(`anythingPlugin`, `colorsPlugin`, `oauthPlugin`, `oidcPlugin`) so you can mount them on your own
Fastify instance, and the fake token helpers with their TypeBox schemas.

## Development

```sh
nvm use                 # Node 24, see .nvmrc
npm ci
npm run dev             # tsx watch + pretty logs, inspector enabled
npm test                # vitest run
npm run test:watch
npm run check           # biome ci (lint + format)
npm run typecheck       # tsc --noEmit (TypeScript 7)
npm run build           # emits dist/
npm run schema          # regenerates fantocci.schema.json
```

Project layout:

```
src/
  cli.ts             # bin entry: flags, .env, config, start, graceful shutdown
  main.ts            # library entry (public exports, start())
  fantocci.ts        # app factory: Fastify + OpenAPI + plugins
  config/            # TypeBox schema, ghii engine, YAML/env/CLI loaders
  plugins/           # anything, colors, oauth/, oidc
  utils/             # certificate, html, object, port, raw-body, sleep
  test/              # vitest suites (oidc.test.ts runs an in-process fake IdP)
```

Try the endpoints with the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
requests in [`test.http`](./test.http) and [`oidc-test.http`](./oidc-test.http). A devcontainer is provided.

## Release

1. Update `version` in `package.json` and the [CHANGELOG](./CHANGELOG.md), commit and push to `main`.
2. Create a GitHub Release with tag `v<version>`. The release workflow re-runs CI and publishes to
   npm with provenance; it fails if the tag and `package.json` disagree.

## License

[MIT](./LICENSE)
