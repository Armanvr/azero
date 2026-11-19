import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { CharacterModel, connectDB, UserModel } from '@/lib/db'

export async function POST() {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	await connectDB()

	// strict: false because bnetAccessToken is no longer in the schema (cleans tokens stored by an earlier version)
	await UserModel.updateOne(
		{ id: session.userId },
		{ $set: { bnetConnected: false }, $unset: { bnetAccessToken: '' } },
		{ strict: false },
	)

	await CharacterModel.deleteMany({ userId: session.userId })

	return NextResponse.json({ ok: true })
}
