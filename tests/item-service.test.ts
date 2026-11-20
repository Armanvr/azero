import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { GET } from '@/app/api/items/[id]/sources/route'
import { ItemCacheModel } from '@/lib/models/ItemCache'
import { getItemData } from '@/lib/services/itemService'
import { bnetCache } from '@/tests/stubs/db'
import { calls, mockFetch, restoreFetch, tokenRoute } from '@/tests/stubs/fetch'
import { fixture } from '@/tests/stubs/fixture'

process.env.BNET_CLIENT_ID = 'id'
process.env.BNET_CLIENT_SECRET = 'secret'

// The real Mongoose model is used for its shape only: its two queries are replaced, nothing reaches a database
const written: Array<Record<string, unknown>> = []
const stored: Array<Record<string, unknown>> = []
const model = ItemCacheModel as unknown as Record<string, unknown>
// Like Mongo: a document only matches when every filter field is equal (so a missing `v` never matches `v: 3`)
model.findOne = (filter: Record<string, unknown>) => ({
	lean: async () => stored.find((d) => d.itemId === filter.itemId && d.v === filter.v) ?? null,
})
model.findOneAndUpdate = async (_filter: unknown, update: { $set: Record<string, unknown> }) =>
	void written.push(update.$set)

const blizzardItem = {
	name: 'Chélicère du béhémoth fétide',
	item_class: { name: 'Armure' },
	inventory_type: { name: 'Bijou' },
	preview_item: { stats: [{ type: { type: 'STRENGTH' }, value: 1234 }] },
}
const itemRoute = { match: /\/data\/wow\/item\//, reply: { body: blizzardItem } }
const searchRoute = { match: /search\/journal-encounter/, reply: { body: fixture('journal-encounter-search') } }
const noEncounter = { match: /search\/journal-encounter/, reply: { body: { results: [] } } }
const instanceRoute = { match: /journal-instance\/1273/, reply: { body: fixture('journal-instance') } }
const settled = () => new Promise((r) => setImmediate(r))

const hour = new Date(Date.now() + 3600_000)
const seedRecipeIndex = (rows: unknown[] = []) =>
	bnetCache.push({ key: 'recipe-name-index', data: { rows, partial: false }, expiresAt: hour })

beforeEach(() => {
	written.length = 0
	stored.length = 0
	bnetCache.length = 0
})
afterEach(restoreFetch)

test('raid drop: the item is returned with its encounter source and cached with v 3', async () => {
	seedRecipeIndex()
	mockFetch([tokenRoute, itemRoute, searchRoute, instanceRoute])
	const item = await getItemData(219915)
	assert.equal(item?.name, 'Chélicère du béhémoth fétide')
	assert.equal(item?.pending, false)
	assert.deepEqual(item?.sources, [
		{
			type: 'raid',
			name: 'Ulgrax le Dévoreur',
			instance: 'Palais des Nérub’ar',
			expansion: 'The War Within',
			difficulties: ['Recherche de raid', 'Normal', 'Héroïque', 'Mythique'],
		},
	])
	await settled()
	assert.equal(written.length, 1)
	assert.equal(written[0].v, 3)
	assert.equal(written[0].name, 'Chélicère du béhémoth fétide')
})

test('item both dropped and crafted lists the encounter and the recipe', async () => {
	seedRecipeIndex([['chélicère du béhémoth fétide', 10, 'Forge']])
	mockFetch([
		tokenRoute,
		itemRoute,
		searchRoute,
		instanceRoute,
		{
			match: /data\/wow\/recipe\/10\?/,
			reply: { body: { id: 10, name: 'Chélicère', crafted_item: { id: 219915 } } },
		},
		{ match: /media\/recipe\//, reply: { body: { assets: [] } } },
	])
	const item = await getItemData(219915)
	assert.deepEqual(
		item?.sources.map((s) => s.type),
		['raid', 'craft'],
	)
})

test('recipe index missing → pending true, nothing cached', async () => {
	mockFetch([tokenRoute, itemRoute, noEncounter])
	const item = await getItemData(5)
	assert.equal(item?.pending, true)
	assert.deepEqual(item?.sources, [])
	await settled()
	assert.equal(written.length, 0)
})

test('no encounter and no recipe → sources [], pending false, cached with v 3', async () => {
	seedRecipeIndex()
	mockFetch([tokenRoute, itemRoute, noEncounter])
	const item = await getItemData(6)
	assert.deepEqual([item?.sources, item?.pending], [[], false])
	await settled()
	assert.equal(written.length, 1)
	assert.deepEqual([written[0].v, written[0].sources], [3, []])
})

test('a cached document of an older version (none, or 2 with the « Raids » label) is ignored and refetched', async () => {
	stored.push({ itemId: 7, name: 'Vieux', sources: [{ boss: 'Ancien boss', difficulty: 'Normal' }], expiresAt: hour })
	stored.push({ v: 2, itemId: 7, name: 'Vieux v2', sources: [], expiresAt: hour })
	seedRecipeIndex()
	mockFetch([tokenRoute, itemRoute, noEncounter])
	const item = await getItemData(7)
	assert.equal(item?.name, 'Chélicère du béhémoth fétide')
	assert.deepEqual(item?.sources, [])
	assert.ok(calls.some((u) => /data\/wow\/item\/7/.test(u)))
})

test('a cached v 3 document is served without any Blizzard call', async () => {
	stored.push({ v: 3, itemId: 8, name: 'En cache', type: '', slot: '', stats: [], sources: [] })
	mockFetch([])
	const item = await getItemData(8)
	assert.deepEqual([item?.name, item?.pending], ['En cache', false])
	assert.equal(calls.length, 0)
})

test('Blizzard item call fails → null, nothing cached', async () => {
	mockFetch([tokenRoute, { match: /\/data\/wow\/item\//, reply: { status: 500 } }])
	assert.equal(await getItemData(9), null)
	await settled()
	assert.equal(written.length, 0)
	assert.equal(bnetCache.length, 0)
})

test('GET /api/items/1/sources answers with the sources and the Wowhead link', async () => {
	seedRecipeIndex()
	mockFetch([tokenRoute, itemRoute, noEncounter])
	const res = await GET(new Request('http://x/api/items/1/sources'), { params: Promise.resolve({ id: '1' }) })
	assert.equal(res.status, 200)
	const body = await res.json()
	assert.equal(body.wowheadUrl, 'https://www.wowhead.com/fr/item=1')
	assert.deepEqual(
		[body.name, body.type, body.slot, body.sources, body.pending],
		['Chélicère du béhémoth fétide', 'Armure', 'Bijou', [], false],
	)
	assert.match(body.stats[0], /^1\s234 Force$/)
})

test('GET /api/items/abc/sources → 400, unknown item → 404', async () => {
	mockFetch([tokenRoute, { match: /\/data\/wow\/item\//, reply: { status: 404 } }])
	assert.equal((await GET(new Request('http://x'), { params: Promise.resolve({ id: 'abc' }) })).status, 400)
	assert.equal((await GET(new Request('http://x'), { params: Promise.resolve({ id: '3' }) })).status, 404)
})
