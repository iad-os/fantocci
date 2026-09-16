# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-09-15

### Breaking

- Requires **Node.js 24** or newer.
- CLI binary renamed from `@iad-os/fantocci` to `fantocci` (`npx @iad-os/fantocci` keeps working); compiled entry moved from `dist/.bin/cli.js` to `dist/cli.js`.
- Configuration precedence is now **defaults < YAML file < environment < CLI flags**. Previously the YAML file overrode some environment variables.
- `/anything` rejects `status` values above 599 (was 1000). Upstream failures of `/oidc/introspect` and `/oidc/userinfo` answer `502` instead of `500`.
- The library entry point no longer loads `.env` as a side effect; only the CLI does.
- Config schema moved to the `typebox` 1.x package; `Simplify`/`type-fest` types are no longer re-exported.

### Added

- `--help`, `--version`, `--config <file>`, `--log-level`, `--no-oidc` CLI flags and `HTTPS`, `LOG_LEVEL` environment variables.
- `GET /health` endpoint; `/ui/openapi.json` and `/ui/openapi.yaml` documents.
- `createConfig` / `loadConfig` / `configJsonSchema` exports to embed Fantocci and its configuration in other programs.
- Graceful shutdown on SIGINT/SIGTERM.
- Tests for every plugin, including an in-process fake identity provider for the OIDC tools.
- `CLAUDE.md`, `CHANGELOG.md`, `LICENSE`, `.nvmrc`, `.dockerignore`, richer README.

### Changed

- Dependencies: Fastify 5.12, `typebox` 1.x with `@fastify/type-provider-typebox` 6, `@ghii/ghii-v2` with `@ghii/yaml-loader` 1.1, `openid-client` 6, `nanoid` 6, `@fastify/formbody` 9, Scalar API reference 1.68, TypeScript 7, Vitest 5, Biome 2.5.
- Removed unused dependencies (`@fastify/helmet`, `dotenv`, `lodash.omit`, `tslib`, `type-fest`, `cross-env`, `@scalar/api-reference`).
- Colored pages escape the configured title and description.
- Docker image based on `node:24-alpine`, with a `HEALTHCHECK`, built from a `.dockerignore`d context.
- CI runs lint, typecheck, tests, build and a Docker build on pushes and pull requests; npm publishing happens only when a GitHub Release is published and its tag matches `package.json`.

## [0.6.3] - 2025-10-10

Last release of the 0.x line. See the git history for details.
