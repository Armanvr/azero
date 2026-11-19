import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { POST } from '@/app/api/characters/[id]/enrich/route'
import { createSessionToken } from '@/lib/auth'
import { characters, store, updates } from '@/tests/stubs/db'
import { calls, mockFetch, restoreFetch, tokenRoute } from '@/tests/stubs/fetch'
import { cookieJar } from '@/tests/stubs/headers'

process.env.BNET_CLIENT_ID = 'id'
process.env.BNET_CLIENT_SECRET = 'secret'

const stored = {
	_id: 'id-arman',
	userId: 'u1',
	name: 'Arman',
	realm: 'Archimonde',
	realmSlug: 'archimonde',
	classId: 4,
	level: 90,
	ilvl: 701,
	spec: 'Assassinat',
	title: 'le Brave',
	guildName: 'Les Tests',
	gold: 1234,
	slotsLeft: [{ id: 'head', label: 'Tête', item: 'Casque', ilvl: 700, enchant: null, rarity: 'epic' }],
}

const summary = { equipped_item_level: 710, active_spec: { id: 259, name: 'Mortelle' }, guild: { name: 'Autre' } }
const media = { assets: [{ key: 'avatar', value: 'https://render.example/a.jpg' }] }
const equipment = { equipped_items: [] }
const currencies = { currencies: [{ currency: { id: 1 }, quantity: 5_000_000 }] }

const happy = () => [
	tokenRoute,
	{ match: /character-media/, reply: { body: media } },
	{ match: /\/equipment/, reply: { body: equipment } },
	{ match: /\/currencies/, reply: { body: currencies } },
	{ match: /\/profile\/wow\/character\/[^/]+\/[^/?]+\?/, reply: { body: summary } },
]

const enrich = (id = 'arman-archimonde') =>
	POST(new Request('http://localhost/x', { method: 'POST' }), { params: Promise.resolve({ id }) })

beforeEach(async () => {
	store.length = 0
	characters.length = 0
	updates.length = 0
	cookieJar.clear()
	// No bnetAccessToken on the user: the user's OAuth token must not be needed (it expires after 24 h)
	store.push({ id: 'u1', email: 'a@b.fr' })
	characters.push(structuredClone(stored))
	cookieJar.set('azero_session', await createSessionToken({ id: 'u1', email: 'a@b.fr', username: 'A' } as never))
})
afterEach(restoreFetch)

// Run first: the client token is cached at module level once obtained.
test('when no Battle.net token can be obtained the answer is 503 and nothing is written', async () => {
	mockFetch([{ match: /oauth\.battle\.net/, reply: { status: 401 } }])
	const res = await enrich()
	assert.equal(res.status, 503)
	assert.deepEqual(await res.json(), { error: 'Battle.net est indisponible. Réessayez dans un instant.' })
	assert.equal(updates.length, 0)
})

test('enriches with the client-credentials token, without any user OAuth token', async () => {
	mockFetch(happy())
	const res = await enrich()
	assert.equal(res.status, 200)
	const { character } = await res.json()
	assert.deepEqual(
		[character.ilvl, character.spec, character.guildName, character.gold],
		[710, 'Mortelle', 'Autre', 500],
	)
	assert.equal(updates.length, 1)
	assert.ok(calls.some((u) => u.includes('oauth.battle.net')))
})

const summaryReplies = (reply: { status: number } | Error) => [
	tokenRoute,
	{ match: /character-media/, reply: { body: media } },
	{ match: /\/equipment/, reply: { body: equipment } },
	{ match: /\/currencies/, reply: { body: currencies } },
	{ match: /\/profile\/wow\//, reply },
]

test('a real Blizzard 404 on the summary (renamed or transferred) is a 404 and nothing is written', async () => {
	mockFetch(summaryReplies({ status: 404 }))
	const res = await enrich()
	assert.equal(res.status, 404)
	assert.deepEqual(await res.json(), { error: 'Personnage introuvable' })
	assert.equal(updates.length, 0)
	assert.deepEqual(characters[0], stored)
})

test('any other summary failure is a 502 with the Battle.net message and nothing is written', async () => {
	for (const reply of [{ status: 401 }, { status: 429 }, { status: 500 }, new Error('ECONNRESET')]) {
		mockFetch(summaryReplies(reply))
		const res = await enrich()
		assert.equal(res.status, 502, JSON.stringify(reply))
		assert.deepEqual(await res.json(), { error: 'Battle.net est indisponible. Réessayez dans un instant.' })
	}
	assert.equal(updates.length, 0)
	assert.deepEqual(characters[0], stored)
})

test('failing optional parts (media, equipment, currencies) keep the stored values', async () => {
	mockFetch([
		tokenRoute,
		{ match: /character-media/, reply: { status: 500 } },
		{ match: /\/equipment/, reply: { status: 500 } },
		{ match: /\/currencies/, reply: { status: 500 } },
		{ match: /\/profile\/wow\/character\/[^/]+\/[^/?]+\?/, reply: { body: summary } },
	])
	assert.equal((await enrich()).status, 200)
	const { set } = updates[0]
	for (const k of ['avatarUrl', 'gold', 'slotsLeft', 'slotsRight', 'slotsWeapon']) assert.equal(k in set, false, k)
	assert.equal(set.ilvl, 710)
	assert.equal(characters[0].gold, 1234)
	assert.deepEqual(characters[0].slotsLeft, stored.slotsLeft)
})

test("401 without a session and 404 for a character that is not the same user's", async () => {
	mockFetch(happy())
	assert.equal((await enrich('bob-archimonde')).status, 404)
	cookieJar.clear()
	assert.equal((await enrich()).status, 401)
	assert.equal(updates.length, 0)
})
