import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	detailPath,
	normalize,
	pctOf,
	pickTier,
	recipeStatus,
	searchRecipes,
	skillOf,
	tierStats,
} from '@/lib/professions'
import type { CharacterProfession, ProfessionCharacter, ProfessionTier, TierCatalog } from '@/lib/types'

const mkTier = (id: number, expansion: string, known: Array<[number, string]> = []): ProfessionTier => ({
	id,
	name: `${expansion} tier`,
	expansion,
	expansionOrder: id,
	skill: 10,
	max: 100,
	knownRecipes: known.map(([i, name]) => ({ id: i, name })),
})
const mkProf = (id: number, name: string, tiers: ProfessionTier[], extra: Partial<CharacterProfession> = {}) =>
	({ id, name, kind: 'primary', hasRecipes: true, tiers, ...extra }) as CharacterProfession
const mkChar = (name: string, professions: CharacterProfession[], professionsKnown = true): ProfessionCharacter => ({
	id: `${name.toLowerCase()}-archimonde`,
	name,
	realmSlug: 'archimonde',
	class: 'Voleur',
	spec: '',
	level: 90,
	professionsKnown,
	professions,
})

test('normalize ignores case, accents and surrounding spaces', () => {
	assert.equal(normalize('  Élixir de Pêche '), 'elixir de peche')
})

test('searchRecipes: case and accent insensitive', () => {
	const chars = [mkChar('A', [mkProf(171, 'Alchimie', [mkTier(1, 'Midnight', [[1, 'Élixir de force']])])])]
	assert.equal(searchRecipes(chars, 'ELIXIR').length, 1)
	assert.equal(searchRecipes(chars, 'élixir').length, 1)
	assert.equal(searchRecipes(chars, 'xyz').length, 0)
})

test('searchRecipes: fewer than 2 characters returns nothing', () => {
	const chars = [mkChar('A', [mkProf(171, 'Alchimie', [mkTier(1, 'Midnight', [[1, 'Élixir']])])])]
	assert.deepEqual(searchRecipes(chars, ''), [])
	assert.deepEqual(searchRecipes(chars, 'e'), [])
	assert.deepEqual(searchRecipes(chars, ' e '), [])
	assert.equal(searchRecipes(chars, 'el').length, 1)
})

test('searchRecipes: one group per recipe, with every character that knows it', () => {
	const chars = [
		mkChar('A', [mkProf(171, 'Alchimie', [mkTier(1, 'Midnight', [[1, 'Élixir']])])]),
		mkChar('B', [
			mkProf(171, 'Alchimie', [
				mkTier(1, 'Midnight', [
					[1, 'Élixir'],
					[2, 'Élixir majeur'],
				]),
			]),
		]),
	]
	const groups = searchRecipes(chars, 'elixir')
	assert.deepEqual(
		groups.map((g) => [g.recipe.id, g.hits.map((h) => h.char.name)]),
		[
			[1, ['A', 'B']],
			[2, ['B']],
		],
	)
})

test('searchRecipes: includes Cuisine, ignores professions without known recipes', () => {
	const cuisine = mkProf(185, 'Cuisine', [mkTier(1, 'Midnight', [[9, 'Ragoût']])], { kind: 'secondary' })
	const peche = mkProf(356, 'Pêche', [mkTier(2, 'Midnight')], { hasRecipes: false })
	const groups = searchRecipes([mkChar('A', [cuisine, peche])], 'ragout')
	assert.equal(groups.length, 1)
	assert.equal(groups[0].hits[0].profession.id, 185)
})

test('recipeStatus: known wins, missing only when professions are known AND the catalog is loaded', () => {
	assert.equal(recipeStatus(true, false, false), 'known')
	assert.equal(recipeStatus(false, true, true), 'missing')
	assert.equal(recipeStatus(false, false, true), 'unknown')
	assert.equal(recipeStatus(false, true, false), 'unknown')
	assert.equal(recipeStatus(false, false, false), 'unknown')
})

const catalog: TierCatalog = {
	id: 1,
	name: 'T',
	categories: [
		{
			name: 'a',
			recipes: [
				{ id: 1, name: 'x' },
				{ id: 2, name: 'y' },
			],
		},
		{
			name: 'b',
			recipes: [
				{ id: 2, name: 'y' },
				{ id: 3, name: 'z' },
				{ id: 4, name: 'w' },
			],
		},
	],
}

test('tierStats: counts distinct catalog recipes, a recipe listed twice counts once', () => {
	assert.deepEqual(tierStats(catalog, new Set([1, 2])), { total: 4, learned: 2, missing: 2, pct: 50 })
})

test('tierStats: a known recipe absent from the catalog does not count', () => {
	assert.deepEqual(tierStats(catalog, new Set([1, 999])), { total: 4, learned: 1, missing: 3, pct: 25 })
})

test('tierStats: empty catalog gives 0%, no division by zero', () => {
	assert.deepEqual(tierStats({ id: 1, name: 'T', categories: [] }, new Set([1])), {
		total: 0,
		learned: 0,
		missing: 0,
		pct: 0,
	})
})

test('pickTier: defaults to the most recent (first), an expansion label selects it, an unknown one gives undefined', () => {
	const p = mkProf(164, 'Forge', [mkTier(3, 'Midnight'), mkTier(2, 'The War Within')])
	assert.equal(pickTier(p)?.expansion, 'Midnight')
	assert.equal(pickTier(p, 'The War Within')?.id, 2)
	assert.equal(pickTier(p, 'Legion'), undefined)
	assert.equal(pickTier(mkProf(794, 'Archéologie', [])), undefined)
})

test('skillOf: the tier skill, else the entry skill (Archéologie), else null', () => {
	const t = mkTier(1, 'Midnight')
	assert.deepEqual(skillOf(mkProf(164, 'Forge', [t]), t), { skill: 10, max: 100 })
	assert.deepEqual(skillOf(mkProf(794, 'Archéologie', [], { skill: 40, max: 300 })), { skill: 40, max: 300 })
	assert.deepEqual(skillOf(mkProf(794, 'Archéologie', [], { max: 300 })), { skill: 0, max: 300 })
	assert.equal(skillOf(mkProf(164, 'Forge', [])), null)
})

test('pctOf: ratio capped at 100, 0 when max is 0', () => {
	assert.equal(pctOf(50, 100), 50)
	assert.equal(pctOf(150, 100), 100)
	assert.equal(pctOf(5, 0), 0)
})

test('detailPath: encodes the character id and only adds the given params', () => {
	assert.equal(detailPath('a b', 164), '/metiers/a%20b/164')
	assert.equal(detailPath('arman-archimonde', 164, 2822, 7), '/metiers/arman-archimonde/164?tier=2822&recette=7')
	assert.equal(detailPath('x', 164, undefined, 7), '/metiers/x/164?recette=7')
})
