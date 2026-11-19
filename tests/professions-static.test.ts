import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { GET as tierCatalog } from '@/app/api/professions/[professionId]/tiers/[tierId]/route'
import { GET as recipeIcon } from '@/app/api/professions/recipes/[id]/icon/route'
import { GET as recipe } from '@/app/api/professions/recipes/[id]/route'
import { createSessionToken } from '@/lib/auth'
import { expansionOf } from '@/lib/services/professionService'
import { bnetCache } from '@/tests/stubs/db'
import { calls, mockFetch, restoreFetch, tokenRoute } from '@/tests/stubs/fetch'
import { cookieJar } from '@/tests/stubs/headers'

process.env.BNET_CLIENT_ID = 'id'
process.env.BNET_CLIENT_SECRET = 'secret'

const login = async () => {
	cookieJar.set('azero_session', await createSessionToken({ id: 'u1', email: 'a@b.fr', username: 'A' } as never))
}
const callTier = (professionId: string, tierId: string) =>
	tierCatalog(new Request('http://x'), { params: Promise.resolve({ professionId, tierId }) })
const callRecipe = (id: string) => recipe(new Request('http://x'), { params: Promise.resolve({ id }) })
const callIcon = (id: string) => recipeIcon(new Request('http://x'), { params: Promise.resolve({ id }) })
const count = (re: RegExp) => calls.filter((u) => re.test(u)).length

const ICON = 'https://render.worldofwarcraft.com/eu/icons/56/inv_ingot.jpg'
const media = (value: string) => ({ body: { assets: [{ key: 'icon', value }] } })

beforeEach(() => {
	bnetCache.length = 0
	cookieJar.clear()
	mockFetch([tokenRoute])
})
afterEach(restoreFetch)

// ─── expansionOf ────────────────────────────────────────────────────────────

test('expansionOf recognises every real French tier name, in strict chronological order', () => {
	const names = [
		'Forge classique',
		'Forge d’Outreterre',
		'Forge du Norfendre',
		'Forge de Cataclysm',
		'Forge de Pandarie',
		'Forge de Draenor',
		'Forge de Legion',
		'Forge de Kul Tiras / Forge de Zandalar',
		'Forge d’Ombreterre',
		'Forge des îles aux Dragons',
		'Forge de Khaz Algar',
		'Forge de Midnight',
	]
	const orders = names.map((n) => expansionOf(n).expansionOrder)
	assert.deepEqual(
		orders,
		names.map((_, i) => i),
	)
	assert.equal(expansionOf('Forge de Midnight').expansion, 'Midnight')
})

test('expansionOf: unknown name gets order -1 and its own name as label', () => {
	assert.deepEqual(expansionOf('Forge mystère'), { expansion: 'Forge mystère', expansionOrder: -1 })
})

// ─── Tier catalog route ─────────────────────────────────────────────────────

const tierBody = {
	id: 2822,
	name: 'Forge de Midnight',
	categories: [{ name: 'Armes', recipes: [{ id: 1, name: 'Épée', extra: 'x' }] }, { name: 'Vide' }],
}
const tierRoute = { match: /\/profession\/164\/skill-tier\/2822/, reply: { body: tierBody } }

test('tier catalog: 401 without a session, no Blizzard call', async () => {
	assert.equal((await callTier('164', '2822')).status, 401)
	assert.equal(calls.length, 0)
})

test('tier catalog: 400 for non numeric ids', async () => {
	await login()
	for (const [p, t] of [
		['abc', '2822'],
		['164', 'x'],
		['1.5', '2'],
		['-1', '2'],
		['0', '2'],
	])
		assert.equal((await callTier(p, t)).status, 400, `${p}/${t}`)
	assert.equal(calls.length, 0)
})

test('tier catalog: 404 for Pêche and Archéologie without any Blizzard call', async () => {
	await login()
	assert.equal((await callTier('356', '2592')).status, 404)
	assert.equal((await callTier('794', '1')).status, 404)
	assert.equal(calls.length, 0)
})

test('tier catalog: success returns the mapped TierCatalog', async () => {
	await login()
	mockFetch([tokenRoute, tierRoute])
	const res = await callTier('164', '2822')
	assert.equal(res.status, 200)
	assert.deepEqual(await res.json(), {
		id: 2822,
		name: 'Forge de Midnight',
		categories: [
			{ name: 'Armes', recipes: [{ id: 1, name: 'Épée' }] },
			{ name: 'Vide', recipes: [] },
		],
	})
	const url = new URL(calls.find((u) => u.includes('skill-tier')) as string)
	assert.equal(url.searchParams.get('namespace'), 'static-eu')
	assert.equal(url.searchParams.get('locale'), 'fr_FR')
})

test('tier catalog: 404 when Blizzard says 404, 502 when Blizzard fails', async () => {
	await login()
	mockFetch([
		tokenRoute,
		{ match: /skill-tier\/1\b/, reply: { status: 404 } },
		{ match: /skill-tier/, reply: { status: 500 } },
	])
	assert.equal((await callTier('164', '1')).status, 404)
	assert.equal((await callTier('164', '2')).status, 502)
})

test('tier catalog: a success is cached, a failure is not', async () => {
	await login()
	let fail = true
	mockFetch([tokenRoute, { match: /skill-tier/, reply: () => (fail ? { status: 500 } : { body: tierBody }) }])
	assert.equal((await callTier('164', '2822')).status, 502)
	assert.equal(bnetCache.length, 0)
	fail = false
	assert.equal((await callTier('164', '2822')).status, 200)
	assert.equal((await callTier('164', '2822')).status, 200)
	assert.equal(count(/skill-tier/), 2, 'failed call + one successful call, the third answer comes from the cache')
})

// ─── Recipe route ───────────────────────────────────────────────────────────

const recipeRoutes = (body: unknown, icon: unknown = media(ICON)) => [
	tokenRoute,
	{ match: /\/media\/recipe\//, reply: icon as { body: unknown } },
	{ match: /\/recipe\//, reply: { body } },
]

test('recipe: 401 without a session, 400 for a bad id', async () => {
	assert.equal((await callRecipe('5')).status, 401)
	await login()
	assert.equal((await callRecipe('abc')).status, 400)
	assert.equal(calls.length, 0)
})

test('recipe: a minimal recipe only emits the fields Blizzard provided', async () => {
	await login()
	mockFetch(recipeRoutes({ id: 7, name: 'Lingot', description: 'Fond le minerai', media: { id: 1 } }))
	const res = await callRecipe('7')
	assert.equal(res.status, 200)
	assert.deepEqual(await res.json(), { id: 7, name: 'Lingot', description: 'Fond le minerai', icon: ICON })
})

test('recipe: a full recipe maps items, quantity, reagents and optional slots', async () => {
	await login()
	mockFetch(
		recipeRoutes({
			id: 8,
			name: 'Épée',
			rank: 2,
			crafted_item: { id: 100, name: 'Épée courte', key: { href: 'x' } },
			alliance_crafted_item: { id: 101, name: 'Épée Alliance' },
			horde_crafted_item: { id: 102, name: 'Épée Horde' },
			crafted_quantity: { minimum: 1, maximum: 3 },
			reagents: [{ reagent: { id: 5, name: 'Fer', key: 'k' }, quantity: 4 }],
			modified_crafting_slots: [{ slot_type: { name: 'Finition' } }, { slot_type: {} }],
		}),
	)
	assert.deepEqual(await (await callRecipe('8')).json(), {
		id: 8,
		name: 'Épée',
		rank: 2,
		craftedItems: [
			{ id: 100, name: 'Épée courte' },
			{ id: 101, name: 'Épée Alliance', faction: 'alliance' },
			{ id: 102, name: 'Épée Horde', faction: 'horde' },
		],
		craftedQuantity: { min: 1, max: 3 },
		reagents: [{ id: 5, name: 'Fer', quantity: 4 }],
		optionalSlots: ['Finition'],
		icon: ICON,
	})
})

test('recipe: crafted_quantity { value } is kept as value', async () => {
	await login()
	mockFetch(recipeRoutes({ id: 9, name: 'X', crafted_quantity: { value: 5 } }))
	assert.deepEqual((await (await callRecipe('9')).json()).craftedQuantity, { value: 5 })
})

test('recipe: a failing icon call only leaves the icon out', async () => {
	await login()
	mockFetch(recipeRoutes({ id: 7, name: 'Lingot' }, { status: 500 }))
	const res = await callRecipe('7')
	assert.equal(res.status, 200)
	assert.deepEqual(await res.json(), { id: 7, name: 'Lingot' })
})

test('recipe: 404 when Blizzard says 404, 502 when it fails', async () => {
	await login()
	mockFetch([
		tokenRoute,
		{ match: /\/media\//, reply: { status: 404 } },
		{ match: /recipe\/404/, reply: { status: 404 } },
		{ match: /recipe/, reply: { status: 500 } },
	])
	assert.equal((await callRecipe('404')).status, 404)
	assert.equal((await callRecipe('500')).status, 502)
})

test('recipe: a success is cached (second call without fetch), a failure is not', async () => {
	await login()
	mockFetch(recipeRoutes({ id: 7, name: 'Lingot' }))
	await callRecipe('7')
	const first = calls.length
	await callRecipe('7')
	assert.equal(calls.length, first)

	bnetCache.length = 0
	mockFetch([tokenRoute, { match: /recipe/, reply: { status: 500 } }])
	assert.equal((await callRecipe('7')).status, 502)
	assert.equal(bnetCache.length, 0)
})

// ─── Recipe icon route ──────────────────────────────────────────────────────

test('icon: 401 without a session, 400 for a bad id', async () => {
	assert.equal((await callIcon('5')).status, 401)
	await login()
	assert.equal((await callIcon('x')).status, 400)
	assert.equal(calls.length, 0)
})

test('icon: 302 to the asset with a private one-week Cache-Control', async () => {
	await login()
	mockFetch([tokenRoute, { match: /media\/recipe\/5/, reply: media(ICON) }])
	const res = await callIcon('5')
	assert.equal(res.status, 302)
	assert.equal(res.headers.get('location'), ICON)
	assert.equal(res.headers.get('cache-control'), 'private, max-age=604800')
})

test('icon: 404 when the media has no asset', async () => {
	await login()
	mockFetch([tokenRoute, { match: /media\/recipe\/5/, reply: { body: { assets: [] } } }])
	const res = await callIcon('5')
	assert.equal(res.status, 404)
	assert.equal(res.headers.get('location'), null)
})

test('icon: a non https URL is refused (no redirect)', async () => {
	await login()
	for (const bad of ['http://evil.example/x.jpg', 'javascript:alert(1)', '//evil.example/x.jpg']) {
		bnetCache.length = 0
		mockFetch([tokenRoute, { match: /media\/recipe\/5/, reply: media(bad) }])
		const res = await callIcon('5')
		assert.equal(res.status, 404, bad)
		assert.equal(res.headers.get('location'), null, bad)
	}
})

test('icon: 502 when Blizzard fails', async () => {
	await login()
	mockFetch([tokenRoute, { match: /media\/recipe\/5/, reply: { status: 500 } }])
	assert.equal((await callIcon('5')).status, 502)
})
