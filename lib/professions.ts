import type { CharacterProfession, ProfessionCharacter, ProfessionTier, RecipeRef, TierCatalog } from '@/lib/types'

/** Lowercase, accent-free: « Élixir » and « elixir » compare equal. */
export function normalize(s: string): string {
	return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export type RecipeStatus = 'known' | 'missing' | 'unknown'

/** Missing only when Blizzard answered for the character AND the catalog is loaded: otherwise unknown, never missing. */
export function recipeStatus(known: boolean, professionsKnown: boolean, catalogLoaded: boolean): RecipeStatus {
	if (known) return 'known'
	return professionsKnown && catalogLoaded ? 'missing' : 'unknown'
}

export const STATUS_LABELS: Record<RecipeStatus, string> = {
	known: 'Apprise',
	missing: 'Non apprise',
	unknown: 'Inconnu',
}

/** Learned = known recipes present in the catalog; a known recipe missing from the catalog does not count. */
export function tierStats(catalog: TierCatalog, knownIds: Set<number>) {
	const ids = new Set(catalog.categories.flatMap((c) => c.recipes.map((r) => r.id)))
	let learned = 0
	for (const id of ids) if (knownIds.has(id)) learned++
	const total = ids.size
	return { total, learned, missing: total - learned, pct: total > 0 ? Math.round((learned / total) * 100) : 0 }
}

/** Tier of one expansion (label), or the most recent one when no expansion is asked. */
export function pickTier(p: CharacterProfession, expansion?: string): ProfessionTier | undefined {
	return expansion ? p.tiers.find((t) => t.expansion === expansion) : p.tiers[0]
}

/** Skill/max to display: the tier's, or the profession's own for Archéologie (no tiers). */
export function skillOf(p: CharacterProfession, tier?: ProfessionTier): { skill: number; max: number } | null {
	if (tier) return { skill: tier.skill, max: tier.max }
	if (p.tiers.length === 0 && p.max !== undefined) return { skill: p.skill ?? 0, max: p.max }
	return null
}

export const pctOf = (skill: number, max: number) => (max > 0 ? Math.min(100, (skill / max) * 100) : 0)

export interface RecipeHit {
	char: ProfessionCharacter
	profession: CharacterProfession
	tier: ProfessionTier
}
export interface RecipeGroup {
	recipe: RecipeRef
	hits: RecipeHit[]
}

/** Known recipes matching the query across every character, grouped by recipe id. Query under 2 chars → no result. */
export function searchRecipes(characters: ProfessionCharacter[], query: string): RecipeGroup[] {
	const q = normalize(query)
	if (q.length < 2) return []
	const groups = new Map<number, RecipeGroup>()
	for (const char of characters)
		for (const profession of char.professions)
			for (const tier of profession.tiers)
				for (const recipe of tier.knownRecipes) {
					if (!normalize(recipe.name).includes(q)) continue
					const g = groups.get(recipe.id) ?? { recipe, hits: [] }
					g.hits.push({ char, profession, tier })
					groups.set(recipe.id, g)
				}
	const collator = new Intl.Collator('fr')
	return [...groups.values()].sort((a, b) => collator.compare(a.recipe.name, b.recipe.name))
}

export const detailPath = (charId: string, professionId: number, tierId?: number, recipeId?: number) => {
	const qs = new URLSearchParams()
	if (tierId !== undefined) qs.set('tier', String(tierId))
	if (recipeId !== undefined) qs.set('recette', String(recipeId))
	const s = qs.toString()
	return `/metiers/${encodeURIComponent(charId)}/${professionId}${s ? `?${s}` : ''}`
}
