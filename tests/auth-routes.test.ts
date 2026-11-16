import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { NextRequest } from 'next/server'
import { POST as login } from '@/app/api/auth/login/route'
import { createSessionToken, registerUser } from '@/lib/auth'
import { config, proxy } from '@/proxy'
import { store } from '@/tests/stubs/db'
import { cookieJar, cookieOptions } from '@/tests/stubs/headers'

const post = (body: unknown) =>
	login(
		new Request('http://localhost/api/auth/login', {
			method: 'POST',
			body: typeof body === 'string' ? body : JSON.stringify(body),
		}),
	)

beforeEach(async () => {
	store.length = 0
	cookieJar.clear()
	cookieOptions.clear()
	await registerUser({ email: 'a@b.fr', username: 'Arman', password: 'correct-horse' })
})

const creds = { email: 'a@b.fr', password: 'correct-horse' }
const maxAge = () => cookieOptions.get('azero_session')?.maxAge

test('login without `remember` sets a persistent cookie (7 days)', async () => {
	assert.equal((await post(creds)).status, 200)
	assert.equal(maxAge(), 60 * 60 * 24 * 7)
})

test('login with remember: true sets a persistent cookie', async () => {
	await post({ ...creds, remember: true })
	assert.equal(maxAge(), 60 * 60 * 24 * 7)
})

test('login with remember: false sets a session cookie (no max-age)', async () => {
	const res = await post({ ...creds, remember: false })
	assert.equal(res.status, 200)
	assert.ok(cookieJar.has('azero_session'))
	assert.equal(cookieOptions.get('azero_session')?.maxAge, undefined)
	assert.equal('maxAge' in (cookieOptions.get('azero_session') ?? {}), false)
})

test('the cookie stays httpOnly, lax, path / whatever `remember` is', async () => {
	await post({ ...creds, remember: false })
	assert.deepEqual(
		{ ...cookieOptions.get('azero_session') },
		{ httpOnly: true, secure: false, sameSite: 'lax', path: '/' },
	)
})

test('login returns the public user and never the hashes', async () => {
	const body = await (await post(creds)).json()
	assert.equal(body.ok, true)
	assert.deepEqual(Object.keys(body.user).sort(), ['email', 'id', 'username'])
})

test('login with missing fields is a 400', async () => {
	assert.equal((await post({ email: 'a@b.fr' })).status, 400)
	assert.equal((await post({})).status, 400)
	assert.equal(cookieJar.size, 0)
})

test('wrong password and unknown email give the same 401 and no cookie', async () => {
	const bad = await post({ ...creds, password: 'nope' })
	const unknown = await post({ email: 'x@y.fr', password: 'nope' })
	assert.equal(bad.status, 401)
	assert.equal(unknown.status, 401)
	assert.deepEqual(await bad.json(), await unknown.json())
	assert.equal(cookieJar.size, 0)
})

test('email is case and whitespace insensitive', async () => {
	assert.equal((await post({ ...creds, email: '  A@B.fr ' })).status, 200)
})

test('malformed JSON body is a 4xx client error, not "Erreur serveur"', async () => {
	const res = await post('{not json')
	const body = await res.json()
	assert.ok(res.status >= 400 && res.status < 500, `status ${res.status}`)
	assert.notEqual(body.error, 'Erreur serveur.')
})

test('non-string email / password is rejected as a 400, not a server error', async () => {
	const res = await post({ email: { $ne: null }, password: 'x' })
	assert.equal(res.status, 400)
})

// ---- proxy.ts ----

const req = (path: string, token?: string) =>
	new NextRequest(
		`http://localhost:3000${path}`,
		token ? { headers: { cookie: `azero_session=${token}` } } : undefined,
	)
const isRedirectTo = (res: Response, path: string) =>
	res.status >= 300 &&
	res.status < 400 &&
	new URL(res.headers.get('location') as string).pathname.replace(/(.)\/$/, '$1') === path
const passes = (res: Response) => res.headers.get('x-middleware-next') === '1'

const validToken = async () => createSessionToken({ id: 'u1', email: 'a@b.fr', username: 'Arman' } as never)

for (const path of ['/planning', '/metiers', '/profil', '/profil/', '/planning/sub']) {
	test(`${path} redirects to /auth without a session`, async () => {
		assert.ok(isRedirectTo(await proxy(req(path)), '/auth'))
	})
	test(`${path} redirects to /auth with a garbage session cookie`, async () => {
		assert.ok(isRedirectTo(await proxy(req(path, 'not.a.jwt')), '/auth'))
	})
	test(`${path} passes with a valid session`, async () => {
		assert.ok(passes(await proxy(req(path, await validToken()))))
	})
}

test('a session signed with another secret is refused', async () => {
	const { SignJWT } = await import('jose')
	const forged = await new SignJWT({ userId: 'u1' })
		.setProtectedHeader({ alg: 'HS256' })
		.setExpirationTime('1h')
		.sign(new TextEncoder().encode('some-other-secret-0123456789abcdef'))
	assert.ok(isRedirectTo(await proxy(req('/profil', forged)), '/auth'))
})

test('an expired session is refused', async () => {
	const { SignJWT } = await import('jose')
	const { getSecret } = await import('@/lib/session')
	const expired = await new SignJWT({ userId: 'u1' })
		.setProtectedHeader({ alg: 'HS256' })
		.setExpirationTime(Math.floor(Date.now() / 1000) - 10)
		.sign(getSecret())
	assert.ok(isRedirectTo(await proxy(req('/metiers', expired)), '/auth'))
})

for (const path of ['/', '/auth', '/personnage/archimonde/arman', '/planningx']) {
	test(`public page ${path} is not blocked without a session`, async () => {
		assert.ok(passes(await proxy(req(path))))
	})
}

test('a logged-in user visiting /auth is sent to /', async () => {
	assert.ok(isRedirectTo(await proxy(req('/auth', await validToken())), '/'))
})

test('the proxy matcher leaves /api/*, _next and static files alone but covers pages', () => {
	const re = new RegExp(`^${config.matcher[0]}$`)
	for (const p of ['/api/professions', '/api/auth/login', '/_next/static/x.js', '/favicon.ico'])
		assert.equal(re.test(p), false, p)
	for (const p of ['/planning', '/metiers', '/profil', '/auth', '/']) assert.equal(re.test(p), true, p)
})
