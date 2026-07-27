# mcp-compose

TypeScript SDK for composing multiple MCP servers behind a unified tool interface, with routing, middleware, and Zod validation. Dual CJS/ESM output via tsup.

## Commands

```bash
npm run build      # tsup → dist/ (CJS + ESM + declarations)
npm run typecheck  # tsc --noEmit
npm test           # vitest run (single pass)
npm run test:watch # vitest (watch mode)
```

`prepublishOnly` gates publish: typecheck → test → build in sequence.

## Project layout

```
src/
  types.ts       # shared interfaces, no logic
  errors.ts      # ToolConflictError, ToolNotFoundError, ToolValidationError
  schema.ts      # jsonSchemaToZod — converts MCP inputSchema to Zod
  router.ts      # Router — resolves tool names to server names
  middleware.ts  # MiddlewarePipeline — onion-style execution
  client.ts      # ComposedClient — public entry point
  index.ts       # re-exports only; nothing lives here
  __tests__/
    fixtures/
      echo-server.mts  # real MCP server spawned by integration test
    *.test.ts
dist/            # built output, gitignored
```

## Code conventions

**Local imports use `.js` extensions** — always, even in TypeScript source. Required for ESM runtime resolution.

```ts
import { Router } from './router.js'  // correct
import { Router } from './router'      // fails at runtime
```

**Zod v4** changed `z.record()` to require two arguments:

```ts
z.record(z.string(), z.unknown())  // correct
z.record(z.unknown())              // type error in Zod v4
```

**Error classes** extend `Error` and set `this.name` in the constructor. `ToolValidationError` exposes `.zodError` for callers to inspect field-level failures.

**Test fixtures** use `.mts` extension, not `.ts`. The package is `"type": "commonjs"` so `.ts` files are CJS. `.mts` forces ESM regardless. The integration test spawns fixtures with `node --experimental-strip-types` — requires Node 22.6+.

**MCP Server instances** must declare capabilities explicitly or `listTools()` throws:

```ts
new Server(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {} } }  // required
)
```

**tsconfig** — `@types/node` provides `URL` and other Node globals. Do not add `"DOM"` to `lib`; this is a Node.js library and DOM types leak into published declarations.

## Public API

Only what is re-exported from `src/index.ts` is public. Intentionally internal (do not export): `RawTool`, `AdvancedConfig`, `jsonSchemaToZod`.

## How it fits together

`ComposedClient.connect()` calls `listTools()` on each configured server and registers results with `Router`. `Router` converts each tool's JSON Schema to a Zod schema via `jsonSchemaToZod`. `callTool()` resolves the target server, validates args against the Zod schema, builds a `ToolContext`, and runs it through `MiddlewarePipeline`. The inner handler sets `ctx.result` from the MCP response. Middleware that transforms inputs must assign to `ctx.args` — the inner handler reads `ctx.args` at call time, not the original `args` closure.

## Transport types

- `stdio` — `StdioClientTransport`, spawns a subprocess
- `http` — `StreamableHTTPClientTransport` (SSE transport was removed in MCP SDK 1.x)
- `client` — pass a pre-built `Client` instance directly (used in unit tests via mock clients)
