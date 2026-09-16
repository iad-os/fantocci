# Fantocci — notes for coding agents

httpbin-like HTTP test server: Fastify 5 + TypeBox 1.x (`typebox` package, not `@sinclair/typebox`),
Node 24+, ESM only, TypeScript 7 (`tsc` is the Go compiler; `noEmit` in tsconfig.json, emit via
tsconfig.build.json).

## Commands

- `npm test` (vitest run), `npm run check` (biome ci), `npm run typecheck`, `npm run build`
- `npm run dev` runs `src/cli.ts` with tsx watch; `npm run schema` regenerates `fantocci.schema.json`
  (CI fails if it is stale)

## Layout

- `src/cli.ts` bin entry; `src/main.ts` library entry (keep exports stable, it is the npm API)
- `src/fantocci.ts` app factory; `src/plugins/*` one Fastify plugin per feature, each exporting its
  TypeBox options schema; `src/config/*` schema + ghii-v2 engine + loaders (precedence:
  defaults < YAML < env < CLI); `src/utils/*` small pure helpers
- Tests live in `src/test/*.test.ts` and use `app.inject`; `oidc.test.ts` boots a fake IdP in-process

## Conventions

- Imports use `.js` extensions (NodeNext resolution). Relative imports only; no path aliases.
- Route schemas are TypeBox objects; response `default` schemas must stay permissive (all optional,
  `additionalProperties: true`) because Fastify reuses them for error replies.
- Anything user-provided that ends up in HTML goes through `escapeHtml`.
- Config: add a field to `src/config/schema.ts` (with `default` and `description`), map it in
  `src/config/loaders.ts` (env + CLI), document it in the README table, run `npm run schema`.
- Keep `CHANGELOG.md` updated; releases are cut from GitHub Releases whose tag matches `package.json`.
