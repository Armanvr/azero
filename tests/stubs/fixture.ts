import { readFileSync } from 'node:fs'

/** A real Blizzard response saved (and trimmed) in tests/fixtures/bnet. A fresh copy each time: tests edit it. */
export const fixture = (name: string) =>
	JSON.parse(readFileSync(new URL(`../fixtures/bnet/${name}.json`, import.meta.url), 'utf8'))
