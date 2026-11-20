import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { GET } from '@/app/api/characters/public/[realm]/[name]/talents/route'
import { getCharacterTalents, mapTalents } from '@/lib/services/talentService'
import type { TalentNode, TalentTree } from '@/lib/types'
import { bnetCache } from '@/tests/stubs/db'
import { calls, mockFetch, restoreFetch, tokenRoute } from '@/tests/stubs/fetch'
import { fixture } from '@/tests/stubs/fixture'

process.env.BNET_CLIENT_ID = 'id'
process.env.BNET_CLIENT_SECRET = 'secret'

// Fixtures are real Blizzard responses (trimmed). Loadouts: [0] inactive, [1] active. Class nodes: 99808 is a nameless
// placeholder, 82198 a choice node (Charge sauvage / Célérité du tigre), 82225 a two-rank node, 82201 a default talent.
const CHOICE = 82198
const TWO_RANK = 82225
const icons = new Map([
	[108299, 'https://icons/instinct.jpg'],
	[102401, 'https://icons/charge.jpg'],
])

const kindOf = (trees: TalentTree[], kind: TalentTree['kind']) => trees.find((t) => t.kind === kind) as TalentTree
const node = (tree: TalentTree, id: number) => tree.nodes.find((n) => n.id === id) as TalentNode
const activeTrees = (t: ReturnType<typeof mapTalents>) => t.loadouts.find((l) => l.active)?.trees as TalentTree[]

// Run first: the Blizzard token is cached at module level once obtained.
test('getCharacterTalents: profile 404 → 404; profile 500 → 502; no token → 503', async () => {
	mockFetch([{ match: /oauth\.battle\.net/, reply: { status: 401 } }])
	assert.deepEqual(await getCharacterTalents('archimonde', 'testchar'), { status: 503 })

	mockFetch([tokenRoute, { match: /specializations/, reply: { status: 404 } }])
	assert.deepEqual(await getCharacterTalents('archimonde', 'nobody'), { status: 404 })

	mockFetch([tokenRoute, { match: /specializations/, reply: { status: 500 } }])
	assert.deepEqual(await getCharacterTalents('archimonde', 'testchar'), { status: 502 })
	assert.equal(bnetCache.length, 0)
})

// ─── mapTalents ─────────────────────────────────────────────────────────────

test('mapTalents: active spec, hero tree name and three trees in order class, hero, spec', () => {
	const t = mapTalents(fixture('specializations'), fixture('talent-tree'), icons)
	assert.deepEqual([t.spec, t.heroTree], ['Équilibre', 'Gardien du Bosquet'])
	const trees = activeTrees(t)
	assert.deepEqual(
		trees.map((x) => [x.kind, x.name]),
		[
			['class', 'Druide'],
			['hero', 'Gardien du Bosquet'],
			['spec', 'Équilibre'],
		],
	)
	// only the active hero tree: the other one in the static response (id 21) is not returned
	assert.deepEqual(
		kindOf(trees, 'hero')
			.nodes.map((n) => n.id)
			.sort(),
		[94593, 94599, 94600],
	)
})

test('mapTalents: a hero node Blizzard also lists in spec_talent_nodes stays out of the spec tree', () => {
	// 94608 (Boundless Moonlight, an Elune's Chosen talent) sits in the real spec_talent_nodes; that hero tree was trimmed
	const tree = fixture('talent-tree')
	const leaked = tree.spec_talent_nodes.find((n: { id: number }) => n.id === 94608)
	tree.hero_talent_trees.push({ id: 24, name: 'Élu d’Élune', hero_talent_nodes: [leaked] })
	const trees = activeTrees(mapTalents(fixture('specializations'), tree, icons))
	assert.deepEqual(
		kindOf(trees, 'spec')
			.nodes.map((n) => n.id)
			.sort(),
		[88223, 88225],
	)
	assert.equal(kindOf(trees, 'hero').nodes.length, 3) // the active hero tree is untouched
})

test('mapTalents: multi-rank node selected at rank 2 of 2, unselected node has rank 0', () => {
	const profile = fixture('specializations')
	profile.specializations[0].loadouts[1].selected_class_talents.find((e: { id: number }) => e.id === TWO_RANK).rank =
		2
	const trees = activeTrees(mapTalents(profile, fixture('talent-tree'), icons))
	const twoRank = node(kindOf(trees, 'class'), TWO_RANK)
	assert.deepEqual([twoRank.rank, twoRank.maxRank, twoRank.name], [2, 2, 'Instinct du tueur'])
	assert.equal(twoRank.icon, 'https://icons/instinct.jpg')
	assert.deepEqual(twoRank.unlocks, [CHOICE]) // links to nodes that are not in the output are dropped
	const unselected = kindOf(trees, 'spec').nodes.filter((n) => n.rank === 0)
	assert.equal(unselected.length, 1)
	assert.ok(unselected[0].name && unselected[0].maxRank >= 1)
	assert.equal(unselected[0].row > 0 && unselected[0].col > 0, true)
})

test('mapTalents: duplicate links Blizzard sends are listed once (unique React keys)', () => {
	const tree = fixture('talent-tree')
	const raw = tree.class_talent_nodes.find((n: { id: number }) => n.id === TWO_RANK)
	raw.unlocks = [...raw.unlocks, ...raw.unlocks]
	const trees = activeTrees(mapTalents(fixture('specializations'), tree, icons))
	assert.deepEqual(node(kindOf(trees, 'class'), TWO_RANK).unlocks, [CHOICE])
})

test('mapTalents: choice node flags the selected choice', () => {
	const choice = node(
		kindOf(activeTrees(mapTalents(fixture('specializations'), fixture('talent-tree'), icons)), 'class'),
		CHOICE,
	)
	assert.equal(choice.name, 'Charge sauvage')
	assert.deepEqual(
		choice.choices?.map((c) => [c.name, c.selected]),
		[
			['Charge sauvage', true],
			['Célérité du tigre', false],
		],
	)
	assert.equal(choice.choices?.[0].icon, 'https://icons/charge.jpg')
	assert.equal(choice.choices?.[1].icon, undefined)
	assert.equal(choice.rank, 1)
})

test('mapTalents: a node Blizzard gives no name for is not listed', () => {
	const trees = activeTrees(mapTalents(fixture('specializations'), fixture('talent-tree'), icons))
	assert.equal(node(kindOf(trees, 'class'), 99808), undefined)
})

test('mapTalents: spent is the sum of ranks', () => {
	const profile = fixture('specializations')
	profile.specializations[0].loadouts[1].selected_class_talents.find((e: { id: number }) => e.id === TWO_RANK).rank =
		2
	const trees = activeTrees(mapTalents(profile, fixture('talent-tree'), icons))
	const class_ = kindOf(trees, 'class')
	// 82201 (1) + 82225 (2) + 82198 (1): ranks, not the three nodes
	assert.equal(class_.spent, 4)
	assert.equal(
		class_.spent,
		class_.nodes.reduce((n, x) => n + x.rank, 0),
	)
	assert.equal(kindOf(trees, 'spec').spent, 2)
})

test('mapTalents: two loadouts, the active one flagged', () => {
	const t = mapTalents(fixture('specializations'), fixture('talent-tree'), icons)
	assert.deepEqual(
		t.loadouts.map((l) => [l.name, l.active]),
		[
			['Configuration 1', false],
			['Configuration 2', true],
		],
	)
	assert.ok(t.loadouts.every((l) => typeof l.code === 'string' && l.code.length > 0))
})

test('mapTalents: no loadouts → loadouts []', () => {
	const profile = fixture('specializations')
	profile.specializations[0].loadouts = []
	assert.deepEqual(mapTalents(profile, null, icons), {
		spec: 'Équilibre',
		heroTree: 'Gardien du Bosquet',
		loadouts: [],
	})

	delete profile.specializations
	assert.deepEqual(mapTalents(profile, null, icons).loadouts, [])
	delete profile.active_specialization
	delete profile.active_hero_talent_tree
	assert.deepEqual(mapTalents(profile, null, icons), { spec: '', loadouts: [] })
})

test('mapTalents: tree null → nodes still listed with names and ranks', () => {
	const t = mapTalents(fixture('specializations'), null, icons)
	const trees = activeTrees(t)
	assert.deepEqual(
		trees.map((x) => x.kind),
		['class', 'hero', 'spec'],
	)
	const choice = node(kindOf(trees, 'class'), CHOICE)
	assert.deepEqual(
		[choice.name, choice.rank, choice.row, choice.col, choice.unlocks],
		['Charge sauvage', 1, 0, 0, []],
	)
	assert.equal(choice.icon, 'https://icons/charge.jpg')
	assert.equal(kindOf(trees, 'spec').spent, 2)
	assert.equal(node(kindOf(trees, 'class'), 99808), undefined)
})

// ─── getCharacterTalents ────────────────────────────────────────────────────

const spellMedia = (id: string) => ({ body: { assets: [{ key: 'icon', value: `https://icons/${id}.jpg` }] } })
const happy = () => [
	tokenRoute,
	{ match: /specializations/, reply: { body: fixture('specializations') } },
	{ match: /talent-tree\/793\/playable-specialization\/102/, reply: { body: fixture('talent-tree') } },
	{ match: /media\/playable-specialization\/102/, reply: spellMedia('spec') },
	{ match: /media\/spell\/102401/, reply: { status: 404 } },
	{ match: /media\/spell\/(\d+)/, reply: spellMedia('s') },
]
const spellCalls = () => calls.filter((u) => /media\/spell/.test(u))

beforeEach(() => {
	bnetCache.length = 0
})
afterEach(restoreFetch)

test('getCharacterTalents: maps profile, static tree and icons; a failed icon is just absent', async () => {
	mockFetch(happy())
	const out = await getCharacterTalents('tarren-mill', 'testchar')
	assert.equal(out.status, 200)
	if (out.status !== 200) return
	const trees = activeTrees(out.talents)
	const killer = node(kindOf(trees, 'class'), TWO_RANK)
	assert.equal(killer.icon, 'https://icons/s.jpg')
	assert.equal(out.talents.specIcon, 'https://icons/spec.jpg')
	assert.equal(node(kindOf(trees, 'class'), CHOICE).icon, undefined) // 102401 answered 404
	assert.match(
		calls.find((u) => /specializations/.test(u)) ?? '',
		/character\/tarren-mill\/testchar\/specializations\?namespace=profile-eu&locale=fr_FR/,
	)
	assert.ok(calls.every((u) => !/talent-tree\/793\/hero/.test(u)))
})

test('getCharacterTalents: a second call within the hour makes no Blizzard request; the cache lasts one hour', async () => {
	mockFetch(happy())
	await getCharacterTalents('tarren-mill', 'testchar')
	const first = calls.length
	assert.ok(first > 0)
	const out = await getCharacterTalents('tarren-mill', 'testchar')
	assert.equal(out.status, 200)
	assert.equal(calls.length, first)

	const entry = bnetCache.find((d) => d.key === 'talents:tarren-mill:testchar')
	assert.ok(entry)
	const left = (entry.expiresAt as Date).getTime() - Date.now()
	assert.ok(left > 59 * 60_000 && left <= 3600_000, `ttl ${left}`)
})

test('getCharacterTalents: spell icons are cached on their own (7 days), one request per spell', async () => {
	mockFetch(happy())
	await getCharacterTalents('tarren-mill', 'testchar')
	const first = spellCalls().length
	assert.equal(new Set(spellCalls()).size, first)
	assert.ok(bnetCache.some((d) => /^spell-media:/.test(d.key as string)))
	// another character of the same spec: tree and icons come from the cache
	await getCharacterTalents('tarren-mill', 'othertestchar')
	assert.equal(calls.filter((u) => /talent-tree/.test(u)).length, 1)
	// only 102401 (404, never cached) is asked again
	assert.equal(spellCalls().length, first + 1)
})

test('getCharacterTalents: static tree unavailable → still 200, built from the loadout tooltips', async () => {
	mockFetch([
		tokenRoute,
		{ match: /specializations/, reply: { body: fixture('specializations') } },
		{ match: /talent-tree/, reply: { status: 500 } },
		{ match: /media\/spell/, reply: spellMedia('s') },
	])
	const out = await getCharacterTalents('tarren-mill', 'testchar')
	assert.equal(out.status, 200)
	if (out.status !== 200) return
	const choice = node(kindOf(activeTrees(out.talents), 'class'), CHOICE)
	assert.deepEqual([choice.name, choice.rank, choice.row, choice.col], ['Charge sauvage', 1, 0, 0])
})

test('getCharacterTalents: a degraded result (static tree failed) is returned but not cached; a later call retries', async () => {
	mockFetch([
		tokenRoute,
		{ match: /specializations/, reply: { body: fixture('specializations') } },
		{ match: /talent-tree/, reply: { status: 500 } },
		{ match: /media\/spell/, reply: spellMedia('s') },
	])
	assert.equal((await getCharacterTalents('tarren-mill', 'testchar')).status, 200)
	assert.equal(
		bnetCache.some((d) => d.key === 'talents:tarren-mill:testchar'),
		false,
	)
	const before = calls.filter((u) => /specializations/.test(u)).length
	await getCharacterTalents('tarren-mill', 'testchar')
	assert.equal(calls.filter((u) => /specializations/.test(u)).length, before + 1)
})

test('getCharacterTalents: a profile without loadouts is a 200 with loadouts [] (no tree requested)', async () => {
	const profile = fixture('specializations')
	profile.specializations[0].loadouts = []
	mockFetch([tokenRoute, { match: /specializations/, reply: { body: profile } }])
	const out = await getCharacterTalents('tarren-mill', 'lowlevel')
	assert.deepEqual(out, { status: 200, talents: { spec: 'Équilibre', heroTree: 'Gardien du Bosquet', loadouts: [] } })
})

// ─── Route ──────────────────────────────────────────────────────────────────

const call = (realm: string, name: string) =>
	GET(new Request('http://localhost/x'), { params: Promise.resolve({ realm, name }) })
const realmIndex = {
	match: /\/data\/wow\/realm\/index/,
	reply: { body: { realms: [{ slug: 'tarren-mill', name: { fr_FR: 'Tarren Mill' } }] } },
}

test('GET talents: 200 { talents } with the realm resolved and the name lower-cased', async () => {
	mockFetch([realmIndex, ...happy()])
	const res = await call('Tarren Mill', 'TestChar')
	assert.equal(res.status, 200)
	const { talents } = await res.json()
	assert.equal(talents.spec, 'Équilibre')
	assert.ok(calls.some((u) => /character\/tarren-mill\/testchar\/specializations/.test(u)))
})

test('GET talents: 404 → Personnage introuvable; 502 and 503 → Battle.net message', async () => {
	mockFetch([realmIndex, tokenRoute, { match: /specializations/, reply: { status: 404 } }])
	const notFound = await call('tarren-mill', 'nobody')
	assert.deepEqual([notFound.status, await notFound.json()], [404, { error: 'Personnage introuvable' }])

	mockFetch([realmIndex, tokenRoute, { match: /specializations/, reply: { status: 500 } }])
	const down = await call('tarren-mill', 'boom')
	assert.deepEqual(
		[down.status, await down.json()],
		[502, { error: 'Battle.net est indisponible. Réessayez dans un instant.' }],
	)
})

test('GET talents: a name or realm cannot change the Blizzard path', async () => {
	mockFetch([realmIndex, tokenRoute, { match: /specializations/, reply: { status: 404 } }])
	await call('tarren-mill', '../../oauth?x=1')
	assert.ok(calls.filter((u) => /specializations/.test(u)).every((u) => !u.includes('/../') && !u.includes('?x=1')))
})
