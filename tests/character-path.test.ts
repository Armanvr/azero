import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiPathFromParams, characterPath, realmSlug } from '@/lib/characterPath'

test('realmSlug: accents, apostrophes and spaces', () => {
	assert.equal(realmSlug('Chants éternels'), 'chants-eternels')
	assert.equal(realmSlug("Kael'thas"), 'kaelthas')
	assert.equal(realmSlug('Kael’thas'), 'kaelthas')
})

test('realmSlug: other punctuation is dropped, letters of any script are kept', () => {
	assert.equal(realmSlug('Aggra (Português)'), 'aggra-portugues')
	assert.equal(realmSlug('arch/../../x'), 'archx')
	assert.equal(realmSlug('Гордунни'), 'гордунни')
	assert.equal(realmSlug('()'), '')
	assert.equal(realmSlug(' -- '), '')
})

test('realmSlug is idempotent on real slugs', () => {
	for (const slug of ['chants-eternels', 'kaelthas', 'aggra-portugues', 'drek-thar', 'howling-fjord'])
		assert.equal(realmSlug(slug), slug)
})

test('characterPath: accented name and realm become a Blizzard ASCII realm slug', () => {
	assert.equal(characterPath('Kratós', 'Chants éternels'), '/personnage/chants-eternels/krat%C3%B3s')
	assert.equal(characterPath('Jaina', "Kael'thas"), '/personnage/kaelthas/jaina')
})

test('characterPath: the realm segment is encoded, it cannot change the route', () => {
	assert.equal(
		characterPath('Jaina', 'Гордунни'),
		'/personnage/%D0%B3%D0%BE%D1%80%D0%B4%D1%83%D0%BD%D0%BD%D0%B8/jaina',
	)
	assert.equal(characterPath('Jaina', 'a?b'), '/personnage/ab/jaina')
	assert.equal(characterPath('Jaina', 'a/b'), '/personnage/ab/jaina')
})

test('apiPathFromParams: useParams values (already percent-encoded) are not encoded twice', () => {
	// Next 16 useParams() returns the raw encoded segment, e.g. "Krat%C3%B3s"
	assert.equal(
		apiPathFromParams({ realm: 'chants-eternels', name: 'Krat%C3%B3s' }),
		'/api/characters/public/chants-eternels/krat%C3%B3s',
	)
})

test('apiPathFromParams: a malformed percent-sequence falls back to the raw segment instead of throwing', () => {
	assert.equal(apiPathFromParams({ realm: '100%', name: 'Krat%C3%B3s' }), '/api/characters/public/100%25/krat%C3%B3s')
	assert.equal(apiPathFromParams({ realm: 'hyjal', name: '%E0%A4%A' }), '/api/characters/public/hyjal/%25e0%25a4%25a')
})
