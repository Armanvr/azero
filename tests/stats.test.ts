import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mapStats } from '@/lib/services/character'

type Stats = Record<string, unknown>
const map = (s: Stats | null) => mapStats(s as never)

// Shaped like Blizzard's /profile/wow/character/{realm}/{name}/statistics
const blizzard = (over: Stats = {}): Stats => ({
	health: 1234567,
	power: { effective: 100000 } as never,
	strength: { base: 400, effective: 400 },
	agility: { base: 3100, effective: 3100 },
	intellect: { base: 500, effective: 500 },
	stamina: { base: 90000, effective: 91234 },
	melee_crit: { rating: 800, rating_bonus: 20, value: 22.4 },
	melee_haste: { rating: 900, rating_bonus: 12, value: 14.6 },
	spell_crit: { rating: 800, rating_bonus: 20, value: 22.4 },
	spell_haste: { rating: 900, rating_bonus: 12, value: 14.6 },
	mastery: { rating: 700, value: 31.9 },
	versatility: 450,
	versatility_damage_done_bonus: 8.2,
	...over,
})

const pct = (r: ReturnType<typeof mapStats>, label: string) => r?.secondary.find((s) => s.label === label)?.pct

test('main stat is the highest of strength / agility / intellect, with its French label', () => {
	assert.deepEqual(map(blizzard())?.primary[0], { label: 'Agilité', value: 3100 })
	assert.deepEqual(map(blizzard({ strength: { effective: 9000 } }))?.primary[0], { label: 'Force', value: 9000 })
	assert.deepEqual(map(blizzard({ intellect: { effective: 9000 } }))?.primary[0], {
		label: 'Intelligence',
		value: 9000,
	})
})

test('Endurance is the second primary stat', () => {
	assert.deepEqual(map(blizzard())?.primary[1], { label: 'Endurance', value: 91234 })
})

test('main stat uses the effective value, not base', () => {
	const r = map(blizzard({ agility: { base: 100, effective: 5000 }, strength: { base: 4000, effective: 10 } }))
	assert.deepEqual(r?.primary[0], { label: 'Agilité', value: 5000 })
})

test('haste comes from spell haste first, then melee haste', () => {
	assert.equal(pct(map(blizzard({ spell_haste: { value: 10 }, melee_haste: { value: 20 } })), 'Hâte'), 10)
	const noSpell = blizzard({ melee_haste: { value: 20 } })
	delete noSpell.spell_haste
	assert.equal(pct(map(noSpell), 'Hâte'), 20)
})

test('a spell haste of exactly 0 is kept and not replaced by melee haste', () => {
	assert.equal(pct(map(blizzard({ spell_haste: { value: 0 }, melee_haste: { value: 20 } })), 'Hâte'), 0)
})

test('crit is the higher of spell and melee crit, whichever is present', () => {
	assert.equal(pct(map(blizzard({ spell_crit: { value: 20.1 }, melee_crit: { value: 25.7 } })), 'Critique'), 25.7)
	assert.equal(pct(map(blizzard({ spell_crit: { value: 30 }, melee_crit: { value: 25.7 } })), 'Critique'), 30)
	const onlyMelee = blizzard({ melee_crit: { value: 25.7 } })
	delete onlyMelee.spell_crit
	assert.equal(pct(map(onlyMelee), 'Critique'), 25.7)
})

test('mastery and versatility are mapped (versatility from the damage bonus)', () => {
	const r = map(blizzard())
	assert.equal(pct(r, 'Maîtrise'), 31.9)
	assert.equal(pct(r, 'Polyvalence'), 8.2)
})

test('secondary stats come out in the order Hâte, Critique, Maîtrise, Polyvalence', () => {
	assert.deepEqual(
		map(blizzard())?.secondary.map((s) => s.label),
		['Hâte', 'Critique', 'Maîtrise', 'Polyvalence'],
	)
})

test('percentages are rounded to one decimal', () => {
	const r = map(
		blizzard({
			spell_haste: { value: 14.64 },
			spell_crit: { value: 22.449 },
			mastery: { value: 17.25 },
			versatility_damage_done_bonus: 8.2499,
		}),
	)
	assert.equal(pct(r, 'Hâte'), 14.6)
	assert.equal(pct(r, 'Critique'), 22.4)
	assert.equal(pct(r, 'Maîtrise'), 17.3)
	assert.equal(pct(r, 'Polyvalence'), 8.2)
})

test('missing secondary fields are dropped, never shown as 0', () => {
	const r = map({ agility: { effective: 3000 }, stamina: { effective: 80000 }, mastery: { value: 12 } })
	assert.deepEqual(r?.secondary, [{ label: 'Maîtrise', pct: 12 }])
})

test('a response with no secondary stats yields an empty secondary list', () => {
	assert.deepEqual(map({ agility: { effective: 3000 }, stamina: { effective: 80000 } })?.secondary, [])
})

test('a null versatility bonus is dropped, never shown as 0', () => {
	assert.equal(pct(map(blizzard({ versatility_damage_done_bonus: null })), 'Polyvalence'), undefined)
})

test('null input gives no stats', () => {
	assert.ok(!map(null))
})

test('EMPTY object input gives no stats (instead of Force 0 / Endurance 0)', () => {
	assert.ok(!map({}), `got ${JSON.stringify(map({}))}`)
})
