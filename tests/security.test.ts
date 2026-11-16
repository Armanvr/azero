import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { POST as login } from '@/app/api/auth/login/route'
import { POST as register } from '@/app/api/auth/register/route'
import { PUT as favorites } from '@/app/api/profile/favorites/route'
import { getSecret } from '@/lib/session'
import { store } from '@/tests/stubs/db'
import { cookieJar } from '@/tests/stubs/headers'

const call = (handler: (r: Request) => Promise<Response>, body: unknown, method = 'POST') =>
	handler(new Request('http://t/x', { method, body: JSON.stringify(body) }))

beforeEach(() => {
	store.length = 0
	cookieJar.clear()
})

test('unexpected errors return a generic message, user-facing ones keep theirs', async () => {
	const crash = await call(register, { email: { $ne: null }, username: 'Bob', password: 'pw' })
	assert.equal(crash.status, 400)
	assert.deepEqual(await crash.json(), { error: 'Erreur serveur.' })

	const wrong = await call(login, { email: 'nobody@b.fr', password: 'pw' })
	assert.equal(wrong.status, 401)
	assert.deepEqual(await wrong.json(), { error: 'Identifiants invalides.' })
})

test('favorites rejects malformed ids and keeps valid updates', async () => {
	await call(register, { email: 'a@b.fr', username: 'Bob', password: 'pw' })
	const put = (body: unknown) => call(favorites, body, 'PUT')
	for (const bad of [
		{ favoriteCharId: { $gt: '' } },
		{ subFavoriteCharIds: 'x' },
		{ subFavoriteCharIds: [1] },
		null,
	]) {
		assert.equal((await put(bad)).status, 400, JSON.stringify(bad))
	}
	assert.equal((await put({ favoriteCharId: 'bob-hyjal', subFavoriteCharIds: ['ann-hyjal'] })).status, 200)
	assert.equal(store[0].favoriteCharId, 'bob-hyjal')
	assert.equal((await put({ favoriteCharId: null })).status, 200)
	assert.equal(store[0].favoriteCharId, null)
})

test('the dev fallback secret is refused in production', () => {
	const env = process.env as Record<string, string | undefined>
	const saved = { NODE_ENV: env.NODE_ENV, AZERO_SESSION_SECRET: env.AZERO_SESSION_SECRET }
	try {
		env.NODE_ENV = 'production'
		delete env.AZERO_SESSION_SECRET
		assert.throws(getSecret, /AZERO_SESSION_SECRET/)
		env.AZERO_SESSION_SECRET = 'a-real-secret-of-at-least-32-characters'
		assert.ok(getSecret().length > 0)
	} finally {
		Object.assign(env, saved)
		if (saved.AZERO_SESSION_SECRET === undefined) delete env.AZERO_SESSION_SECRET
		if (saved.NODE_ENV === undefined) delete env.NODE_ENV
	}
})
