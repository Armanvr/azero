import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { resolveRealm } from '@/lib/services/realm'
import { calls, mockFetch, restoreFetch, tokenRoute } from '@/tests/stubs/fetch'

process.env.BNET_CLIENT_ID = 'id'
process.env.BNET_CLIENT_SECRET = 'secret'

const realm = (slug: string, name: Record<string, string>) => ({ slug, name })
const index = {
	realms: [
		realm('chants-eternels', { en_US: 'Eternal Song', fr_FR: 'Chants éternels' }),
		realm('arakarahm', { en_US: 'Arak-arahm', fr_FR: 'Arak-arahm' }),
		realm('aggra-portugues', { en_US: 'Aggra (Português)', pt_BR: 'Aggra (Português)' }),
		realm('gordunni', { en_US: 'Gordunni', ru_RU: 'Гордунни' }),
		realm('howling-fjord', { en_US: 'Howling Fjord', ru_RU: 'Ревущий фьорд' }),
		realm('kaelthas', { en_US: "Kael'thas", fr_FR: "Kael'thas" }),
	],
}
const indexRoute = { match: /\/data\/wow\/realm\/index/, reply: { body: index } }
const indexCalls = () => calls.filter((u) => u.includes('/data/wow/realm/index'))

afterEach(restoreFetch)

// Tests share the module-level realm cache and run in order, like bnet-get.test.ts.
test('when the realm index fails, it falls back to the slug rule and nothing is cached', async () => {
	mockFetch([tokenRoute, { match: /\/data\/wow\/realm\/index/, reply: { status: 500 } }])
	assert.equal(await resolveRealm('Chants éternels'), 'chants-eternels')
	assert.equal(await resolveRealm('Arak-arahm'), 'arak-arahm')
	assert.equal(indexCalls().length, 2)
})

test('the index is fetched without a locale so every realm name carries all locales', async () => {
	mockFetch([tokenRoute, indexRoute])
	assert.equal(await resolveRealm('hyjal'), 'hyjal')
	assert.equal(indexCalls().length, 1)
	const url = new URL(indexCalls()[0])
	assert.equal(url.searchParams.get('namespace'), 'dynamic-eu')
	assert.equal(url.searchParams.has('locale'), false)
})

test('slug, localised names, accents, apostrophes, parentheses and case all hit the same realm', async () => {
	mockFetch([])
	const hits: Array<[string, string]> = [
		['chants-eternels', 'chants-eternels'],
		['Chants éternels', 'chants-eternels'],
		['CHANTS ETERNELS', 'chants-eternels'],
		['Eternal Song', 'chants-eternels'],
		['Arak-arahm', 'arakarahm'],
		['arak arahm', 'arakarahm'],
		['Aggra (Português)', 'aggra-portugues'],
		['aggra portugues', 'aggra-portugues'],
		['Гордунни', 'gordunni'],
		['гордунни', 'gordunni'],
		['Ревущий фьорд', 'howling-fjord'],
		["Kael'thas", 'kaelthas'],
		['Kael’thas', 'kaelthas'],
	]
	for (const [input, slug] of hits) assert.equal(await resolveRealm(input), slug, input)
})

test('an unknown realm falls back to the slug rule', async () => {
	assert.equal(await resolveRealm('Royaume Inconnu'), 'royaume-inconnu')
	assert.equal(await resolveRealm('arch/../../x'), 'archx')
})

test('the index is reused for 24 hours without refetching, then shared by concurrent callers', async (t) => {
	assert.equal(calls.length, 0, 'the previous tests made no upstream call')
	t.mock.timers.enable({ apis: ['Date'], now: Date.now() })
	t.mock.timers.tick(23 * 3600_000)
	assert.equal(await resolveRealm('Гордунни'), 'gordunni')
	assert.equal(calls.length, 0)

	mockFetch([tokenRoute, indexRoute])
	t.mock.timers.tick(2 * 3600_000)
	const out = await Promise.all([
		resolveRealm('Гордунни'),
		resolveRealm('Eternal Song'),
		resolveRealm('Aggra (Português)'),
	])
	assert.deepEqual(out, ['gordunni', 'chants-eternels', 'aggra-portugues'])
	assert.equal(indexCalls().length, 1)
})

test('when the refresh of an expired index fails, the previous index keeps serving and the next call retries', async (t) => {
	// The previous test cached the index until 49 h from now (mocked clock, then restored)
	t.mock.timers.enable({ apis: ['Date'], now: Date.now() })
	t.mock.timers.tick(50 * 3600_000)

	mockFetch([tokenRoute, { match: /\/data\/wow\/realm\/index/, reply: { status: 500 } }])
	assert.equal(await resolveRealm('Arak-arahm'), 'arakarahm')
	assert.equal(await resolveRealm('Гордунни'), 'gordunni')
	assert.equal(indexCalls().length, 2, 'the failed refresh was not recorded as fresh')

	mockFetch([tokenRoute, indexRoute])
	assert.equal(await resolveRealm('Eternal Song'), 'chants-eternels')
	assert.equal(indexCalls().length, 1)
})
