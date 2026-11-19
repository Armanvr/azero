import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { GET as listCharacters } from '@/app/api/characters/route'
import { GET as professions } from '@/app/api/professions/route'
import { createSessionToken } from '@/lib/auth'
import type { CharacterProfession, ProfessionCharacter } from '@/lib/types'
import { bnetCache, characters, store, updates } from '@/tests/stubs/db'
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

// Shaped like Blizzard's /profile/wow/character/{realm}/{name}/professions (English names)
const tier = (id: number, skill: number, max: number, known?: Array<{ id: number; name: string }>) => ({
	skill_points: skill,
	max_skill_points: max,
	tier: { id, name: `Tier ${id}` },
	...(known ? { known_recipes: known } : {}),
})
const forgeRecipes = [
	{ id: 1, name: 'Lingot de fer' },
	{ id: 2, name: 'Épée courte' },
]
const blizzardProfessions = {
	primaries: [
		{
			profession: { name: 'Blacksmithing', id: 164 },
			tiers: [tier(2437, 75, 75), tier(2822, 100, 100, forgeRecipes), tier(2854, 55, 100)],
		},
		{ profession: { name: 'Mining', id: 186 }, tiers: [tier(2570, 10, 100)] },
	],
	secondaries: [
		{ profession: { name: 'Cooking', id: 185 }, tiers: [tier(2546, 90, 100, [{ id: 9, name: 'Ragoût' }])] },
		{
			profession: { name: 'Fishing', id: 356 },
			tiers: [tier(2592, 20, 75, [{ id: 8, name: 'Ne devrait pas sortir' }])],
		},
		{ profession: { name: 'Archaeology', id: 794 }, skill_points: 40, max_skill_points: 300 },
		{ profession: { name: 'First Aid', id: 129 }, tiers: [tier(1, 1, 1)] },
	],
}

// Static catalog (fr_FR) served by /data/wow/profession/{id}
const catalog = (id: number, name: string, type: string, tiers: Array<[number, string]>) => ({
	match: new RegExp(`/data/wow/profession/${id}\\?`),
	reply: { body: { id, name, type: { type }, skill_tiers: tiers.map(([i, n]) => ({ id: i, name: n })) } },
})
const staticRoutes = [
	catalog(164, 'Forge', 'PRIMARY', [
		[2437, 'Forge de Kul Tiras / Forge de Zandalar'],
		[2822, 'Forge de Midnight'],
		[2854, 'Forge de Khaz Algar'],
	]),
	catalog(186, 'Minage', 'PRIMARY', [[2570, 'Minage de Khaz Algar']]),
	catalog(185, 'Cuisine', 'SECONDARY', [[2546, 'Cuisine de Khaz Algar']]),
	catalog(356, 'Pêche', 'SECONDARY', [[2592, 'Pêche de Khaz Algar']]),
	catalog(794, 'Archéologie', 'SECONDARY', []),
	{ match: /\/data\/wow\/media\/profession\//, reply: { body: { assets: [] } } },
]
const profileRoute = (body: unknown = blizzardProfessions) => ({ match: /\/professions\?/, reply: { body } })

const login = async (userId = 'u1') => {
	cookieJar.set('azero_session', await createSessionToken({ id: userId, email: 'a@b.fr', username: 'A' } as never))
}
const get = async () => (await professions()).json()
const profUrls = () => calls.filter((u) => u.includes('/professions?'))
const byId = (c: ProfessionCharacter, id: number) => c.professions.find((p) => p.id === id) as CharacterProfession

beforeEach(() => {
	store.length = 0
	characters.length = 0
	updates.length = 0
	bnetCache.length = 0
	cookieJar.clear()
	mockFetch([tokenRoute, profileRoute(), ...staticRoutes])
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

test('primaries then Cuisine, Pêche and Archéologie; any other secondary (Secourisme) is never returned', async () => {
	await login()
	characters.push(char('Arman'))
	const [c] = (await get()).characters
	assert.deepEqual(
		c.professions.map((p: { id: number; kind: string }) => [p.id, p.kind]),
		[
			[164, 'primary'],
			[186, 'primary'],
			[185, 'secondary'],
			[356, 'secondary'],
			[794, 'secondary'],
		],
	)
	assert.equal(byId(c, 129), undefined)
})

test('names come from the French static catalog, tiers are sorted most recent expansion first', async () => {
	await login()
	characters.push(char('Arman'))
	const forge = byId((await get()).characters[0], 164)
	assert.equal(forge.name, 'Forge')
	assert.deepEqual(
		forge.tiers.map((t: { id: number; name: string; expansion: string; skill: number; max: number }) => [
			t.id,
			t.name,
			t.expansion,
			t.skill,
			t.max,
		]),
		[
			[2822, 'Forge de Midnight', 'Midnight', 100, 100],
			[2854, 'Forge de Khaz Algar', 'The War Within', 55, 100],
			[2437, 'Forge de Kul Tiras / Forge de Zandalar', 'Battle for Azeroth', 75, 75],
		],
	)
	assert.deepEqual(forge.tiers[0].knownRecipes, forgeRecipes)
	assert.deepEqual(forge.tiers[1].knownRecipes, [])
})

test('falls back to the profile names when the static catalog fails', async () => {
	await login()
	characters.push(char('Arman'))
	mockFetch([tokenRoute, profileRoute(), { match: /\/data\/wow\//, reply: { status: 500 } }])
	const [c] = (await get()).characters
	assert.equal(byId(c, 164).name, 'Blacksmithing')
	assert.equal(byId(c, 164).tiers[0].name, 'Tier 2437')
	assert.equal(c.professionsKnown, true)
	assert.equal(updates.length, 0, 'a degraded tree is never cached')
	assert.equal(characters[0].professionDataFetchedAt, undefined)
	await get()
	assert.equal(profUrls().length, 2, 'the next request calls Blizzard again')
})

test('a failing icon call (static data otherwise fine) is served without icon, never cached, and retried', async () => {
	await login()
	characters.push(char('Arman'))
	mockFetch([tokenRoute, profileRoute(), { match: /\/data\/wow\/media\//, reply: { status: 500 } }, ...staticRoutes])
	const [c] = (await get()).characters
	assert.equal(c.professionsKnown, true)
	assert.equal(byId(c, 164).name, 'Forge')
	assert.equal(byId(c, 164).icon, undefined)
	assert.equal(updates.length, 0)
	await get()
	assert.equal(profUrls().length, 2)
})

test('Archéologie has no tiers: skill and max on the entry, no recipes', async () => {
	await login()
	characters.push(char('Arman'))
	const arch = byId((await get()).characters[0], 794)
	assert.deepEqual(arch.tiers, [])
	assert.equal(arch.skill, 40)
	assert.equal(arch.max, 300)
	assert.equal(arch.hasRecipes, false)
})

test('Pêche keeps its tiers but no recipes, even when Blizzard sends known_recipes', async () => {
	await login()
	characters.push(char('Arman'))
	const fishing = byId((await get()).characters[0], 356)
	assert.equal(fishing.hasRecipes, false)
	assert.equal(fishing.tiers.length, 1)
	assert.equal(fishing.tiers[0].skill, 20)
	assert.deepEqual(fishing.tiers[0].knownRecipes, [])
})

test('Cuisine is a secondary with recipes and its known recipes', async () => {
	await login()
	characters.push(char('Arman'))
	const cooking = byId((await get()).characters[0], 185)
	assert.equal(cooking.kind, 'secondary')
	assert.equal(cooking.hasRecipes, true)
	assert.deepEqual(cooking.tiers[0].knownRecipes, [{ id: 9, name: 'Ragoût' }])
})

test('a tiered profession is not given the entry-level skill/max', async () => {
	await login()
	characters.push(char('Arman'))
	const forge = byId((await get()).characters[0], 164)
	assert.equal(forge.skill, undefined)
	assert.equal(forge.max, undefined)
})

test('a primary without tiers has tiers: []', async () => {
	await login()
	characters.push(char('Arman'))
	mockFetch([
		tokenRoute,
		profileRoute({ primaries: [{ profession: { name: 'Blacksmithing', id: 164 } }] }),
		...staticRoutes,
	])
	const [c] = (await get()).characters
	assert.deepEqual(c.professions[0].tiers, [])
	assert.equal(c.professionsKnown, true)
})

test('the character entry has id, name, realmSlug, class, spec, level and professionsKnown', async () => {
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
			professionsKnown: true,
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

test('a character whose Blizzard call fails and has no cache: professionsKnown false, [] and NOT cached', async () => {
	await login()
	characters.push(char('Arman'))
	mockFetch([tokenRoute, { match: /professions\?/, reply: { status: 404 } }])
	const [c] = (await get()).characters
	assert.deepEqual(c.professions, [])
	assert.equal(c.professionsKnown, false)
	assert.equal(updates.length, 0)
	assert.equal(characters[0].professionDataFetchedAt, undefined)
})

test('a document cached before the manager (old professions shape) counts as no cache: professionsKnown false', async () => {
	await login()
	characters.push(
		char('Arman', {
			professions: [{ name: 'Forge', tier: 2854, skill: 55, max: 100 }],
			professionsFetchedAt: Date.now(),
		}),
	)
	mockFetch([tokenRoute, { match: /professions\?/, reply: { status: 503 } }])
	const [c] = (await get()).characters
	assert.equal(c.professionsKnown, false)
	assert.deepEqual(c.professions, [])
})

test('Blizzard credentials missing or token failing: 200, professionsKnown false, nothing cached', async () => {
	await login()
	characters.push(char('Arman'))
	mockFetch([{ match: /oauth\.battle\.net/, reply: new Error('ENOTFOUND') }])
	const res = await professions()
	assert.equal(res.status, 200)
	const [c] = (await res.json()).characters
	assert.deepEqual(c.professions, [])
	assert.equal(c.professionsKnown, false)
	assert.equal(updates.length, 0)
})

test('a network error for one character does not affect the others, and is not cached', async () => {
	await login()
	characters.push(char('Arman'), char('Bela'))
	mockFetch([
		tokenRoute,
		{ match: /character\/archimonde\/arman\/professions/, reply: new Error('ECONNRESET') },
		profileRoute(),
		...staticRoutes,
	])
	const { characters: out } = await get()
	assert.deepEqual(
		out.map((c: { professionsKnown: boolean; professions: unknown[] }) => [
			c.professionsKnown,
			c.professions.length,
		]),
		[
			[false, 0],
			[true, 5],
		],
	)
	assert.deepEqual(
		updates.map((u) => u.filter._id),
		['id-Bela'],
	)
})

test('a database write failure does not fail the request nor hide what Blizzard answered', async () => {
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
		const [c] = (await res.json()).characters
		assert.equal(c.professionsKnown, true)
		assert.equal(c.professions.length, 5)
	} finally {
		;(CharacterModel as { updateOne: unknown }).updateOne = original
	}
})

test('a successful EMPTY result IS cached and counts as known', async () => {
	await login()
	characters.push(char('Arman'))
	mockFetch([tokenRoute, { match: /professions\?/, reply: { body: { primaries: [] } } }])
	assert.equal((await get()).characters[0].professionsKnown, true)
	assert.equal(updates.length, 1)
	assert.deepEqual(updates[0].set.professionData, [])
	assert.ok(typeof updates[0].set.professionDataFetchedAt === 'number')
	await get()
	assert.equal(profUrls().length, 1, 'second call must use the cached empty result')
})

test('the fetched tree is what gets cached, under the new field names', async () => {
	await login()
	characters.push(char('Arman'))
	const { characters: out } = await get()
	assert.deepEqual(updates[0].set.professionData, out[0].professions)
	assert.equal(updates[0].set.professions, undefined)
	assert.equal(updates[0].set.professionsFetchedAt, undefined)
})

test('cache younger than one hour is reused without a Blizzard call', async () => {
	await login()
	const cached = [{ id: 185, name: 'Cuisine', kind: 'secondary', hasRecipes: true, tiers: [] }]
	characters.push(char('Arman', { professionData: cached, professionDataFetchedAt: Date.now() - (HOUR - 60_000) }))
	const [c] = (await get()).characters
	assert.deepEqual(c.professions, cached)
	assert.equal(c.professionsKnown, true)
	assert.equal(calls.length, 0, 'not even the OAuth token should be requested')
})

test('cache older than one hour is refreshed and rewritten', async () => {
	await login()
	characters.push(
		char('Arman', {
			professionData: [{ id: 1, name: 'Old', kind: 'primary', hasRecipes: true, tiers: [] }],
			professionDataFetchedAt: Date.now() - HOUR - 1000,
		}),
	)
	const before = Date.now()
	const { characters: out } = await get()
	assert.equal(out[0].professions[0].name, 'Forge')
	assert.equal(profUrls().length, 1)
	assert.ok((characters[0].professionDataFetchedAt as number) >= before)
})

test('a stale cache is shown as is when Blizzard fails, and not refreshed (the next request retries)', async () => {
	await login()
	const old = [{ id: 1, name: 'Old', kind: 'primary', hasRecipes: true, tiers: [] }]
	characters.push(char('Arman', { professionData: old, professionDataFetchedAt: Date.now() - 2 * HOUR }))
	mockFetch([tokenRoute, { match: /professions\?/, reply: { status: 503 } }])
	const [c] = (await get()).characters
	assert.deepEqual(c.professions, old)
	assert.equal(c.professionsKnown, true)
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
	assert.deepEqual(Object.keys(c).sort(), [
		'class',
		'id',
		'level',
		'name',
		'professions',
		'professionsKnown',
		'realmSlug',
		'spec',
	])
})
