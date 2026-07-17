import { z } from 'zod'
import type { ZodTypeAny } from 'zod'

type JsonSchemaProp = {
  type?: string
  enum?: unknown[]
  items?: JsonSchemaProp
  properties?: Record<string, JsonSchemaProp>
  required?: string[]
}

function propToZod(prop: JsonSchemaProp): ZodTypeAny {
  if (prop.enum !== undefined) {
    const vals = prop.enum
    if (vals.length === 0) return z.never()
    if (vals.length === 1) return z.literal(vals[0] as string | number | boolean)
    if (vals.every((v): v is string => typeof v === 'string')) {
      return z.enum(vals as [string, ...string[]])
    }
    const literals = vals.map(v => z.literal(v as string | number | boolean))
    return z.union(literals as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]])
  }
  switch (prop.type) {
    case 'string':  return z.string()
    case 'number':  return z.number()
    case 'integer': return z.number().int()
    case 'boolean': return z.boolean()
    case 'array':   return z.array(prop.items ? propToZod(prop.items) : z.unknown())
    case 'object':  return buildObject(prop)
    default:        return z.unknown()
  }
}

function buildObject(schema: JsonSchemaProp): ZodTypeAny {
  if (!schema.properties) return z.record(z.string(), z.unknown())
  const required = new Set(schema.required ?? [])
  const shape: Record<string, ZodTypeAny> = {}
  for (const [key, prop] of Object.entries(schema.properties)) {
    shape[key] = required.has(key) ? propToZod(prop) : propToZod(prop).optional()
  }
  return z.object(shape)
}

export function jsonSchemaToZod(schema: Record<string, unknown>): ZodTypeAny {
  return buildObject(schema as JsonSchemaProp)
}
