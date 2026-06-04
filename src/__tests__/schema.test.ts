import { describe, it, expect } from 'vitest'
import { jsonSchemaToZod } from '../schema.js'

describe('jsonSchemaToZod', () => {
  it('accepts a valid object matching the schema', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'number' } },
      required: ['name'],
    })
    expect(() => schema.parse({ name: 'Alice', age: 30 })).not.toThrow()
  })

  it('rejects an object missing a required field', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    })
    expect(() => schema.parse({})).toThrow()
  })

  it('accepts an object with an optional field absent', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: { name: { type: 'string' }, bio: { type: 'string' } },
      required: ['name'],
    })
    expect(() => schema.parse({ name: 'Alice' })).not.toThrow()
  })

  it('validates boolean properties', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: { active: { type: 'boolean' } },
      required: ['active'],
    })
    expect(() => schema.parse({ active: true })).not.toThrow()
    expect(() => schema.parse({ active: 'yes' })).toThrow()
  })

  it('validates integer properties', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: { count: { type: 'integer' } },
      required: ['count'],
    })
    expect(() => schema.parse({ count: 3 })).not.toThrow()
    expect(() => schema.parse({ count: 3.5 })).toThrow()
  })

  it('validates array properties with typed items', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: { tags: { type: 'array', items: { type: 'string' } } },
      required: ['tags'],
    })
    expect(() => schema.parse({ tags: ['a', 'b'] })).not.toThrow()
    expect(() => schema.parse({ tags: [1, 2] })).toThrow()
  })

  it('validates nested object properties', () => {
    const schema = jsonSchemaToZod({
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
      required: ['user'],
    })
    expect(() => schema.parse({ user: { id: 'abc' } })).not.toThrow()
    expect(() => schema.parse({ user: {} })).toThrow()
  })

  it('handles an empty schema as a permissive object', () => {
    const schema = jsonSchemaToZod({})
    expect(() => schema.parse({})).not.toThrow()
    expect(() => schema.parse({ anything: 'goes' })).not.toThrow()
  })
})
