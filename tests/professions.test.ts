import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { GET as listCharacters } from '@/app/api/characters/route'
import { GET as professions } from '@/app/api/professions/route'
import { createSessionToken } from '@/lib/auth'
import { characters, store, updates } from '@/tests/stubs/db'
import { calls, mockFetch, restoreFetch, tokenRoute } from '@/tests/stubs/fetch'
import { cookieJar } from '@/tests/stubs/headers'

process.env.BNET_CLIENT_ID = 'id'
process.env.BNET_CLIENT_SECRET = 'secret'

const HOUR = 60 * 60 * 1000
const char = (name: string, over: Record<string, unknown> = {}) => ({
	_id: `id-${name}`,
	userId: 'u1',
	name,
	realm: 'Archimonde',
	realmSlug: 'archimonde',
	classId: 4,
	className: 'Voleur',
	raceId: 1,
	raceName: 'Humain',
	level: 90,
	faction: 'alliance',
	fetchedAt: '2026-01-01',
	spec: 'Assassinat',
	...over,
})

// Shaped like Blizzard's /profile/wow/character/{realm}/{name}/professions
const tier = (id: number, skill: number, max: number) => ({
	skill_points: skill,
	max_skill_points: max,
	tier: { id, name: `T${id}` },
})
const blizzardProfessions = {
	primaries: [
		{
			profession: { name: 'Forge', id: 164 },
			tiers: [tier(2822, 100, 100), tier(2854, 55, 100), tier(2437, 75, 75)],
		},
		{ profession: { name: 'Minage', id: 186 }, tiers: [tier(2570, 10, 100)] },
	],
	secondaries: [{ profession: { name: 'Cuisine', id: 185 }, tiers: [tier(2546, 90, 100)] }],
}

const login = async (userId = 'u1') => {
	cookieJar.set('azero_session', await createSessionToken({ id: userId, email: 'a@b.fr', username: 'A' } as never))
}
const get = async () => (await professions()).json()
const profUrls = () => calls.filter((u) => u.includes('/professions?'))

beforeEach(async () => {
	store.length = 0
	characters.length = 0
	updates.length = 0
	cookieJar.clear()
	mockFetch([tokenRoute, { match: /\/professions\?/, reply: { body: blizzardProfessions } }])
})
afterEach(restoreFetch)

test('401 without a session, and no Blizzard call', async () => {
	characters.push(char('Arman'))
	const res = await professions()
	assert.equal(res.status, 401)
	assert.equal(calls.length, 0)
})

test('401 with a garbage session cookie', async () => {
	cookieJar.set('azero_session', 'nope')
	assert.equal((await professions()).status, 401)
})

test('a user with no characters gets { characters: [] } and no Blizzard call', async () => {
	await login()
	assert.deepEqual(await get(), { characters: [] })
	assert.equal(calls.length, 0)
})

test('only primary professions are returned, at the tier with the highest id', async () => {
	await login()
	characters.push(char('Arman'))
	const { characters: out } = await get()
	assert.deepEqual(out[0].professions, [
		{ name: 'Forge', tier: 2854, skill: 55, max: 100 },
		{ name: 'Minage', tier: 2570, skill: 10, max: 100 },
	])
})

test('a primary without tiers is skipped', async () => {
	await login()
	characters.push(char('Arman'))
	mockFetch([
		tokenRoute,
		{
			match: /professions\?/,
			reply: {
				body: { primaries: [{ profession: { name: 'Forge' }, tiers: [] }, { profession: { name: 'Minage' } }] },
			},
		},
	])
	assert.deepEqual((await get()).characters[0].professions, [])
})

test('the character entry has id, name, realmSlug, class, spec and level', async () => {
	await login()
	characters.push(char('Arman'))
	const [c] = (await get()).characters
	assert.deepEqual(
		{ ...c, professions: undefined },
		{
			id: 'arman-archimonde',
			name: 'Arman',
			realmSlug: 'archimonde',
			class: 'Voleur',
			spec: 'Assassinat',
			level: 90,
			professions: undefined,
		},
	)
})

test('the upstream URL is lowercased, encoded, and uses the profile namespace', async () => {
	await login()
	characters.push(char('Élise', { realmSlug: 'chants-eternels' }))
	await get()
	const [u] = profUrls()
	assert.match(u, /\/character\/chants-eternels\/%C3%A9lise\/professions\?/)
	assert.equal(new URL(u).searchParams.get('namespace'), 'profile-eu')
})

test('a character whose Blizzard call fails gets professions: [] and is NOT cached', async () => {
	await login()
	characters.push(char('Arman'))
	mockFetch([tokenRoute, { match: /professions\?/, reply: { status: 404 } }])
	const { characters: out } = await get()
	assert.deepEqual(out[0].professions, [])
	assert.equal(updates.length, 0)
	assert.equal(characters[0].professionsFetchedAt, undefined)
})

test('a network error for one character does not affect the others, and is not cached', async () => {
	await login()
	characters.push(char('Arman'), char('Bela'))
	mockFetch([
		tokenRoute,
		{ match: /character\/archimonde\/arman\/professions/, reply: new Error('ECONNRESET') },
		{ match: /professions\?/, reply: { body: blizzardProfessions } },
	])
	const { characters: out } = await get()
	assert.deepEqual(
		out.map((c: { professions: unknown[] }) => c.professions.length),
		[0, 2],
	)
	assert.deepEqual(
		updates.map((u) => u.filter._id),
		['id-Bela'],
	)
})

test('a database write failure for one character does not fail the request', async () => {
	await login()
	characters.push(char('Arman'))
	const { CharacterModel } = await import('@/lib/db')
	const original = CharacterModel.updateOne
	;(CharacterModel as { updateOne: unknown }).updateOne = async () => {
		throw new Error('mongo down')
	}
	try {
		const res = await professions()
		assert.equal(res.status, 200)
	} finally {
		;(CharacterModel as { updateOne: unknown }).updateOne = original
	}
})

test('a successful EMPTY result (no primary profession) IS cached', async () => {
	await login()
	characters.push(char('Arman'))
	mockFetch([tokenRoute, { match: /professions\?/, reply: { body: { primaries: [] } } }])
	await get()
	assert.equal(updates.length, 1)
	assert.deepEqual(updates[0].set.professions, [])
	assert.ok(typeof updates[0].set.professionsFetchedAt === 'number')
	await get()
	assert.equal(profUrls().length, 1, 'second call must use the cached empty result')
})

test('cache younger than one hour is reused without a Blizzard call', async () => {
	await login()
	const cached = [{ name: 'Alchimie', skill: 70, max: 100 }]
	characters.push(char('Arman', { professions: cached, professionsFetchedAt: Date.now() - (HOUR - 60_000) }))
	const { characters: out } = await get()
	assert.deepEqual(out[0].professions, cached)
	assert.equal(calls.length, 0, 'not even the OAuth token should be requested')
})

test('cache older than one hour is refreshed and rewritten', async () => {
	await login()
	characters.push(
		char('Arman', {
			professions: [{ name: 'Old', skill: 1, max: 1 }],
			professionsFetchedAt: Date.now() - HOUR - 1000,
		}),
	)
	const before = Date.now()
	const { characters: out } = await get()
	assert.equal(out[0].professions[0].name, 'Forge')
	assert.equal(profUrls().length, 1)
	assert.ok((characters[0].professionsFetchedAt as number) >= before)
})

test('a stale cache is shown as is when Blizzard fails, and not refreshed (the next request retries)', async () => {
	await login()
	const old = [{ name: 'Old', tier: 1, skill: 1, max: 1 }]
	characters.push(char('Arman', { professions: old, professionsFetchedAt: Date.now() - 2 * HOUR }))
	mockFetch([tokenRoute, { match: /professions\?/, reply: { status: 503 } }])
	assert.deepEqual((await get()).characters[0].professions, old)
	assert.equal(updates.length, 0)
})

test('same set and order as GET /api/characters (favorite, then sub-favorites, then by name)', async () => {
	await login()
	store.push({ id: 'u1', email: 'a@b.fr', favoriteCharId: 'zed-archimonde', subFavoriteCharIds: ['cara-archimonde'] })
	characters.push(
		char('Bela'),
		char('Cara'),
		char('Zed'),
		char('Alma'),
		char('Lowbie', { level: 80 }),
		char('Other', { userId: 'u2' }),
	)
	const fromProfessions = (await get()).characters.map((c: { id: string }) => c.id)
	const fromCharacters = (await (await listCharacters()).json()).characters.map((c: { id: string }) => c.id)
	assert.deepEqual(fromProfessions, ['zed-archimonde', 'cara-archimonde', 'alma-archimonde', 'bela-archimonde'])
	assert.deepEqual(fromProfessions, fromCharacters)
})

test("another user's characters are never returned or fetched", async () => {
	await login('u1')
	characters.push(char('Mine'), char('Theirs', { userId: 'u2' }))
	const { characters: out } = await get()
	assert.deepEqual(
		out.map((c: { name: string }) => c.name),
		['Mine'],
	)
	assert.equal(profUrls().length, 1)
	assert.ok(!profUrls()[0].includes('theirs'))
})

test('the response never leaks internal fields (_id, userId, Blizzard payload)', async () => {
	await login()
	characters.push(char('Arman'))
	const [c] = (await get()).characters
	assert.deepEqual(Object.keys(c).sort(), ['class', 'id', 'level', 'name', 'professions', 'realmSlug', 'spec'])
})

test('Blizzard credentials missing or token failing: 200 with empty professions, nothing cached', async () => {
	await login()
	characters.push(char('Arman'))
	mockFetch([{ match: /oauth\.battle\.net/, reply: new Error('ENOTFOUND') }])
	const res = await professions()
	assert.equal(res.status, 200)
	assert.deepEqual((await res.json()).characters[0].professions, [])
	assert.equal(updates.length, 0)
})
