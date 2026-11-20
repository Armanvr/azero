import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { bnetToCharacter, findUserCharacter, mapEquipment, resolveClass } from '@/lib/services/character'
import type { BnetCharacter } from '@/lib/types'
import { characters } from '@/tests/stubs/db'

const realFetch = globalThis.fetch
const requested: string[] = []

beforeEach(() => {
	requested.length = 0
	characters.length = 0
	globalThis.fetch = (async (url: string) => {
		requested.push(String(url))
		const id = /media\/item\/(\d+)/.exec(String(url))?.[1]
		if (id === '404') return { ok: false, status: 404, json: async () => ({}) }
		return {
			ok: true,
			status: 200,
			json: async () => ({ assets: [{ key: 'icon', value: `https://icons/${id}.jpg` }] }),
		}
	}) as unknown as typeof fetch
})
afterEach(() => {
	globalThis.fetch = realFetch
})

type Equipment = NonNullable<Parameters<typeof mapEquipment>[0]>

// Real Blizzard payloads can omit fields the service types as required, hence the cast
const item = (slot: string, id: number | undefined, extra: Record<string, unknown> = {}) =>
	({
		slot: { type: slot },
		item: id === undefined ? undefined : { id },
		quality: { type: 'EPIC' },
		name: `Item ${id}`,
		level: { value: 600 },
		...extra,
	}) as unknown as NonNullable<Equipment['equipped_items']>[number]

test('mapEquipment: columns, second ring/trinket, unknown slot, item without id, enchant, rarity, icons', async () => {
	const out = await mapEquipment(
		{
			equipped_items: [
				item('HEAD', 1),
				item('FINGER_1', 2),
				item('FINGER_2', 3),
				item('TRINKET_1', 4),
				item('TRINKET_2', 5),
				item('RANGED', 6),
				item('WAIST', 7, { quality: { type: 'WEIRD' } }),
				item('SHIRT', undefined, { level: undefined, name: undefined }),
				item('MAIN_HAND', 8, {
					quality: { type: 'LEGENDARY' },
					enchantments: [
						{ display_string: 'Gem', enchantment_slot: { type: 'SOCKET' } },
						{ display_string: 'Enchanté : Foi', enchantment_slot: { type: 'PERMANENT' } },
					],
				}),
				item('OFF_HAND', 404, { quality: { type: 'POOR' } }),
			],
		},
		'tok',
	)

	assert.deepEqual(
		out.slotsLeft.map((s) => s.id),
		['head', 'shirt'],
	)
	assert.deepEqual(
		out.slotsRight.map((s) => s.id),
		['ring1', 'ring2', 'trinket1', 'trinket2', 'belt'],
	)
	assert.deepEqual(
		out.slotsWeapon.map((s) => s.id),
		['mainhand', 'offhand'],
	)
	assert.equal(out.slotsRight[1].label, 'Anneau 2')
	assert.equal(out.slotsRight[3].label, 'Bijou 2')
	assert.equal(out.slotsRight[4].rarity, 'common')
	assert.deepEqual(out.slotsLeft[0], {
		id: 'head',
		label: 'Tête',
		item: 'Item 1',
		itemId: 1,
		ilvl: 600,
		enchant: null,
		rarity: 'epic',
		iconUrl: 'https://icons/1.jpg',
	})
	const shirt = out.slotsLeft[1]
	assert.deepEqual([shirt.item, shirt.itemId, shirt.ilvl, shirt.iconUrl], ['', undefined, 0, undefined])
	assert.equal(out.slotsWeapon[0].enchant, 'Enchanté : Foi')
	assert.equal(out.slotsWeapon[0].rarity, 'legendary')
	assert.equal(out.slotsWeapon[1].iconUrl, undefined)
	assert.equal(out.slotsWeapon[1].rarity, 'common')
	// no icon request for the item without id
	assert.equal(requested.length, 9)
})

test('mapEquipment: raw UI markup is stripped from the enchant text', async () => {
	const ench = (display_string: string) => ({
		enchantments: [{ display_string, enchantment_slot: { type: 'PERMANENT' } }],
	})
	const out = await mapEquipment(
		{
			equipped_items: [
				item('HEAD', 1, ench("Enchanté : Rune des Ren'dorei |A:Professions-ChatIcon-Quality-12-Tier2:20:20|a")),
				item('NECK', 2, ench('|cnIQ4:Enchanté : Foi|r |A:a:1:1|a|A:b:2:2|a ')),
				item('BACK', 3, ench('Enchanté : Foi')),
			],
		},
		'tok',
	)
	assert.deepEqual(
		out.slotsLeft.map((s) => s.enchant),
		["Enchanté : Rune des Ren'dorei", 'Enchanté : Foi', 'Enchanté : Foi'],
	)
})

test('mapEquipment keeps the Blizzard variant label', async () => {
	const out = await mapEquipment(
		{
			equipped_items: [
				item('HEAD', 1, { name_description: { display_string: 'Héroïque' } }),
				item('NECK', 2, { name_description: { display_string: '|cnIQ4:Mythique|r' } }),
				item('BACK', 3, { name_description: { display_string: '  ' } }),
				item('WRIST', 4),
			],
		},
		'tok',
	)
	assert.deepEqual(
		out.slotsLeft.map((s) => s.variant),
		['Héroïque', 'Mythique', undefined, undefined],
	)
	assert.equal('variant' in out.slotsLeft[3], false)
})

test('mapEquipment: an item worn twice has its icon fetched once', async () => {
	const out = await mapEquipment({ equipped_items: [item('FINGER_1', 7), item('FINGER_2', 7)] }, 'tok')
	assert.equal(requested.length, 1)
	assert.deepEqual(
		out.slotsRight.map((s) => s.iconUrl),
		['https://icons/7.jpg', 'https://icons/7.jpg'],
	)
})

test('mapEquipment: missing equipment gives empty columns and no request', async () => {
	assert.deepEqual(await mapEquipment(null, 't'), { slotsLeft: [], slotsRight: [], slotsWeapon: [] })
	assert.equal(requested.length, 0)
})

test('bnetToCharacter and resolveClass: defaults and id format', () => {
	assert.deepEqual(resolveClass(999), { wowClass: 'Guerrier' })
	const c = bnetToCharacter({
		name: 'Arthas',
		realm: 'Hyjal',
		realmSlug: 'hyjal',
		classId: 2,
		raceName: 'Humain',
		faction: 'alliance',
	} as BnetCharacter)
	assert.equal(c.id, 'arthas-hyjal')
	assert.equal(c.class, 'Paladin')
	assert.deepEqual(
		[c.title, c.spec, c.ilvl, c.guild, c.gold, c.avatarUrl, c.slotsLeft, c.slotsRight, c.slotsWeapon],
		['', '', 0, '', 0, undefined, [], [], []],
	)
})

test('findUserCharacter: case-insensitive on name, scoped to user, regex metacharacters are literal', async () => {
	characters.push(
		{ userId: 'u1', name: 'Arthas', realmSlug: 'hyjal' },
		{ userId: 'u1', name: 'Bob', realmSlug: 'hyjal' },
		{ userId: 'u2', name: 'Eve', realmSlug: 'hyjal' },
		{ userId: 'u1', name: 'Ann', realmSlug: 'drek-thar' },
	)
	assert.equal((await findUserCharacter('u1', 'arthas-hyjal'))?.name, 'Arthas')
	assert.equal((await findUserCharacter('u1', 'ann-drek-thar'))?.name, 'Ann')
	assert.equal(await findUserCharacter('u1', 'eve-hyjal'), null)
	assert.equal(await findUserCharacter('u1', 'nodash'), null)
	assert.equal(await findUserCharacter('u1', '.*-hyjal'), null)
	assert.equal(await findUserCharacter('u1', 'a.*-hyjal'), null)
	assert.equal(await findUserCharacter('u1', '(arthas|bob)-hyjal'), null)
})
