import { NextResponse } from 'next/server'
import { publicErrorMessage, readSession, regenerateRecoveryCode } from '@/lib/auth'

export async function POST(req: Request) {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Session expirée.' }, { status: 401 })

	try {
		const { password } = await req.json()
		if (typeof password !== 'string' || !password) {
			return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 })
		}
		const recoveryCode = await regenerateRecoveryCode(session.userId, password)
		return NextResponse.json({ ok: true, recoveryCode })
	} catch (err) {
		return NextResponse.json({ error: publicErrorMessage(err) }, { status: 400 })
	}
}
