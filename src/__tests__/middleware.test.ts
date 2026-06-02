import { describe, it, expect, vi } from 'vitest'
import { MiddlewarePipeline } from '../middleware.js'
import type { ToolContext } from '../types.js'

function makeCtx(): ToolContext {
  return { toolName: 'test', serverName: 'srv', args: {}, result: undefined, meta: {} }
}

describe('MiddlewarePipeline', () => {
  it('calls handler when no middleware is registered', async () => {
    const pipeline = new MiddlewarePipeline()
    const handler = vi.fn(async () => {})
    await pipeline.execute(makeCtx(), handler)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('runs middleware in onion order: outer before → inner before → handler → inner after → outer after', async () => {
    const order: string[] = []
    const pipeline = new MiddlewarePipeline([
      async (ctx, next) => { order.push('m1 before'); await next(); order.push('m1 after') },
      async (ctx, next) => { order.push('m2 before'); await next(); order.push('m2 after') },
    ])
    await pipeline.execute(makeCtx(), async () => { order.push('handler') })
    expect(order).toEqual(['m1 before', 'm2 before', 'handler', 'm2 after', 'm1 after'])
  })

  it('ctx.args mutations by middleware are visible to the handler', async () => {
    const pipeline = new MiddlewarePipeline([
      async (ctx, next) => { ctx.args = { injected: true }; await next() },
    ])
    const ctx = makeCtx()
    let seen: Record<string, unknown> = {}
    await pipeline.execute(ctx, async () => { seen = ctx.args })
    expect(seen).toEqual({ injected: true })
  })

  it('ctx.result set by handler is visible to middleware after await next()', async () => {
    const pipeline = new MiddlewarePipeline([
      async (ctx, next) => { await next(); expect(ctx.result).toBe('pong') },
    ])
    const ctx = makeCtx()
    await pipeline.execute(ctx, async () => { ctx.result = 'pong' })
  })

  it('errors thrown inside the handler propagate out of execute()', async () => {
    const pipeline = new MiddlewarePipeline([
      async (ctx, next) => { await next() },
    ])
    await expect(
      pipeline.execute(makeCtx(), async () => { throw new Error('boom') })
    ).rejects.toThrow('boom')
  })

  it('errors thrown by middleware propagate out of execute()', async () => {
    const pipeline = new MiddlewarePipeline([
      async (_ctx, _next) => { throw new Error('mw error') },
    ])
    await expect(
      pipeline.execute(makeCtx(), async () => {})
    ).rejects.toThrow('mw error')
  })

  it('use() appends middleware after construction', async () => {
    const pipeline = new MiddlewarePipeline()
    const order: string[] = []
    pipeline.use(async (ctx, next) => { order.push('added'); await next() })
    await pipeline.execute(makeCtx(), async () => { order.push('handler') })
    expect(order).toEqual(['added', 'handler'])
  })
})
