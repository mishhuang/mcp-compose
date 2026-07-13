# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-13

### Added
- `ComposedClient` — connects to multiple MCP servers and presents a unified tool surface
- `Router` — resolves tool names to servers with `strict` (default) and `first-wins` conflict strategies, plus explicit per-tool assignments via `routing.assignments`
- `MiddlewarePipeline` — onion-style middleware for logging, auth, retries, and other cross-cutting concerns
- Zod validation on all `callTool()` calls via automatic JSON Schema → Zod conversion
- Named error classes: `ToolConflictError`, `ToolNotFoundError`, `ToolValidationError`
- Transport support: `stdio` (subprocess), `http` (StreamableHTTP), and pre-built `client` instances
- Generic `callTool<T>()` for typed return values without a cast at the call site
- Dual CJS/ESM output with full TypeScript declarations
