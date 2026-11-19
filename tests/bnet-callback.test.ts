import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/bnet/callback/route'
import { POST as disconnect } from '@/app/api/auth/bnet/disconnect/route'
import { createSessionToken } from '@/lib/auth'
import { characters, store, userUpdates } from '@/tests/stubs/db'
import { calls, mockFetch, restoreFetch } from '@/tests/stubs/fetch'
import { cookieJar } from '@/tests/stubs/headers'

process.env.BNET_CLIENT_ID = 'id'
process.env.BNET_CLIENT_SECRET = 'secret'
process.env.BNET_REDIRECT_URI = 'http://localhost/api/auth/bnet/callback'

const USER_TOKEN = 'user-oauth-token'
const wowProfile = {
	wow_accounts: [
		{
			characters: [
				{
					name: 'Élise',
					realm: { name: 'Archimonde', slug: 'archimonde' },
					playable_class: { id: 8, name: 'Mage' },
					playable_race: { id: 10, name: 'Elfe de sang' },
					faction: { type: 'HORDE' },
					level: 90,
				},
			],
		},
	],
}
const routes = () => [
	{ match: /oauth\.battle\.net\/token/, reply: { body: { access_token: USER_TOKEN } } },
	{ match: /\/profile\/user\/wow/, reply: { body: wowProfile } },
]

const link = () => GET(new NextRequest('http://localhost/api/auth/bnet/callback?code=c&state=s'))

beforeEach(async () => {
	store.length = 0
	characters.length = 0
	userUpdates.length = 0
	cookieJar.clear()
	// An existing document from before: it still holds the user's OAuth token
	store.push({ id: 'u1', email: 'a@b.fr', bnetAccessToken: 'old-token' })
	cookieJar.set('azero_session', await createSessionToken({ id: 'u1', email: 'a@b.fr', username: 'A' } as never))
	cookieJar.set('bnet_oauth_state', 's')
})
afterEach(restoreFetch)

test('linking uses the fresh token in memory but never persists it, and removes a stored one', async () => {
	mockFetch(routes())
	const res = await link()
	assert.equal(new URL(res.headers.get('location') as string).pathname, '/profil')

	const charsCall = calls.find((u) => u.includes('/profile/user/wow'))
	assert.ok(charsCall, 'the characters were listed')

	assert.equal(store[0].bnetConnected, true)
	assert.equal('bnetAccessToken' in store[0], false)
	assert.deepEqual(userUpdates[0].update.$unset, { bnetAccessToken: '' })
	// the field is no longer in the schema: Mongoose drops an $unset on an unknown path unless strict is off
	assert.equal(userUpdates[0].options?.strict, false)
	assert.ok(!JSON.stringify([store, userUpdates, characters]).includes(USER_TOKEN))
	assert.deepEqual(
		characters.map((c) => [c.name, c.realmSlug]),
		[['Élise', 'archimonde']],
	)
})

test('disconnect still unsets a token stored before, with strict off', async () => {
	assert.equal((await disconnect()).status, 200)
	assert.equal('bnetAccessToken' in store[0], false)
	assert.equal(store[0].bnetConnected, false)
	assert.equal(userUpdates[0].options?.strict, false)
})
