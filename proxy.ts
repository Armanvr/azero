import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

// Routes requiring authentication
const PROTECTED_ROUTES = ['/metiers', '/planning', '/profil']

export async function proxy(req: NextRequest) {
	const valid = (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) !== null

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
