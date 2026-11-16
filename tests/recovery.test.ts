import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'
import { POST as register } from '@/app/api/auth/register/route'
import { POST as reset } from '@/app/api/auth/reset/route'
import { POST as profileRecovery } from '@/app/api/profile/recovery-code/route'
import { authenticateUser } from '@/lib/auth'
import { store } from '@/tests/stubs/db'
import { cookieJar } from '@/tests/stubs/headers'

const INVALID = 'Email ou code de récupération invalide.'
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}(-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}){3}$/

const post = (handler: (r: Request) => Promise<Response>, body: unknown) =>
	handler(new Request('http://t/x', { method: 'POST', body: JSON.stringify(body) }))

const signUp = async (email = 'a@b.fr', password = 'pw-original') => {
	const res = await post(register, { email, username: 'Bob', password })
	return { res, json: await res.json() }
}

const noSecrets = (json: unknown) => {
	const s = JSON.stringify(json)
	assert.ok(!/passwordHash|recoveryCodeHash|\$2[aby]\$/.test(s), `leaked secret in ${s}`)
}

beforeEach(() => {
	store.length = 0
	cookieJar.clear()
})

describe('register', () => {
	test('returns a well-formed recovery code and no secrets', async () => {
		const { res, json } = await signUp()
		assert.equal(res.status, 200)
		assert.match(json.recoveryCode, CODE_RE)
		noSecrets(json)
	})

	test('only the hash is stored, never the code', async () => {
		const { json } = await signUp()
		const raw = json.recoveryCode.replaceAll('-', '')
		assert.ok(!JSON.stringify(store).includes(raw))
		assert.match(store[0].recoveryCodeHash as string, /^\$2[aby]\$/)
	})

	test('codes differ between accounts and never contain 0 O 1 I', async () => {
		const codes = new Set<string>()
		for (let i = 0; i < 10; i++) {
			const { json } = await signUp(`u${i}@b.fr`)
			assert.ok(!/[01OI]/.test(json.recoveryCode.replaceAll('-', '')))
			codes.add(json.recoveryCode)
		}
		assert.equal(codes.size, 10)
	})
})

describe('reset', () => {
	test('rotates the code and password; old ones die, new ones work', async () => {
		const { json: reg } = await signUp()
		const res = await post(reset, { email: 'a@b.fr', recoveryCode: reg.recoveryCode, password: 'pw-new' })
		const json = await res.json()
		assert.equal(res.status, 200)
		assert.equal(json.ok, true)
		assert.match(json.recoveryCode, CODE_RE)
		assert.notEqual(json.recoveryCode, reg.recoveryCode)
		assert.ok(cookieJar.get('azero_session'), 'session cookie set')
		noSecrets(json)

		await assert.rejects(authenticateUser('a@b.fr', 'pw-original'))
		await authenticateUser('a@b.fr', 'pw-new')

		const old = await post(reset, { email: 'a@b.fr', recoveryCode: reg.recoveryCode, password: 'pw-x' })
		assert.equal(old.status, 400)
		assert.deepEqual(await old.json(), { error: INVALID })

		const again = await post(reset, { email: 'a@b.fr', recoveryCode: json.recoveryCode, password: 'pw-third' })
		assert.equal(again.status, 200)
	})

	test('accepts lowercase, no dashes, extra whitespace, and email in other case', async () => {
		const { json: reg } = await signUp()
		const messy = ` ${reg.recoveryCode.toLowerCase().replaceAll('-', ' ')} `
		const res = await post(reset, { email: '  A@B.fr ', recoveryCode: messy, password: 'pw-new' })
		assert.equal(res.status, 200)
	})

	test('unknown email, account without code, wrong code give the identical response', async () => {
		const { json: reg } = await signUp()
		store.push({ id: 'legacy', email: 'old@b.fr', username: 'L', passwordHash: 'x', createdAt: '' })
		const cases = [
			{ email: 'nobody@b.fr', recoveryCode: reg.recoveryCode },
			{ email: 'old@b.fr', recoveryCode: reg.recoveryCode },
			{ email: 'a@b.fr', recoveryCode: 'AAAA-AAAA-AAAA-AAAA' },
		]
		for (const c of cases) {
			const res = await post(reset, { ...c, password: 'pw-new' })
			assert.equal(res.status, 400)
			assert.deepEqual(await res.json(), { error: INVALID })
		}
		await authenticateUser('a@b.fr', 'pw-original')
	})

	test('failed reset does not log in nor change anything', async () => {
		await signUp()
		cookieJar.clear()
		await post(reset, { email: 'a@b.fr', recoveryCode: 'AAAA-AAAA-AAAA-AAAA', password: 'pw-new' })
		assert.ok(!cookieJar.has('azero_session'))
		await authenticateUser('a@b.fr', 'pw-original')
	})

	test('non-string or missing fields give 400 Champs requis manquants', async () => {
		const { json: reg } = await signUp()
		const ok = { email: 'a@b.fr', recoveryCode: reg.recoveryCode, password: 'pw-new' }
		const bad = [
			{ ...ok, email: { $ne: null } },
			{ ...ok, recoveryCode: 123 },
			{ ...ok, recoveryCode: ['x'] },
			{ ...ok, password: { a: 1 } },
			{ ...ok, password: '' },
			{ ...ok, email: undefined },
			{},
		]
		for (const b of bad) {
			const res = await post(reset, b)
			assert.equal(res.status, 400, JSON.stringify(b))
			assert.deepEqual(await res.json(), { error: 'Champs requis manquants.' })
		}
	})
})

describe('profile recovery-code', () => {
	test('401 without session', async () => {
		const res = await post(profileRecovery, { password: 'x' })
		assert.equal(res.status, 401)
	})

	test('wrong password -> 400, code unchanged; right password -> new code, old dead', async () => {
		const { json: reg } = await signUp()
		const wrong = await post(profileRecovery, { password: 'nope' })
		assert.equal(wrong.status, 400)
		assert.deepEqual(await wrong.json(), { error: 'Mot de passe incorrect.' })

		const missing = await post(profileRecovery, { password: 42 })
		assert.equal(missing.status, 400)

		const res = await post(profileRecovery, { password: 'pw-original' })
		const json = await res.json()
		assert.equal(res.status, 200)
		assert.match(json.recoveryCode, CODE_RE)
		assert.notEqual(json.recoveryCode, reg.recoveryCode)
		noSecrets(json)

		const old = await post(reset, { email: 'a@b.fr', recoveryCode: reg.recoveryCode, password: 'pw-new' })
		assert.equal(old.status, 400)
		const fresh = await post(reset, { email: 'a@b.fr', recoveryCode: json.recoveryCode, password: 'pw-new' })
		assert.equal(fresh.status, 200)
	})
})
