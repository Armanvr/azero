import { NextResponse } from 'next/server'
import { authenticateUser, createSessionToken, publicErrorMessage, setSessionCookie } from '@/lib/auth'

export async function POST(req: Request) {
	try {
		const { email, password, remember } = (await req.json().catch(() => null)) ?? {}
		if ([email, password].some((v) => typeof v !== 'string' || !v)) {
			return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 })
		}
		const user = await authenticateUser(email, password)
		await setSessionCookie(await createSessionToken(user), remember !== false)
		return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, username: user.username } })
	} catch (err) {
		return NextResponse.json({ error: publicErrorMessage(err) }, { status: 401 })
	}
}
