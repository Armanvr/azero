import { NextResponse } from 'next/server'
import { createSessionToken, publicErrorMessage, resetPassword, setSessionCookie } from '@/lib/auth'

export async function POST(req: Request) {
	try {
		const { email, recoveryCode, password } = await req.json()
		if ([email, recoveryCode, password].some((v) => typeof v !== 'string' || !v)) {
			return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 })
		}
		const { user, recoveryCode: newCode } = await resetPassword(email, recoveryCode, password)
		await setSessionCookie(await createSessionToken(user))
		return NextResponse.json({ ok: true, recoveryCode: newCode })
	} catch (err) {
		return NextResponse.json({ error: publicErrorMessage(err) }, { status: 400 })
	}
}
