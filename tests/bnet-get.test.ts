import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { bnetGet, getBnetClientToken } from '@/lib/services/bnetToken'

process.env.BNET_CLIENT_ID = 'the-id'
process.env.BNET_CLIENT_SECRET = 'the-secret'

const realFetch = globalThis.fetch
const realError = console.error
let tokensIssued = 0
let logged: unknown[][] = []
const seenSignals: Array<AbortSignal | null | undefined> = []

// Token n is "tok-n"; the API rejects "tok-1" with 401 and accepts anything else
const install = (api: (auth: string) => Response | Error) => {
	globalThis.fetch = (async (url: string, init?: RequestInit) => {
		if (String(url).includes('oauth.battle.net')) {
			return Response.json({ access_token: `tok-${++tokensIssued}`, expires_in: 86400 })
		}
		seenSignals.push(init?.signal)
		const r = api(String((init?.headers as Record<string, string> | undefined)?.Authorization))
		if (r instanceof Error) throw r
		return r
	}) as typeof fetch
}

beforeEach(() => {
	tokensIssued = 0
	logged = []
	seenSignals.length = 0
	console.error = (...a: unknown[]) => void logged.push(a)
})
afterEach(() => {
	globalThis.fetch = realFetch
	console.error = realError
})

// Tests share the module-level token cache and run in order: the first one obtains tok-1.
test('a cached token rejected with 401 is dropped and the call is retried once with a fresh one', async () => {
	install((auth) => (auth === 'Bearer tok-1' ? new Response('{}', { status: 401 }) : Response.json({ ok: 1 })))
	const token = await getBnetClientToken()
	assert.equal(token, 'tok-1')
	const res = await bnetGet('https://eu.api.blizzard.com/x?namespace=profile-eu', token as string)
	assert.deepEqual(res, { status: 200, data: { ok: 1 } })
	assert.equal(await getBnetClientToken(), 'tok-2', 'the fresh token replaces the poisoned one')
	assert.equal(tokensIssued, 2)
})

test('a 401 that persists is reported once, not retried forever', async () => {
	install(() => new Response('{}', { status: 401 }))
	const res = await bnetGet('https://eu.api.blizzard.com/x', 'tok-2')
	assert.equal(res.status, 401)
	assert.equal(res.data, null)
	assert.equal(seenSignals.length, 2)
})

test('network errors become a 5xx-like result instead of throwing', async () => {
	install(() => new Error('ECONNRESET'))
	const res = await bnetGet('https://eu.api.blizzard.com/x', 'tok-3')
	assert.ok(res.status >= 500)
	assert.equal(res.data, null)
})

test('every Blizzard call has a timeout signal', async () => {
	install(() => Response.json({}))
	await bnetGet('https://eu.api.blizzard.com/x', 'tok-3')
	assert.ok(seenSignals[0] instanceof AbortSignal)
})

test('non-404 failures are logged with status and URL path only; 404 and success are silent', async () => {
	install(() => new Response('{}', { status: 429 }))
	await bnetGet(
		'https://eu.api.blizzard.com/profile/wow/character/a/b?namespace=profile-eu&locale=fr_FR',
		'tok-secret',
	)
	assert.deepEqual(logged, [['bnet', 429, '/profile/wow/character/a/b']])
	assert.ok(!JSON.stringify(logged).includes('tok-secret'))
	assert.ok(!JSON.stringify(logged).includes('namespace'))

	logged = []
	install(() => new Response('{}', { status: 404 }))
	assert.equal((await bnetGet('https://eu.api.blizzard.com/x', 'tok-3')).status, 404)
	install(() => Response.json({}))
	await bnetGet('https://eu.api.blizzard.com/x', 'tok-3')
	assert.deepEqual(logged, [])
})
