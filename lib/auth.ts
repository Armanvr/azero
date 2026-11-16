import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { connectDB, UserModel } from './db'
import { getSecret, SESSION_COOKIE, verifySession } from './session'
import type { SessionPayload, User } from './types'

const SESSION_DURATION_S = 60 * 60 * 24 * 7

// 32 symbols, no 0/O/1/I: 256 % 32 === 0 so `byte % 32` has no modulo bias (16 chars = 80 bits)
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
// Compared against when the account or its code does not exist, so login and reset take the same time in every failure case
const DUMMY_HASH = bcrypt.hashSync('dummy', 10)

/** An error whose message is meant for the user. Anything else is reported as a generic server error. */
export class AuthError extends Error {}

export function publicErrorMessage(err: unknown): string {
	if (err instanceof AuthError) return err.message
	console.error(err)
	return 'Erreur serveur.'
}

async function newRecoveryCode(): Promise<{ recoveryCode: string; recoveryCodeHash: string }> {
	const chars = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => RECOVERY_ALPHABET[b % 32])
	const recoveryCode = (chars.join('').match(/.{4}/g) as string[]).join('-')
	return { recoveryCode, recoveryCodeHash: await bcrypt.hash(normalizeRecoveryCode(recoveryCode), 10) }
}

function normalizeRecoveryCode(code: string): string {
	return code.toUpperCase().replace(/[\s-]/g, '')
}

export async function registerUser(input: {
	email: string
	username: string
	password: string
}): Promise<{ user: User; recoveryCode: string }> {
	await connectDB()
	const email = input.email.trim().toLowerCase()
	const existing = await UserModel.findOne({ email }).lean<User>()
	if (existing) throw new AuthError('Un compte existe déjà pour cet email.')
	const passwordHash = await bcrypt.hash(input.password, 10)
	const { recoveryCode, recoveryCodeHash } = await newRecoveryCode()
	const user: User = {
		id: crypto.randomUUID(),
		email,
		username: input.username.trim(),
		passwordHash,
		recoveryCodeHash,
		createdAt: new Date().toISOString(),
	}
	await UserModel.create(user)
	return { user, recoveryCode }
}

export async function resetPassword(
	email: string,
	recoveryCode: string,
	password: string,
): Promise<{ user: User; recoveryCode: string }> {
	await connectDB()
	const invalid = new AuthError('Email ou code de récupération invalide.')
	const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean<User>()
	const ok = await bcrypt.compare(normalizeRecoveryCode(recoveryCode), user?.recoveryCodeHash ?? DUMMY_HASH)
	if (!user?.recoveryCodeHash || !ok) throw invalid
	const next = await newRecoveryCode()
	const passwordHash = await bcrypt.hash(password, 10)
	// Filtering on the old hash makes the code single-use even with two concurrent resets
	const { matchedCount } = await UserModel.updateOne(
		{ id: user.id, recoveryCodeHash: user.recoveryCodeHash },
		{ $set: { passwordHash, recoveryCodeHash: next.recoveryCodeHash } },
	)
	if (!matchedCount) throw invalid
	return { user, recoveryCode: next.recoveryCode }
}

export async function regenerateRecoveryCode(userId: string, password: string): Promise<string> {
	await connectDB()
	const user = await UserModel.findOne({ id: userId }).lean<User>()
	if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AuthError('Mot de passe incorrect.')
	const { recoveryCode, recoveryCodeHash } = await newRecoveryCode()
	await UserModel.updateOne({ id: user.id }, { $set: { recoveryCodeHash } })
	return recoveryCode
}

export async function authenticateUser(email: string, password: string): Promise<User> {
	await connectDB()
	const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean<User>()
	const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
	if (!user || !ok) throw new AuthError('Identifiants invalides.')
	return user
}

export async function createSessionToken(user: User): Promise<string> {
	return new SignJWT({ userId: user.id, email: user.email, username: user.username })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${SESSION_DURATION_S}s`)
		.sign(getSecret())
}

/** `remember: false` omits maxAge: a session cookie that the browser drops on close (the JWT still expires after 7 days). */
export async function setSessionCookie(token: string, remember = true): Promise<void> {
	;(await cookies()).set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		...(remember && { maxAge: SESSION_DURATION_S }),
	})
}

export async function clearSessionCookie(): Promise<void> {
	;(await cookies()).delete(SESSION_COOKIE)
}

export async function readSession(): Promise<SessionPayload | null> {
	return verifySession((await cookies()).get(SESSION_COOKIE)?.value)
}
