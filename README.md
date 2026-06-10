# mcp-compose

A TypeScript SDK for composing and routing across multiple MCP servers with typed tools, middleware, and Zod validation.

## Install

```bash
npm install mcp-compose
```

## Quick start

```typescript
import { ComposedClient } from 'mcp-compose'

const client = new ComposedClient({
  servers: [
    { name: 'files', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'] },
    { name: 'fetch', type: 'http', url: 'http://localhost:3001/mcp' },
  ],
})

await client.connect()

const tools = client.listTools()
// [{ name: 'read_file', serverName: 'files', ... }, { name: 'fetch', serverName: 'fetch', ... }]

const result = await client.callTool('read_file', { path: '/tmp/hello.txt' })

await client.disconnect()
```

## Server types

| Type | Config |
|---|---|
| `stdio` | `{ name, type: 'stdio', command, args? }` |
| `http` | `{ name, type: 'http', url, headers? }` |
| `client` | `{ name, type: 'client', client }` — pass a pre-built MCP `Client` instance |

The `client` type is useful for testing — pass in a mock instead of opening a real connection.

## Routing

By default, `ComposedClient` uses **strict mode**: if two servers expose a tool with the same name, `connect()` throws a `ToolConflictError`.

### First-wins

```typescript
const client = new ComposedClient({
  servers: [...],
  routing: { defaultStrategy: 'first-wins' },
})
```

The first server to register a tool wins; duplicates from later servers are silently skipped.

### Explicit assignments

```typescript
const client = new ComposedClient({
  servers: [
    { name: 'db-a', type: 'stdio', command: '...' },
    { name: 'db-b', type: 'stdio', command: '...' },
  ],
  routing: {
    assignments: {
      query: 'db-a',   // always route 'query' to db-a
      migrate: 'db-b', // always route 'migrate' to db-b
    },
  },
})
```

Assignments take priority over `defaultStrategy`. A tool assigned to another server is not registered from the non-assigned server, so there is no conflict.

## Middleware

Middleware runs around every `callTool` call in onion (wrap) order. Each function receives a `ToolContext` and a `next` function.

```typescript
const client = new ComposedClient({
  servers: [...],
  middleware: [
    async (ctx, next) => {
      console.log(`→ ${ctx.toolName}`, ctx.args)
      await next()
      console.log(`← ${ctx.toolName}`, ctx.result)
    },
  ],
})
```

### ToolContext

```typescript
interface ToolContext {
  toolName: string
  serverName: string
  args: Record<string, unknown>  // middleware can mutate to transform inputs
  result: unknown                // set after next(); middleware can read or replace
  meta: Record<string, unknown>  // free-form bag for passing data between middleware
}
```

### Adding middleware after construction

```typescript
client.getPipeline().use(async (ctx, next) => {
  // ...
  await next()
})
```

## Validation

`callTool` validates arguments against the tool's `inputSchema` using Zod before dispatching the call. If validation fails, a `ToolValidationError` is thrown — the MCP server is never called.

```typescript
import { ToolValidationError } from 'mcp-compose'

try {
  await client.callTool('greet', {}) // missing required field 'name'
} catch (err) {
  if (err instanceof ToolValidationError) {
    console.error(err.zodError.issues)
  }
}
```

## Error types

| Class | Thrown when |
|---|---|
| `ToolConflictError` | Two servers expose the same tool in strict mode |
| `ToolNotFoundError` | `callTool` is called with an unregistered tool name |
| `ToolValidationError` | Arguments fail Zod schema validation |

## Advanced: pre-built Router and Pipeline

For full control, pass a pre-built `Router` and `MiddlewarePipeline` directly:

```typescript
import { ComposedClient, Router, MiddlewarePipeline } from 'mcp-compose'

const router = new Router({ defaultStrategy: 'first-wins' })
const pipeline = new MiddlewarePipeline()

pipeline.use(async (ctx, next) => { /* ... */ await next() })

const client = new ComposedClient({ servers: [...], router, pipeline })
```

## API reference

### `ComposedClient`

| Method | Description |
|---|---|
| `connect()` | Connect to all servers, discover tools, register with router |
| `disconnect()` | Close all server connections |
| `listTools()` | Return all registered `ToolDefinition` objects |
| `callTool(name, args)` | Validate args, run middleware pipeline, dispatch to server |
| `getRouter()` | Return the internal `Router` instance |
| `getPipeline()` | Return the internal `MiddlewarePipeline` instance |

### `Router`

| Method | Description |
|---|---|
| `register(serverName, tools)` | Register raw tools from a server |
| `resolve(toolName)` | Return the server name for a tool, or throw `ToolNotFoundError` |
| `listTools()` | Return all registered `ToolDefinition` objects |

### `MiddlewarePipeline`

| Method | Description |
|---|---|
| `use(fn)` | Append a middleware function |
| `execute(ctx, handler)` | Run the pipeline with the given context and core handler |
