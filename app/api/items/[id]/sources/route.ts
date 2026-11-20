import { after, NextResponse } from 'next/server'
import { getItemData } from '@/lib/services/itemService'
import { buildRecipeIndex, wowheadUrl } from '@/lib/services/sourceService'

// GET /api/items/[id]/sources
// [id] = Blizzard numeric item ID
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const itemId = Number(id)

	if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(itemId)) {
		return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
	}

	const data = await getItemData(itemId)
	if (!data) {
		return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })
	}

	// The recipe index is a long crawl: never inside the user's request. No-op when it already exists.
	if (data.pending) after(buildRecipeIndex)

	return NextResponse.json({
		name: data.name,
		type: data.type,
		slot: data.slot,
		stats: data.stats,
		sources: data.sources,
		pending: data.pending,
		wowheadUrl: wowheadUrl(itemId),
	})
}
