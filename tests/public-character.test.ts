import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { GET } from '@/app/api/characters/public/[realm]/[name]/route'
import { searchCache } from '@/tests/stubs/db'
import { calls, mockFetch, restoreFetch, tokenRoute } from '@/tests/stubs/fetch'

process.env.BNET_CLIENT_ID = 'id'
process.env.BNET_CLIENT_SECRET = 'secret'

const summary = {
	name: 'Élise',
	level: 90,
	realm: { name: 'Archimonde', slug: 'archimonde' },
	character_class: { id: 8 },
	race: { name: 'Elfe de sang' },
	active_spec: { name: 'Givre' },
	active_title: { display_string: '{name} le Brave' },
	guild: { name: 'Les Tests' },
	faction: { type: 'HORDE' },
	equipped_item_level: 701,
	last_login_timestamp: 1763300000000,
}
const media = {
	assets: [
		{ key: 'avatar', value: 'https://render.example/avatar.jpg' },
		{ key: 'main-raw', value: 'https://render.example/main-raw.png' },
	],
}
const statistics = { intellect: { effective: 9000 }, stamina: { effective: 80000 }, mastery: { value: 20 } }
const equipment = { equipped_items: [] }

const realmIndex = {
	realms: [
		{ slug: 'archimonde', name: { fr_FR: 'Archimonde' } },
		{ slug: 'chants-eternels', name: { fr_FR: 'Chants éternels' } },
		{ slug: 'kaelthas', name: { fr_FR: "Kael'thas" } },
		{ slug: 'arakarahm', name: { fr_FR: 'Arak-arahm' } },
	],
}

const happy = () => [
	tokenRoute,
	{ match: /\/data\/wow\/realm\/index/, reply: { body: realmIndex } },
	{ match: /character-media/, reply: { body: media } },
	{ match: /\/equipment/, reply: { body: equipment } },
	{ match: /\/statistics/, reply: { body: statistics } },
	{ match: /\/profile\/wow\/character\/[^/]+\/[^/?]+\?/, reply: { body: summary } },
]

const call = (realm: string, name: string) =>
	GET(new Request('http://localhost/x'), { params: Promise.resolve({ realm, name }) })
const apiCalls = () => calls.filter((u) => u.includes('/profile/wow/'))

// Run first: the token and the realm index are cached at module level once obtained.
test('no Battle.net token: 503 with the Battle.net message, not a 404 "Personnage introuvable"', async () => {
	mockFetch([{ match: /oauth\.battle\.net/, reply: { status: 401 } }])
	const res = await call('hyjal', 'jaina')
	assert.equal(res.status, 503)
	assert.deepEqual(await res.json(), { error: 'Battle.net est indisponible. Réessayez dans un instant.' })
	await new Promise((r) => setImmediate(r))
	assert.equal(searchCache.length, 0)
})

beforeEach(() => {
	searchCache.length = 0
})
afterEach(restoreFetch)

// Also warms the realm index: the tests below see a stable set of upstream calls
test('a cold process asks Blizzard for the realm index once before the character', async () => {
	mockFetch(happy())
	assert.equal((await call('archimonde', 'elise')).status, 200)
	assert.equal(calls.filter((u) => u.includes('/data/wow/realm/index')).length, 1)
	assert.equal(apiCalls().length, 4)
})

test('returns level, renderUrl, lastLogin and stats when Blizzard provides them', async () => {
	mockFetch(happy())
	const { character, cached } = await (await call('archimonde', 'elise')).json()
	assert.equal(cached, undefined)
	assert.equal(character.level, 90)
	assert.equal(character.renderUrl, 'https://render.example/main-raw.png')
	assert.equal(character.lastLogin, 1763300000000)
	assert.deepEqual(character.stats.primary[0], { label: 'Intelligence', value: 9000 })
	assert.equal(character.avatarUrl, 'https://render.example/avatar.jpg')
	assert.equal(character.class, 'Mage')
	assert.equal(character.faction, 'horde')
})

test('renderUrl, lastLogin and stats are absent (not null/0) when Blizzard omits them', async () => {
	const { last_login_timestamp, ...noLogin } = summary
	mockFetch([
		tokenRoute,
		{ match: /character-media/, reply: { body: { assets: [{ key: 'avatar', value: 'a' }] } } },
		{ match: /\/equipment/, reply: { body: equipment } },
		{ match: /\/statistics/, reply: { status: 404, body: {} } },
		{ match: /\/profile\/wow\//, reply: { body: noLogin } },
	])
	const { character } = await (await call('archimonde', 'elise')).json()
	assert.equal(character.name, 'Élise')
	for (const k of ['renderUrl', 'lastLogin', 'stats']) assert.equal(k in character, false, k)
})

test('a /statistics call that throws does not fail the response', async () => {
	mockFetch([{ match: /\/statistics/, reply: new Error('socket hang up') }, ...happy()])
	const res = await call('archimonde', 'elise')
	assert.equal(res.status, 200)
	assert.equal('stats' in (await res.json()).character, false)
})

test('a /statistics call that returns 500 does not fail the response', async () => {
	mockFetch([{ match: /\/statistics/, reply: { status: 500 } }, ...happy()])
	assert.equal((await call('archimonde', 'elise')).status, 200)
})

test('character not found on Blizzard is a 404, cached as null for 5 minutes', async () => {
	mockFetch([tokenRoute, { match: /\/profile\/wow\//, reply: { status: 404 } }])
	const res = await call('archimonde', 'nobody')
	assert.equal(res.status, 404)
	assert.deepEqual(await res.json(), { error: 'Personnage introuvable' })
	await new Promise((r) => setImmediate(r))
	assert.equal(searchCache.length, 1)
	assert.equal(searchCache[0].character, null)
	const ttl = (searchCache[0].expiresAt as Date).getTime() - Date.now()
	assert.ok(ttl > 4 * 60_000 && ttl <= 5 * 60_000, `ttl ${ttl}`)
})

test('a cached 404 answers 404 without calling Blizzard', async () => {
	searchCache.push({
		realm: 'archimonde',
		name: 'nobody',
		region: 'eu',
		expiresAt: new Date(Date.now() + 60_000),
		character: null,
	})
	mockFetch([])
	const res = await call('archimonde', 'nobody')
	assert.equal(res.status, 404)
	assert.equal(calls.length, 0)
})

test('an expired negative cache entry is ignored and Blizzard is asked again', async () => {
	searchCache.push({
		realm: 'archimonde',
		name: 'elise',
		region: 'eu',
		expiresAt: new Date(Date.now() - 1000),
		character: null,
	})
	mockFetch(happy())
	assert.equal((await call('archimonde', 'elise')).status, 200)
})

test('upstream failures answer 502 with the Battle.net message and are never cached', async () => {
	for (const status of [429, 500, 403]) {
		mockFetch([tokenRoute, { match: /\/profile\/wow\//, reply: { status } }])
		const res = await call('archimonde', 'elise')
		assert.equal(res.status, 502, `status ${status}`)
		assert.deepEqual(await res.json(), { error: 'Battle.net est indisponible. Réessayez dans un instant.' })
	}
	mockFetch([tokenRoute, { match: /\/profile\/wow\//, reply: new Error('ETIMEDOUT') }])
	assert.equal((await call('archimonde', 'elise')).status, 502)
	await new Promise((r) => setImmediate(r))
	assert.equal(searchCache.length, 0)
})

test('only the summary decides the status: failing media, equipment and statistics degrade', async () => {
	mockFetch([
		tokenRoute,
		{ match: /character-media/, reply: { status: 500 } },
		{ match: /\/equipment/, reply: { status: 429 } },
		{ match: /\/statistics/, reply: new Error('timeout') },
		{ match: /\/profile\/wow\//, reply: { body: summary } },
	])
	const res = await call('archimonde', 'elise')
	assert.equal(res.status, 200)
	const { character } = await res.json()
	assert.equal(character.name, 'Élise')
	assert.deepEqual([character.slotsLeft, character.slotsRight, character.slotsWeapon], [[], [], []])
	for (const k of ['renderUrl', 'stats']) assert.equal(k in character, false, k)
})

test('the character no longer carries a color', async () => {
	mockFetch(happy())
	assert.equal('color' in (await (await call('archimonde', 'elise')).json()).character, false)
})

test('realm is turned into the Blizzard slug and name lowercased + URL-encoded in every upstream path', async () => {
	mockFetch(happy())
	await call('Chants éternels', 'ÉLISE')
	const urls = apiCalls()
	assert.equal(urls.length, 4)
	for (const u of urls) assert.match(u, /\/character\/chants-eternels\/%C3%A9lise(\/|\?)/, u)
})

test('a realm typed with its real name is resolved to the Blizzard slug (Arak-arahm → arakarahm)', async () => {
	mockFetch(happy())
	await call('Arak-arahm', 'elise')
	for (const u of apiCalls()) assert.match(u, /\/character\/arakarahm\/elise(\/|\?)/, u)
	await new Promise((r) => setImmediate(r))
	assert.equal(searchCache[0].realm, 'arakarahm')
})

test('the cache key uses the realm slug, so every spelling of a realm shares one entry', async () => {
	mockFetch(happy())
	await call("Kael'thas", 'elise')
	await new Promise((r) => setImmediate(r))
	assert.equal(searchCache[0].realm, 'kaelthas')
	mockFetch([])
	assert.equal((await (await call('kaelthas', 'Elise')).json()).cached, true)
	assert.equal(calls.length, 0)
})

test('an unknown realm is looked up by its slug, and realm or name cannot change the upstream path or query', async () => {
	mockFetch(happy())
	await call('arch/../../x', 'a?b=c#d')
	assert.equal(apiCalls().length, 4)
	for (const u of apiCalls()) {
		assert.match(u, /\/character\/archx\/a%3Fb%3Dc%23d(\/|\?)/, u)
		assert.equal(new URL(u).searchParams.get('namespace'), 'profile-eu')
		assert.equal(new URL(u).searchParams.has('b'), false)
	}
})

test('a successful fetch is cached under the lowercased realm/name', async () => {
	mockFetch(happy())
	await call('Archimonde', 'ELISE')
	await new Promise((r) => setImmediate(r))
	assert.equal(searchCache.length, 1)
	assert.deepEqual([searchCache[0].realm, searchCache[0].name, searchCache[0].region], ['archimonde', 'elise', 'eu'])
})

test('a cache hit returns the cached character without calling Blizzard', async () => {
	searchCache.push({
		realm: 'archimonde',
		name: 'elise',
		region: 'eu',
		expiresAt: new Date(Date.now() + 60_000),
		character: { name: 'FromCache', level: 90 },
	})
	mockFetch([])
	const body = await (await call('Archimonde', 'Elise')).json()
	assert.equal(body.cached, true)
	assert.equal(body.character.name, 'FromCache')
	assert.equal(calls.length, 0)
})

test('an expired cache entry is ignored and Blizzard is called again', async () => {
	searchCache.push({
		realm: 'archimonde',
		name: 'elise',
		region: 'eu',
		expiresAt: new Date(Date.now() - 1000),
		character: { name: 'Stale' },
	})
	mockFetch(happy())
	const body = await (await call('archimonde', 'elise')).json()
	assert.equal(body.character.name, 'Élise')
})

test('a network error on the equipment call does not turn into an unhandled 500', async () => {
	mockFetch([{ match: /\/equipment/, reply: new Error('ECONNRESET') }, ...happy()])
	const res = await call('archimonde', 'elise').catch((e) => e)
	assert.ok(res instanceof Response, `handler threw: ${res}`)
	assert.ok(res.status < 500, `status ${res.status}`)
})

test('an unexpected error is logged server-side before the 502', async (t) => {
	const logged = t.mock.method(console, 'error', () => {})
	mockFetch([{ match: /\/equipment/, reply: { body: { equipped_items: 'not a list' } } }, ...happy()])
	const res = await call('archimonde', 'elise')
	assert.equal(res.status, 502)
	assert.ok(logged.mock.calls.some((c) => c.arguments[0] === 'public character' && c.arguments[1] instanceof Error))
})
