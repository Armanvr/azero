'use client'
import { type CSSProperties, useState } from 'react'
import type { TalentNode, TalentTree } from '@/lib/types'
import styles from './Talents.module.css'

const CELL = 44
const GAP = 22
const PITCH = CELL + GAP

const TREE_LABELS = { class: 'Classe', hero: 'Héros', spec: 'Spécialisation' } as const

function NodeIcon({ node }: { node: TalentNode }) {
	const icon = node.icon ?? node.choices?.find((c) => c.selected)?.icon
	if (!icon) return <span className={styles.icon}>{node.name[0]}</span>
	// biome-ignore lint/performance/noImgElement: Blizzard icon hosts are not all in next.config remotePatterns
	return <img src={icon} alt='' className={styles.icon} />
}

export default function TalentTreeView({ tree }: { tree: TalentTree }) {
	// pinned = opened by click (stays after the pointer or focus leaves)
	const [open, setOpen] = useState<{ id: number; pinned: boolean } | null>(null)
	const byId = new Map(tree.nodes.map((n) => [n.id, n]))
	const shown = open ? (byId.get(open.id) ?? null) : null
	// shortcut: no static tree = no positions, a plain list; upgrade when the backend always has the layout
	const flat = tree.nodes.every((n) => n.row === 0 && n.col === 0)

	// sparse Blizzard coordinates -> consecutive indexes (order kept), so empty rows/cols take no space
	const rank = (values: number[]) => new Map([...new Set(values)].sort((a, b) => a - b).map((v, i) => [v, i]))
	const rowIdx = rank(tree.nodes.map((n) => n.row))
	const colIdx = rank(tree.nodes.map((n) => n.col))
	const cols = colIdx.size
	const rows = rowIdx.size
	const rowOf = (n: TalentNode) => rowIdx.get(n.row) ?? 0
	const colOf = (n: TalentNode) => colIdx.get(n.col) ?? 0
	const center = (n: TalentNode) => ({
		x: colOf(n) * PITCH + CELL / 2,
		y: rowOf(n) * PITCH + CELL / 2,
	})
	const w = cols * PITCH - GAP
	const h = rows * PITCH - GAP
	// unlocks come deduped and limited to listed nodes (talentService mapTree)
	const edges = tree.nodes.flatMap((a) =>
		a.unlocks.flatMap((to) => {
			const b = byId.get(to)
			return b ? [{ k: `${a.id}-${to}`, a, b }] : []
		}),
	)

	const button = (n: TalentNode, style?: CSSProperties) => (
		<button
			key={n.id}
			type='button'
			aria-label={n.name}
			aria-pressed={open?.id === n.id && open.pinned}
			className={`${styles.node} ${n.rank > 0 ? styles.selected : ''}`}
			style={style}
			onMouseEnter={() => setOpen((o) => (o?.pinned ? o : { id: n.id, pinned: false }))}
			onMouseLeave={() => setOpen((o) => (o?.pinned ? o : null))}
			onFocus={() => setOpen((o) => (o?.pinned ? o : { id: n.id, pinned: false }))}
			onBlur={() => setOpen((o) => (o?.pinned ? o : null))}
			onClick={() => setOpen((o) => (o?.pinned && o.id === n.id ? null : { id: n.id, pinned: true }))}
		>
			<NodeIcon node={n} />
			{n.rank > 0 && (
				<span className={styles.badge}>
					{n.rank}/{n.maxRank}
				</span>
			)}
		</button>
	)

	return (
		<section
			className={styles.tree}
			// natural width = tree at full size + card padding/border; shrinks (nodes scale with it) when the row is narrower
			style={flat ? undefined : ({ '--w': w } as CSSProperties)}
			aria-label={`Arbre de talents ${TREE_LABELS[tree.kind]}`}
			onKeyDown={(e) => e.key === 'Escape' && setOpen(null)}
		>
			<h3 className={styles.treeTitle}>
				{tree.name}
				<span className={styles.points}>{tree.spent} points</span>
			</h3>

			{flat ? (
				<div className={styles.list}>{tree.nodes.map((n) => button(n))}</div>
			) : (
				<div className={styles.scroll}>
					<div className={styles.grid} style={{ aspectRatio: `${w} / ${h}` }}>
						<svg className={styles.links} viewBox={`0 0 ${w} ${h}`} aria-hidden='true'>
							{edges.map(({ k, a, b }) => (
								<line
									key={k}
									x1={center(a).x}
									y1={center(a).y}
									x2={center(b).x}
									y2={center(b).y}
									className={a.rank > 0 && b.rank > 0 ? styles.linkOn : styles.link}
								/>
							))}
						</svg>
						{tree.nodes.map((n) =>
							button(n, {
								left: `${((colOf(n) * PITCH) / w) * 100}%`,
								top: `${((rowOf(n) * PITCH) / h) * 100}%`,
								width: `${(CELL / w) * 100}%`,
							}),
						)}
					</div>
				</div>
			)}

			<div className={styles.detail} aria-live='polite'>
				{shown ? (
					<>
						<div className={styles.detailName}>{shown.name}</div>
						<div className={styles.detailRank}>
							Rang {shown.rank}/{shown.maxRank}
						</div>
						{shown.choices?.length ? (
							shown.choices.map((c) => (
								<div key={c.name} className={`${styles.choice} ${c.selected ? styles.choiceOn : ''}`}>
									<div className={styles.choiceName}>
										{c.name}
										{c.selected && <span className={styles.choiceMark}> · choisi</span>}
									</div>
									{c.description && <div className={styles.detailDesc}>{c.description}</div>}
								</div>
							))
						) : shown.description ? (
							<div className={styles.detailDesc}>{shown.description}</div>
						) : null}
					</>
				) : (
					<span className={styles.hint}>Survolez ou sélectionnez un talent pour voir son détail.</span>
				)}
			</div>
		</section>
	)
}
