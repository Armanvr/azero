import { jwtVerify } from 'jose'
import type { SessionPayload } from './types'

// Shared by lib/auth.ts and proxy.ts: kept free of next/headers and the database so the proxy can import it
export const SESSION_COOKIE = 'azero_session'

export function getSecret(): Uint8Array {
	const raw = process.env.AZERO_SESSION_SECRET
	if (!raw && process.env.NODE_ENV === 'production') {
		throw new Error('AZERO_SESSION_SECRET must be set in production.')
	}
	return new TextEncoder().encode(raw || 'dev-only-fallback-secret-change-me-please-32')
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
	const secret = getSecret()
	if (!token) return null
	try {
		const { payload } = await jwtVerify(token, secret)
		return payload as SessionPayload
	} catch {
		return null
	}
}
