import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { CLASS_COLORS, CLASS_ID_TO_NAME } from '@/lib/constants'
import { CharacterModel, connectDB, UserModel } from '@/lib/db'
import type { BnetCharacter, Character, User } from '@/lib/types'

const MAX_LEVEL = 90

function bnetToCharacter(c: BnetCharacter): Character {
	const wowClass = CLASS_ID_TO_NAME[c.classId] ?? 'Guerrier'
	const color = CLASS_COLORS[wowClass] ?? 'var(--text)'
	const id = `${c.name.toLowerCase()}-${c.realmSlug}`
	return {
		id,
		name: c.name,
		title: c.title ?? '',
		race: c.raceName,
		class: wowClass,
		spec: c.spec ?? '',
		ilvl: c.ilvl ?? 0,
		realm: c.realm,
		guild: c.guildName ?? '',
		faction: c.faction,
		score: 0,
		gold: c.gold ?? 0,
		color,
		avatarUrl: c.avatarUrl,
		slotsLeft: c.slotsLeft ?? [],
		slotsRight: c.slotsRight ?? [],
		slotsWeapon: c.slotsWeapon ?? [],
	}
}

export async function GET() {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

	await connectDB()

	const [bnetChars, user] = await Promise.all([
		CharacterModel.find({ userId: session.userId, level: MAX_LEVEL }).lean<BnetCharacter[]>(),
		UserModel.findOne({ id: session.userId }).lean<User>(),
	])

	const favoriteCharId = user?.favoriteCharId ?? null
	const subFavoriteCharIds = new Set(user?.subFavoriteCharIds ?? [])

	const characters: Character[] = bnetChars.map(bnetToCharacter).sort((a, b) => {
		if (a.id === favoriteCharId) return -1
		if (b.id === favoriteCharId) return 1
		const aSub = subFavoriteCharIds.has(a.id)
		const bSub = subFavoriteCharIds.has(b.id)
		if (aSub && !bSub) return -1
		if (bSub && !aSub) return 1
		return a.name.localeCompare(b.name)
	})

	return NextResponse.json({ characters })
}
