import { describe, it, expect } from 'vitest'
import { Router } from '../router.js'
import { ToolConflictError, ToolNotFoundError } from '../errors.js'

function rawTool(name: string) {
  return {
    name,
    description: `Tool ${name}`,
    inputSchema: { type: 'object', properties: {} as Record<string, unknown>, required: [] as string[] },
  }
}

describe('Router', () => {
  describe('register()', () => {
    it('registers tools from a server and makes them listable', () => {
      const router = new Router()
      router.register('srv', [rawTool('ping')])
      expect(router.listTools().map(t => t.name)).toContain('ping')
    })

    it('attaches serverName and zodSchema to registered tools', () => {
      const router = new Router()
      router.register('srv', [rawTool('ping')])
      const tool = router.listTools().find(t => t.name === 'ping')!
      expect(tool.serverName).toBe('srv')
      expect(tool.zodSchema).toBeDefined()
    })

    it('throws ToolConflictError in strict mode when two servers expose the same tool', () => {
      const router = new Router({ defaultStrategy: 'strict' })
      router.register('srv1', [rawTool('read')])
      expect(() => router.register('srv2', [rawTool('read')])).toThrow(ToolConflictError)
    })

    it('strict mode is the default', () => {
      const router = new Router()
      router.register('srv1', [rawTool('read')])
      expect(() => router.register('srv2', [rawTool('read')])).toThrow(ToolConflictError)
    })

    it('uses first-wins when defaultStrategy is "first-wins"', () => {
      const router = new Router({ defaultStrategy: 'first-wins' })
      router.register('srv1', [rawTool('read')])
      router.register('srv2', [rawTool('read')])
      expect(router.resolve('read')).toBe('srv1')
    })

    it('explicit assignment determines which server owns the tool', () => {
      const router = new Router({ assignments: { read: 'srv2' } })
      router.register('srv1', [rawTool('read')])
      router.register('srv2', [rawTool('read')])
      expect(router.resolve('read')).toBe('srv2')
    })

    it('a non-assigned server does not register a tool assigned to another server', () => {
      const router = new Router({ assignments: { read: 'srv2' } })
      router.register('srv1', [rawTool('read')])
      expect(router.listTools().map(t => t.name)).not.toContain('read')
    })

    it('merges tools from multiple servers', () => {
      const router = new Router()
      router.register('a', [rawTool('ping')])
      router.register('b', [rawTool('echo')])
      expect(router.listTools().map(t => t.name)).toEqual(expect.arrayContaining(['ping', 'echo']))
    })
  })

  describe('resolve()', () => {
    it('returns the serverName for a registered tool', () => {
      const router = new Router()
      router.register('srv', [rawTool('ping')])
      expect(router.resolve('ping')).toBe('srv')
    })

    it('throws ToolNotFoundError for an unknown tool name', () => {
      const router = new Router()
      expect(() => router.resolve('ghost')).toThrow(ToolNotFoundError)
    })
  })
})
