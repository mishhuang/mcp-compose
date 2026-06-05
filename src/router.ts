import type { ToolDefinition, RoutingConfig } from './types.js'
import { ToolConflictError, ToolNotFoundError } from './errors.js'
import { jsonSchemaToZod } from './schema.js'

type RawTool = {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
}

export class Router {
  private toolMap = new Map<string, string>()
  private toolDefs = new Map<string, ToolDefinition>()
  private assignments: Record<string, string>
  private defaultStrategy: 'strict' | 'first-wins'

  constructor(config: RoutingConfig = {}) {
    this.assignments = config.assignments ?? {}
    this.defaultStrategy = config.defaultStrategy ?? 'strict'
  }

  register(serverName: string, tools: RawTool[]): void {
    for (const tool of tools) {
      const assigned = this.assignments[tool.name]

      if (assigned !== undefined) {
        if (assigned !== serverName) continue
        this.setTool(serverName, tool)
        continue
      }

      if (this.toolMap.has(tool.name)) {
        if (this.defaultStrategy === 'strict') {
          throw new ToolConflictError(tool.name, this.toolMap.get(tool.name)!, serverName)
        }
        continue
      }

      this.setTool(serverName, tool)
    }
  }

  resolve(toolName: string): string {
    const serverName = this.toolMap.get(toolName)
    if (!serverName) throw new ToolNotFoundError(toolName)
    return serverName
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.toolDefs.values())
  }

  private setTool(serverName: string, tool: RawTool): void {
    const zodSchema = jsonSchemaToZod(tool.inputSchema)
    this.toolMap.set(tool.name, serverName)
    this.toolDefs.set(tool.name, { ...tool, serverName, zodSchema })
  }
}
