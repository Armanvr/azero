import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { buildRecipeIndex, findCraftSources, findEncounterSources, wowheadUrl } from '@/lib/services/sourceService'
import { bnetCache, dbState } from '@/tests/stubs/db'
import { calls, maxInFlight, mockFetch, restoreFetch, tokenRoute } from '@/tests/stubs/fetch'
import { fixture } from '@/tests/stubs/fixture'

process.env.BNET_CLIENT_ID = 'id'
process.env.BNET_CLIENT_SECRET = 'secret'

beforeEach(() => {
	bnetCache.length = 0
})
afterEach(restoreFetch)

// ─── Journal ────────────────────────────────────────────────────────────────

const searchRoute = (body: unknown, status = 200) => ({ match: /search\/journal-encounter/, reply: { status, body } })
const instanceRoute = (over: Record<string, unknown> = {}, status = 200) => ({
	match: /journal-instance\/1273/,
	reply: { status, body: { ...fixture('journal-instance'), ...over } },
})
// The real search result, plus a second encounter of the same instance (no real item drops from two encounters)
const searchWith = (...extraNames: string[]) => {
	const search = fixture('journal-encounter-search')
	const [first] = search.results
	search.results.push(
		...extraNames.map((name, i) => ({
			...first,
			data: { ...first.data, id: first.data.id + i + 1, name: { fr_FR: name } },
		})),
	)
	return search
}

test('raid item dropped by two encounters: two sources with instance, expansion and difficulties', async () => {
	mockFetch([tokenRoute, searchRoute(searchWith('La cour Soyeuse')), instanceRoute()])
	const { sources, pending } = await findEncounterSources(219915)
	assert.equal(pending, false)
	assert.deepEqual(sources, [
		{
			type: 'raid',
			name: 'Ulgrax le Dévoreur',
			instance: 'Palais des Nérub’ar',
			expansion: 'The War Within',
			difficulties: ['Recherche de raid', 'Normal', 'Héroïque', 'Mythique'],
		},
		{
			type: 'raid',
			name: 'La cour Soyeuse',
			instance: 'Palais des Nérub’ar',
			expansion: 'The War Within',
			difficulties: ['Recherche de raid', 'Normal', 'Héroïque', 'Mythique'],
		},
	])
	// the instance is fetched once for both encounters, and the search filters on the item id
	assert.equal(calls.filter((u) => /journal-instance/.test(u)).length, 1)
	assert.match(calls.find((u) => /search/.test(u)) ?? '', /items\.item\.id=219915/)
})

test('a journal instance cached before the LFR label fix is ignored', async () => {
	bnetCache.push({
		key: 'journal-instance:1273',
		data: { name: 'Palais', category: 'RAID', difficulties: ['Raids'] },
		expiresAt: new Date(Date.now() + 3600_000),
	})
	mockFetch([tokenRoute, searchRoute(fixture('journal-encounter-search')), instanceRoute()])
	const { sources } = await findEncounterSources(219915)
	assert.equal(sources[0].difficulties?.[0], 'Recherche de raid')
})

test('the same encounter returned twice yields one source', async () => {
	mockFetch([tokenRoute, searchRoute(searchWith('Ulgrax le Dévoreur')), instanceRoute()])
	const { sources } = await findEncounterSources(219915)
	assert.deepEqual(
		sources.map((s) => s.name),
		['Ulgrax le Dévoreur'],
	)
})

test('two encounters whose names differ only by a no-break space yield one source', async () => {
	mockFetch([tokenRoute, searchRoute(searchWith('Ulgrax le Dévoreur')), instanceRoute()])
	assert.equal((await findEncounterSources(219915)).sources.length, 1)
})

test('dungeon instance gives a dungeon source; an instance of another category gives none', async () => {
	mockFetch([
		tokenRoute,
		searchRoute(fixture('journal-encounter-search')),
		instanceRoute({ category: { type: 'DUNGEON' } }),
	])
	assert.equal((await findEncounterSources(219915)).sources[0].type, 'dungeon')
	bnetCache.length = 0
	mockFetch([
		tokenRoute,
		searchRoute(fixture('journal-encounter-search')),
		instanceRoute({ category: { type: 'WORLD_BOSS' } }),
	])
	assert.deepEqual(await findEncounterSources(219915), { sources: [], pending: false })
})

test('item no encounter drops: no source and not pending', async () => {
	mockFetch([tokenRoute, searchRoute({ page: 1, pageSize: 0, pageCount: 0, results: [] })])
	assert.deepEqual(await findEncounterSources(1), { sources: [], pending: false })
})

test('journal search failing is pending, never "no source", and is not cached', async () => {
	mockFetch([tokenRoute, searchRoute({}, 500)])
	assert.deepEqual(await findEncounterSources(219915), { sources: [], pending: true })
	assert.equal(bnetCache.length, 0)
})

test('instance call failing keeps the other sources out of the final answer: pending', async () => {
	mockFetch([tokenRoute, searchRoute(fixture('journal-encounter-search')), instanceRoute({}, 500)])
	const out = await findEncounterSources(219915)
	assert.equal(out.pending, true)
	assert.deepEqual(out.sources, [])
})

// ─── Crafting ───────────────────────────────────────────────────────────────

const recipeRoutes = (craftedItemId: number) => [
	tokenRoute,
	{
		match: /data\/wow\/profession\/index/,
		reply: {
			body: {
				professions: [
					{ id: 164, name: 'Forge' },
					{ id: 356, name: 'Pêche' },
				],
			},
		},
	},
	{
		match: /data\/wow\/profession\/164\?/,
		reply: { body: { name: 'Forge', skill_tiers: [{ id: 1, name: 'Forge de test' }] } },
	},
	{
		match: /profession\/164\/skill-tier\/1/,
		reply: {
			body: {
				id: 1,
				name: 'Forge de test',
				categories: [
					{
						name: 'Armes',
						recipes: [
							{ id: 10, name: 'Épée de test' },
							{ id: 11, name: 'Autre recette' },
						],
					},
					{ name: 'Doublons', recipes: [{ id: 10, name: 'Épée de test' }] },
				],
			},
		},
	},
	{
		match: /data\/wow\/recipe\/10\?/,
		reply: { body: { id: 10, name: 'Épée de test', crafted_item: { id: craftedItemId, name: 'Épée de test' } } },
	},
	{ match: /media\/recipe\//, reply: { body: { assets: [{ key: 'icon', value: 'https://icons/r.jpg' }] } } },
]

test('crafted item: recipe name matches and crafted item id confirms → one craft source', async () => {
	mockFetch(recipeRoutes(555))
	await buildRecipeIndex()
	const out = await findCraftSources(555, ' ÉPÉE de Test ')
	assert.deepEqual(out, { sources: [{ type: 'craft', name: 'Épée de test', conditions: 'Forge' }], pending: false })
})

test('recipe name matches but crafted item id differs → no source', async () => {
	mockFetch(recipeRoutes(999))
	await buildRecipeIndex()
	assert.deepEqual(await findCraftSources(555, 'Épée de test'), { sources: [], pending: false })
})

test('recipe index missing → pending true and no Blizzard call', async () => {
	mockFetch([])
	assert.deepEqual(await findCraftSources(555, 'Épée de test'), { sources: [], pending: true })
	assert.equal(calls.length, 0)
})

test('buildRecipeIndex skips professions without recipes, lists a recipe once, and does nothing once built', async () => {
	mockFetch(recipeRoutes(555))
	await buildRecipeIndex()
	assert.equal(
		calls.some((u) => /profession\/356/.test(u)),
		false,
	)
	const index = bnetCache.find((d) => d.key === 'recipe-name-index')?.data
	assert.deepEqual(index, {
		rows: [
			['épée de test', 10, 'Forge'],
			['autre recette', 11, 'Forge'],
		],
		partial: false,
	})
	const before = calls.length
	await buildRecipeIndex()
	assert.equal(calls.length, before)
})

const withTier = (recipes: unknown[]) => {
	const routes = recipeRoutes(555)
	routes[3] = {
		match: /profession\/164\/skill-tier\/1/,
		reply: { body: { id: 1, name: 'Forge de test', categories: [{ name: 'Armes', recipes }] } },
	}
	return routes
}

test('a recipe without a name (Blizzard sends null) is skipped, the index is still built', async () => {
	mockFetch(
		withTier([
			{ id: 49117, name: null },
			{ id: 10, name: 'Épée de test' },
		]),
	)
	await buildRecipeIndex()
	const index = bnetCache.find((d) => d.key === 'recipe-name-index')?.data
	assert.deepEqual(index, { rows: [['épée de test', 10, 'Forge']], partial: false })
})

test('the crawl asks one tier at a time (a burst of tier calls got 429 from Blizzard)', async () => {
	const routes = recipeRoutes(555)
	routes[2] = {
		match: /data\/wow\/profession\/164\?/,
		reply: {
			body: {
				name: 'Forge',
				skill_tiers: [
					{ id: 1, name: 'A' },
					{ id: 2, name: 'B' },
					{ id: 3, name: 'C' },
				],
			},
		},
	}
	routes[3] = {
		match: /profession\/164\/skill-tier\//,
		reply: { body: { id: 1, name: 'T', categories: [] } },
	}
	mockFetch(routes)
	await buildRecipeIndex()
	assert.equal(calls.filter((u) => /skill-tier/.test(u)).length, 3)
	assert.equal(maxInFlight, 1)
})

const failingTier = () => {
	const routes = recipeRoutes(555)
	routes[3] = { match: /profession\/164\/skill-tier\/1/, reply: { status: 500, body: {} } }
	return routes
}

test('a tier failing for good still yields an index, partial and short-lived', async () => {
	mockFetch(failingTier())
	await buildRecipeIndex()
	const doc = bnetCache.find((d) => d.key === 'recipe-name-index')
	assert.deepEqual(doc?.data, { rows: [], partial: true })
	assert.ok(new Date(doc?.expiresAt as Date).getTime() < Date.now() + 3600_000)
})

test('partial index: no match is pending (never "no source"), a confirmed craft is returned', async () => {
	bnetCache.push({
		key: 'recipe-name-index',
		data: { rows: [['épée de test', 10, 'Forge']], partial: true },
		expiresAt: new Date(Date.now() + 60_000),
	})
	mockFetch(recipeRoutes(555))
	assert.deepEqual(await findCraftSources(1, 'Inconnu'), { sources: [], pending: true })
	assert.deepEqual(await findCraftSources(555, 'Épée de test'), {
		sources: [{ type: 'craft', name: 'Épée de test', conditions: 'Forge' }],
		pending: false,
	})
})

test('an expired partial index is rebuilt once the tier answers again', async () => {
	mockFetch(failingTier())
	await buildRecipeIndex()
	bnetCache.find((d) => d.key === 'recipe-name-index')!.expiresAt = new Date(Date.now() - 1000)
	mockFetch(recipeRoutes(555))
	await buildRecipeIndex()
	const index = bnetCache.find((d) => d.key === 'recipe-name-index')?.data as { partial: boolean }
	assert.equal(index.partial, false)
})

const withRecipe = (status: number) => {
	const routes = recipeRoutes(555)
	routes[4] = { match: /data\/wow\/recipe\/10\?/, reply: { status, body: {} } }
	return routes
}

test('a recipe Blizzard does not know (404) is not a source and not pending, so the answer can be cached', async () => {
	mockFetch(recipeRoutes(555))
	await buildRecipeIndex()
	mockFetch(withRecipe(404))
	assert.deepEqual(await findCraftSources(555, 'Épée de test'), { sources: [], pending: false })
})

test('a recipe call failing for any other reason (500) is pending', async () => {
	mockFetch(recipeRoutes(555))
	await buildRecipeIndex()
	mockFetch(withRecipe(500))
	assert.deepEqual(await findCraftSources(555, 'Épée de test'), { sources: [], pending: true })
})

test('with Mongo down, building the recipe index makes no Blizzard call', async () => {
	mockFetch(recipeRoutes(555))
	dbState.down = true
	try {
		await buildRecipeIndex()
	} finally {
		dbState.down = false
	}
	assert.equal(calls.length, 0)
})

test('wowheadUrl points at the French item page', () => {
	assert.equal(wowheadUrl(42), 'https://www.wowhead.com/fr/item=42')
})
