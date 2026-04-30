import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { SessionPayload, User } from "./types";

const SESSION_COOKIE = "azero_session";
const SESSION_DURATION_S = 60 * 60 * 24 * 7;

function getSecret(): Uint8Array {
  const raw = process.env.AZERO_SESSION_SECRET || "dev-only-fallback-secret-change-me-please-32";
  return new TextEncoder().encode(raw);
}

const users = new Map<string, User>();

export async function registerUser(input: {
  email: string;
  username: string;
  password: string;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  if (users.has(email)) {
    throw new Error("Un compte existe déjà pour cet email.");
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user: User = {
    id: crypto.randomUUID(),
    email,
    username: input.username.trim(),
    passwordHash,
    createdAt: new Date().toISOString()
  };
  users.set(email, user);
  return user;
}

export async function authenticateUser(email: string, password: string): Promise<User> {
  const user = users.get(email.trim().toLowerCase());
  if (!user) throw new Error("Identifiants invalides.");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("Identifiants invalides.");
  return user;
}

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({ userId: user.id, email: user.email, username: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_S}s`)
    .sign(getSecret());
}

export async function setSessionCookie(token: string): Promise<void> {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_S
  });
}

export async function clearSessionCookie(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
