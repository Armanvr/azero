import type { CharacterTalents, TalentLoadout, TalentNode, TalentTree } from '@/lib/types'
import type { BnetResult } from './bnetToken'
import { cachedGet, mapIcon, STATIC, STATIC_MEDIA } from './professionService'

type Raw = BnetResult['data']

const TALENTS_TTL_MS = 60 * 60 * 1000
// Spell icons are one Blizzard call each (a tree has ~150): asked a few at a time, then cached for 7 days
const ICON_BATCH = 20

interface Tooltip {
	talent?: { id?: number; name?: string }
	spell_tooltip?: { spell?: { id?: number; name?: string }; description?: string }
}

/** Name, description and icon of one talent tooltip; null when Blizzard gives no name. */
function detail(t: Tooltip | undefined, icons: Map<number, string>) {
	const name = t?.talent?.name ?? t?.spell_tooltip?.spell?.name
	if (!name) return null
	const description = t?.spell_tooltip?.description
	const icon = icons.get(t?.spell_tooltip?.spell?.id ?? -1)
	return { name, ...(description ? { description } : {}), ...(icon ? { icon } : {}) }
}

/** A node of the static tree, with the character's selection (`entry`, undefined when not selected). Null when Blizzard names nothing. */
function fromStatic(n: Raw, entry: Raw | undefined, icons: Map<number, string>): TalentNode | null {
	const ranks: Raw[] = n.ranks ?? []
	const rank: number = entry?.rank ?? 0
	const base = {
		id: n.id,
		row: n.display_row ?? 0,
		col: n.display_col ?? 0,
		maxRank: Math.max(ranks.length, 1),
		rank,
		unlocks: n.unlocks ?? [],
	}

	const offered: Tooltip[] | undefined = ranks[0]?.choice_of_tooltips
	if (offered?.length) {
		const choices = offered.flatMap((c) => {
			const d = detail(c, icons)
			return d ? [{ ...d, selected: entry?.tooltip?.talent?.id === c.talent?.id }] : []
		})
		if (!choices.length) return null
		// Selected choice, else the node is shown as its choices side by side
		const shown = choices.find((c) => c.selected) ?? {
			name: choices.map((c) => c.name).join(' / '),
			icon: choices[0].icon,
			description: undefined,
		}
		return {
			...base,
			name: shown.name,
			...(shown.description ? { description: shown.description } : {}),
			...(shown.icon ? { icon: shown.icon } : {}),
			choices,
		}
	}

	const head = detail(entry?.tooltip ?? ranks[Math.max(rank, 1) - 1]?.tooltip, icons)
	return head && { ...base, ...head }
}

/** Without the static tree only the selected talents are known: no position, no links, no maximum rank. */
function fromEntry(e: Raw, icons: Map<number, string>): TalentNode | null {
	const head = detail(e.tooltip, icons)
	const rank: number = e.rank ?? 0
	// shortcut: maxRank = selected rank (the real maximum is only in the static tree), the UI lists nodes without positions
	return head && { id: e.id, row: 0, col: 0, maxRank: Math.max(rank, 1), rank, unlocks: [], ...head }
}

function mapTree(
	kind: TalentTree['kind'],
	name: string,
	staticNodes: Raw[] | null,
	selected: Raw[],
	icons: Map<number, string>,
): TalentTree {
	const picked = new Map<number, Raw>(selected.map((e) => [e.id, e]))
	const found = (
		staticNodes
			? staticNodes.map((n) => fromStatic(n, picked.get(n.id), icons))
			: selected.map((e) => fromEntry(e, icons))
	).filter((n) => n !== null)
	// Links to a node that is not listed (nameless, or from another tree) would dangle
	const ids = new Set(found.map((n) => n.id))
	// Blizzard also repeats the same link: keys downstream must be unique
	const nodes = found.map((n) => ({ ...n, unlocks: [...new Set(n.unlocks.filter((id) => ids.has(id)))] }))
	return { kind, name, spent: nodes.reduce((sum, n) => sum + n.rank, 0), nodes }
}

const activeSpec = (profile: Raw): Raw | undefined =>
	profile.specializations?.find((s: Raw) => s.specialization?.id === profile.active_specialization?.id)

/** Pure mapping of Blizzard's `/specializations` and static tree to the contract. `tree` null → no positions, no links. */
export function mapTalents(profile: Raw, tree: Raw | null, icons: Map<number, string>): CharacterTalents {
	const heroTree: string | undefined = profile.active_hero_talent_tree?.name
	// Blizzard also lists hero nodes in spec_talent_nodes (fixture: 94608, Boundless Moonlight of Elune's Chosen): a node any hero tree claims is not class/spec
	const heroNodeIds = new Set<number>(
		(tree?.hero_talent_trees ?? []).flatMap((h: Raw) => (h.hero_talent_nodes ?? []).map((n: Raw) => n.id)),
	)
	const own = (nodes: Raw[] | undefined) => nodes?.filter((n) => !heroNodeIds.has(n.id)) ?? null
	const loadouts: TalentLoadout[] = (activeSpec(profile)?.loadouts ?? []).map((l: Raw, i: number): TalentLoadout => {
		const heroId = l.selected_hero_talent_tree?.id ?? profile.active_hero_talent_tree?.id
		const hero = tree?.hero_talent_trees?.find((h: Raw) => h.id === heroId)
		return {
			name: `Configuration ${i + 1}`, // Blizzard gives loadouts no name
			active: l.is_active === true,
			...(l.talent_loadout_code ? { code: l.talent_loadout_code } : {}),
			trees: [
				mapTree(
					'class',
					l.selected_class_talent_tree?.name ?? '',
					own(tree?.class_talent_nodes),
					l.selected_class_talents ?? [],
					icons,
				),
				...(heroId === undefined
					? []
					: [
							mapTree(
								'hero',
								l.selected_hero_talent_tree?.name ?? hero?.name ?? heroTree ?? '',
								hero?.hero_talent_nodes ?? null,
								l.selected_hero_talents ?? [],
								icons,
							),
						]),
				mapTree(
					'spec',
					l.selected_spec_talent_tree?.name ?? '',
					own(tree?.spec_talent_nodes),
					l.selected_spec_talents ?? [],
					icons,
				),
			],
		}
	})
	return { spec: profile.active_specialization?.name ?? '', ...(heroTree ? { heroTree } : {}), loadouts }
}

// ─── Blizzard calls (all cached) ────────────────────────────────────────────

const fetchIcon = (key: string, path: string) => cachedGet(key, path, mapIcon)

async function buildTalents(profile: Raw, onDegraded: () => void): Promise<CharacterTalents> {
	const spec = activeSpec(profile)
	const loadouts: Raw[] = spec?.loadouts ?? []
	if (!loadouts.length) return mapTalents(profile, null, new Map())

	// The tree to fetch is named by the loadout itself
	const href: string = loadouts[0].selected_spec_talent_tree?.key?.href ?? ''
	const ids = /\/talent-tree\/(\d+)\/playable-specialization\/(\d+)/.exec(href)
	// shortcut: the static tree is cached whole (~150 KB per specialization), trim it if the cache grows
	const treeCall = ids
		? cachedGet<Raw>(
				`talent-tree:${ids[1]}:${ids[2]}`,
				`/data/wow/talent-tree/${ids[1]}/playable-specialization/${ids[2]}?${STATIC}`,
				(raw) => {
					if (!Array.isArray(raw.class_talent_nodes) || !Array.isArray(raw.spec_talent_nodes))
						throw new Error('talent tree shape')
					return raw
				},
			)
		: null
	const specId: number | undefined = profile.active_specialization?.id
	const [tree, specIcon] = await Promise.all([
		treeCall ?? { data: null },
		specId === undefined
			? { data: null }
			: fetchIcon(`spec-media:${specId}`, `/data/wow/media/playable-specialization/${specId}?${STATIC_MEDIA}`),
	])

	if (!tree.data) onDegraded() // no positions: served, never cached

	// Spells whose icon is needed: every node of the trees shown, plus the loadout tooltips (the only source without a static tree)
	const spellIds = new Set<number>()
	const add = (t: Tooltip | undefined) => {
		const id = t?.spell_tooltip?.spell?.id
		if (typeof id === 'number') spellIds.add(id)
	}
	const heroIds = new Set<number>([
		profile.active_hero_talent_tree?.id,
		...loadouts.map((l) => l.selected_hero_talent_tree?.id),
	])
	const staticNodes: Raw[] = tree.data
		? [
				...tree.data.class_talent_nodes,
				...tree.data.spec_talent_nodes,
				...(tree.data.hero_talent_trees ?? [])
					.filter((h: Raw) => heroIds.has(h.id))
					.flatMap((h: Raw) => h.hero_talent_nodes ?? []),
			]
		: []
	for (const n of staticNodes) {
		add(n.ranks?.[0]?.tooltip)
		for (const c of n.ranks?.[0]?.choice_of_tooltips ?? []) add(c)
	}
	for (const l of loadouts)
		for (const e of [
			...(l.selected_class_talents ?? []),
			...(l.selected_spec_talents ?? []),
			...(l.selected_hero_talents ?? []),
		])
			add(e.tooltip)

	const icons = new Map<number, string>()
	const wanted = [...spellIds]
	for (let i = 0; i < wanted.length; i += ICON_BATCH) {
		await Promise.all(
			wanted.slice(i, i + ICON_BATCH).map(async (id) => {
				// A failed icon is just absent (and not cached, so a later request retries)
				const icon = await fetchIcon(`spell-media:${id}`, `/data/wow/media/spell/${id}?${STATIC_MEDIA}`)
				if (icon.data) icons.set(id, icon.data)
			}),
		)
	}

	return { ...mapTalents(profile, tree.data, icons), ...(specIcon.data ? { specIcon: specIcon.data } : {}) }
}

/**
 * Talents of a public character. The mapped result is cached for one hour; a Blizzard failure never is.
 * `name` must be lower-cased and `realmSlug` a real slug (both are encoded here).
 */
export async function getCharacterTalents(
	realmSlug: string,
	name: string,
): Promise<{ status: 200; talents: CharacterTalents } | { status: 404 | 502 | 503 }> {
	let degraded = false
	const r = await cachedGet(
		`talents:${realmSlug}:${name}`,
		`/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(name)}/specializations?namespace=profile-eu&locale=fr_FR`,
		(profile) => buildTalents(profile, () => (degraded = true)),
		TALENTS_TTL_MS,
		() => !degraded,
	)
	if (r.data) return { status: 200, talents: r.data }
	return { status: r.status === 404 || r.status === 503 ? r.status : 502 }
}
