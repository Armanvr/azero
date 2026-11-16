import { NextResponse } from 'next/server'
import { createSessionToken, publicErrorMessage, registerUser, setSessionCookie } from '@/lib/auth'

export async function POST(req: Request) {
	try {
		const { email, username, password, confirm } = await req.json()
		if (!email || !username || !password) {
			return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 })
		}
		if (confirm !== undefined && password !== confirm) {
			return NextResponse.json({ error: 'Les mots de passe ne correspondent pas.' }, { status: 400 })
		}
		const { user, recoveryCode } = await registerUser({ email, username, password })
		await setSessionCookie(await createSessionToken(user))
		return NextResponse.json({
			ok: true,
			user: { id: user.id, email: user.email, username: user.username },
			recoveryCode,
		})
	} catch (err) {
		return NextResponse.json({ error: publicErrorMessage(err) }, { status: 400 })
	}
}
