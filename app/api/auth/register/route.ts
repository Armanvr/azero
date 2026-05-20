import { NextResponse } from 'next/server'
import { createSessionToken, registerUser, setSessionCookie } from '@/lib/auth'

export async function POST(req: Request) {
	try {
		const { email, username, password, confirm } = await req.json()
		if (!email || !username || !password) {
			return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 })
		}
		if (confirm !== undefined && password !== confirm) {
			return NextResponse.json({ error: 'Les mots de passe ne correspondent pas.' }, { status: 400 })
		}
		const user = await registerUser({ email, username, password })
		const token = await createSessionToken(user)
		await setSessionCookie(token)
		return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, username: user.username } })
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Erreur serveur.'
		return NextResponse.json({ error: msg }, { status: 400 })
	}
}
