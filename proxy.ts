import { jwtVerify } from 'jose'
import { type NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'azero_session'

// Routes requiring authentication
const PROTECTED_ROUTES = ['/metiers', '/profil']

function getSecret(): Uint8Array {
	const raw = process.env.AZERO_SESSION_SECRET || 'dev-only-fallback-secret-change-me-please-32'
	return new TextEncoder().encode(raw)
}

export async function proxy(req: NextRequest) {
	const token = req.cookies.get(SESSION_COOKIE)?.value
	let valid = false
	if (token) {
		try {
			await jwtVerify(token, getSecret())
			valid = true
		} catch {
			valid = false
		}
	}

	const { pathname } = req.nextUrl
	const isAuthPage = pathname === '/auth'
	const isProtected = PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))

	// Redirect unauthenticated users away from protected routes
	if (!valid && isProtected) {
		const url = req.nextUrl.clone()
		url.pathname = '/auth'
		return NextResponse.redirect(url)
	}

	// Redirect authenticated users away from auth page
	if (valid && isAuthPage) {
		const url = req.nextUrl.clone()
		url.pathname = '/'
		return NextResponse.redirect(url)
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/((?!api|_next|.*\\..*).*)'],
}
