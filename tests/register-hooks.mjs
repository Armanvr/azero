// Test-only module resolution: maps '@/', extensionless TS imports, and replaces DB + next/headers with in-memory stubs.
// No real database is ever touched.
import { register } from 'node:module'

register(new URL('./hooks.mjs', import.meta.url))
