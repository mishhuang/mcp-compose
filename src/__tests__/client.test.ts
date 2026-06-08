import { describe, it, expect, vi } from 'vitest'
import { ComposedClient } from '../client.js'
import { Router } from '../router.js'
import { MiddlewarePipeline } from '../middleware.js'
import { ToolConflictError, ToolValidationError } from '../errors.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

function makeMockClient(
  tools: Array<{ name: string; inputSchema?: Record<string, unknown> }>,
  callResult: unknown = { content: [] }
) {
  return {
    listTools: vi.fn().mockResolvedValue({
      tools: tools.map(t => ({
        name: t.name,
        description: '',
        inputSchema: t.inputSchema ?? { type: 'object', properties: {}, required: [] },
      })),
    }),
    callTool: vi.fn().mockResolvedValue(callResult),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as Client
}

describe('ComposedClient', () => {
  describe('connect()', () => {
    it('calls listTools on each configured server', async () => {
      const mockA = makeMockClient([{ name: 'ping' }])
      const mockB = makeMockClient([{ name: 'echo' }])
      const client = new ComposedClient({
        servers: [
          { name: 'a', type: 'client', client: mockA },
          { name: 'b', type: 'client', client: mockB },
        ],
      })
      await client.connect()
      expect(mockA.listTools).toHaveBeenCalledOnce()
      expect(mockB.listTools).toHaveBeenCalledOnce()
    })

    it('throws ToolConflictError at connect time when strict conflict is detected', async () => {
      const mockA = makeMockClient([{ name: 'read' }])
      const mockB = makeMockClient([{ name: 'read' }])
      const client = new ComposedClient({
        servers: [
          { name: 'a', type: 'client', client: mockA },
          { name: 'b', type: 'client', client: mockB },
        ],
      })
      await expect(client.connect()).rejects.toThrow(ToolConflictError)
    })

    it('makes tools from all servers available after connect', async () => {
      const mockA = makeMockClient([{ name: 'ping' }])
      const mockB = makeMockClient([{ name: 'echo' }])
      const client = new ComposedClient({
        servers: [
          { name: 'a', type: 'client', client: mockA },
          { name: 'b', type: 'client', client: mockB },
        ],
      })
      await client.connect()
      const names = client.listTools().map(t => t.name)
      expect(names).toContain('ping')
      expect(names).toContain('echo')
    })
  })

  describe('callTool()', () => {
    it('routes the call to the correct server', async () => {
      const mockA = makeMockClient([{ name: 'ping' }])
      const mockB = makeMockClient([{ name: 'echo' }])
      const client = new ComposedClient({
        servers: [
          { name: 'a', type: 'client', client: mockA },
          { name: 'b', type: 'client', client: mockB },
        ],
      })
      await client.connect()
      await client.callTool('echo', {})
      expect(mockB.callTool).toHaveBeenCalledWith({ name: 'echo', arguments: {} })
      expect(mockA.callTool).not.toHaveBeenCalled()
    })

    it('throws ToolValidationError when args fail Zod validation', async () => {
      const mock = makeMockClient([{
        name: 'greet',
        inputSchema: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
      }])
      const client = new ComposedClient({
        servers: [{ name: 'srv', type: 'client', client: mock }],
      })
      await client.connect()
      await expect(client.callTool('greet', {})).rejects.toThrow(ToolValidationError)
    })

    it('runs middleware before and after the tool call', async () => {
      const order: string[] = []
      const mock = makeMockClient([{ name: 'ping' }])
      const client = new ComposedClient({
        servers: [{ name: 'srv', type: 'client', client: mock }],
        middleware: [
          async (ctx, next) => { order.push('before'); await next(); order.push('after') },
        ],
      })
      await client.connect()
      await client.callTool('ping', {})
      expect(order).toEqual(['before', 'after'])
    })

    it('returns ctx.result as set by the MCP call', async () => {
      const expected = { content: [{ type: 'text', text: 'pong' }] }
      const mock = makeMockClient([{ name: 'ping' }], expected)
      const client = new ComposedClient({
        servers: [{ name: 'srv', type: 'client', client: mock }],
      })
      await client.connect()
      const result = await client.callTool('ping', {})
      expect(result).toEqual(expected)
    })
  })

  describe('disconnect()', () => {
    it('calls close() on each connected client', async () => {
      const mockA = makeMockClient([])
      const mockB = makeMockClient([])
      const client = new ComposedClient({
        servers: [
          { name: 'a', type: 'client', client: mockA },
          { name: 'b', type: 'client', client: mockB },
        ],
      })
      await client.connect()
      await client.disconnect()
      expect(mockA.close).toHaveBeenCalledOnce()
      expect(mockB.close).toHaveBeenCalledOnce()
    })
  })

  describe('getRouter() / getPipeline()', () => {
    it('getRouter() returns a Router instance', () => {
      const client = new ComposedClient({ servers: [] })
      expect(client.getRouter()).toBeInstanceOf(Router)
    })

    it('getPipeline() returns a MiddlewarePipeline instance', () => {
      const client = new ComposedClient({ servers: [] })
      expect(client.getPipeline()).toBeInstanceOf(MiddlewarePipeline)
    })

    it('accepts pre-built Router and Pipeline via advanced constructor', () => {
      const router = new Router()
      const pipeline = new MiddlewarePipeline()
      const client = new ComposedClient({ servers: [], router, pipeline })
      expect(client.getRouter()).toBe(router)
      expect(client.getPipeline()).toBe(pipeline)
    })
  })
})
