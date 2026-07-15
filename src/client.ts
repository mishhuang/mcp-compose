import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ZodError } from 'zod'
import type { ServerConfig, ComposedClientConfig, ToolDefinition } from './types.js'
import { Router } from './router.js'
import { MiddlewarePipeline } from './middleware.js'
import { ToolValidationError } from './errors.js'

type AdvancedConfig = {
  servers: ServerConfig[]
  router: Router
  pipeline: MiddlewarePipeline
}

export class ComposedClient {
  private servers: ServerConfig[]
  private router: Router
  private pipeline: MiddlewarePipeline
  private clients = new Map<string, Client>()

  constructor(config: ComposedClientConfig | AdvancedConfig) {
    this.servers = config.servers
    if ('router' in config) {
      const adv = config as AdvancedConfig
      this.router = adv.router
      this.pipeline = adv.pipeline
    } else {
      const flat = config as ComposedClientConfig
      this.router = new Router(flat.routing)
      this.pipeline = new MiddlewarePipeline(flat.middleware)
    }
  }

  async connect(): Promise<void> {
    for (const serverConfig of this.servers) {
      const client = await this.resolveClient(serverConfig)
      this.clients.set(serverConfig.name, client)
      const { tools } = await client.listTools()
      this.router.register(
        serverConfig.name,
        tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema as Record<string, unknown>,
        }))
      )
    }
  }

  async disconnect(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.close()
    }
    this.clients.clear()
  }

  listTools(): ToolDefinition[] {
    return this.router.listTools()
  }

  async callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
    const serverName = this.router.resolve(name)
    const tool = this.router.listTools().find(t => t.name === name)!

    try {
      tool.zodSchema.parse(args)
    } catch (err) {
      if (err instanceof ZodError) throw new ToolValidationError(name, err)
      throw err
    }

    const ctx = {
      toolName: name,
      serverName,
      args,
      result: undefined as unknown,
      meta: {} as Record<string, unknown>,
    }

    const mcpClient = this.clients.get(serverName)!
    await this.pipeline.execute(ctx, async () => {
      ctx.result = await mcpClient.callTool({ name, arguments: ctx.args })
    })

    return ctx.result as T
  }

  getRouter(): Router {
    return this.router
  }

  getPipeline(): MiddlewarePipeline {
    return this.pipeline
  }

  private async resolveClient(config: ServerConfig): Promise<Client> {
    if (config.type === 'client') return config.client

    const client = new Client({ name: 'mcp-compose', version: '1.0.0' })

    if (config.type === 'stdio') {
      const transport = new StdioClientTransport({ command: config.command, args: config.args })
      await client.connect(transport)
    } else {
      const transport = new StreamableHTTPClientTransport(
        new URL(config.url),
        config.headers ? { requestInit: { headers: config.headers } } : undefined,
      )
      await client.connect(transport)
    }

    return client
  }
}
