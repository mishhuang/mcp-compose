import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type { ZodTypeAny } from 'zod'

export type ServerConfig =
  | { name: string; type: 'stdio'; command: string; args?: string[] }
  | { name: string; type: 'http'; url: string; headers?: Record<string, string> }
  | { name: string; type: 'client'; client: Client }

export interface ToolDefinition {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
  zodSchema: ZodTypeAny
  serverName: string
}

export interface ToolContext {
  toolName: string
  serverName: string
  args: Record<string, unknown>
  result: unknown
  meta: Record<string, unknown>
}

export type Middleware = (ctx: ToolContext, next: () => Promise<void>) => Promise<void>

export interface RoutingConfig {
  assignments?: Record<string, string>
  defaultStrategy?: 'strict' | 'first-wins'
}

export interface ComposedClientConfig {
  servers: ServerConfig[]
  routing?: RoutingConfig
  middleware?: Middleware[]
}
