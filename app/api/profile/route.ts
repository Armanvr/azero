import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { CharacterModel, connectDB, UserModel } from '@/lib/db'
import type { BnetCharacter, User } from '@/lib/types'

export async function GET() {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	await connectDB()

	const [user, characters] = await Promise.all([
		UserModel.findOne({ id: session.userId }).lean<User>(),
		CharacterModel.find({ userId: session.userId }).lean<BnetCharacter[]>(),
	])

	if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

	return NextResponse.json({
		user: {
			id: user.id,
			username: user.username,
			email: user.email,
			createdAt: user.createdAt,
			bnetConnected: user.bnetConnected ?? false,
			favoriteCharId: user.favoriteCharId ?? null,
			subFavoriteCharIds: user.subFavoriteCharIds ?? [],
		},
		characters,
	})
}
