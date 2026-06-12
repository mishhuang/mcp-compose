import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ComposedClient } from '../index.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ECHO_SERVER = resolve(__dirname, 'fixtures/echo-server.mts')

describe('ComposedClient — stdio integration', () => {
  it('connects to a real stdio server, lists tools, calls a tool, and disconnects', async () => {
    const client = new ComposedClient({
      servers: [
        {
          name: 'echo',
          type: 'stdio',
          command: 'node',
          args: ['--experimental-strip-types', ECHO_SERVER],
        },
      ],
    })

    await client.connect()

    const tools = client.listTools()
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe('echo')
    expect(tools[0].serverName).toBe('echo')

    const result = await client.callTool('echo', { message: 'hello' }) as {
      content: Array<{ type: string; text: string }>
    }
    expect(result.content[0].text).toBe('hello')

    await client.disconnect()
  }, 15000)
})
