import type { ZodError } from 'zod'

export class ToolConflictError extends Error {
  constructor(toolName: string, existingServer: string, newServer: string) {
    super(
      `Tool "${toolName}" is exposed by both "${existingServer}" and "${newServer}". ` +
      `Add an explicit assignment in routing.assignments or set defaultStrategy: 'first-wins'.`
    )
    this.name = 'ToolConflictError'
  }
}

export class ToolNotFoundError extends Error {
  constructor(toolName: string) {
    super(
      `No tool named "${toolName}" is registered. ` +
      `Check that the server exposing this tool is connected.`
    )
    this.name = 'ToolNotFoundError'
  }
}

export class ToolValidationError extends Error {
  readonly zodError: ZodError

  constructor(toolName: string, zodError: ZodError) {
    super(`Invalid arguments for tool "${toolName}": ${zodError.message}`)
    this.name = 'ToolValidationError'
    this.zodError = zodError
  }
}
