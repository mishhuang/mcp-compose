import type { Middleware, ToolContext } from './types.js'

export class MiddlewarePipeline {
  private middleware: Middleware[]

  constructor(middleware: Middleware[] = []) {
    this.middleware = [...middleware]
  }

  use(fn: Middleware): void {
    this.middleware.push(fn)
  }

  async execute(ctx: ToolContext, handler: () => Promise<void>): Promise<void> {
    let fn = handler
    for (let i = this.middleware.length - 1; i >= 0; i--) {
      const next = fn
      const mw = this.middleware[i]
      fn = () => mw(ctx, next)
    }
    await fn()
  }
}
