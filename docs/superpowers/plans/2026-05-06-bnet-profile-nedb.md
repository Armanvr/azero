# BattleNet OAuth + Profile Page + NeDB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace in-memory user storage with NeDB file persistence, add a Profile page with read-only user info, and implement BattleNet OAuth to import and display WoW characters.

**Architecture:** Single `lib/db.ts` exports two NeDB datastores (`usersDb`, `charactersDb`). `lib/auth.ts` replaces the in-memory `Map` with async NeDB calls. BattleNet OAuth runs server-side via two API route handlers (`/api/auth/bnet` initiates, `/api/auth/bnet/callback` exchanges code for token and stores characters). Profile page is a client component that fetches `/api/profile`.

**Tech Stack:** Next.js 16 App Router, `@seald-io/nedb` 4.1.2 (already installed), `jose` for JWT, `bcryptjs` for password hashing.

---

> **Note on testing:** This project has no test framework configured. Each task includes manual verification steps instead of automated tests.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/db.ts` | NeDB singleton datastores |
| Modify | `lib/auth.ts` | Replace Map with NeDB async calls |
| Modify | `lib/types.ts` | Extend `User`, add `BnetCharacter` |
| Create | `app/api/profile/route.ts` | GET user + characters |
| Create | `app/api/auth/bnet/route.ts` | Initiate BNet OAuth redirect |
| Create | `app/api/auth/bnet/callback/route.ts` | Exchange code, store chars |
| Create | `app/api/auth/bnet/disconnect/route.ts` | Clear token + characters |
| Create | `components/profile/CharacterCard.tsx` | Single character display card |
| Create | `app/profil/page.tsx` | Profile page (client component) |
| Modify | `components/layout/Header.tsx` | Add PROFIL nav entry |
| Modify | `.env.local.example` | Add BNET vars |
| Modify | `.gitignore` | Add `data/` |
| Create | `docs/BNET_API_GUIDE.md` | BNet developer portal guide |

---

## Task 1: Config — .gitignore + .env.local.example

**Files:**
- Modify: `.gitignore`
- Modify: `.env.local.example`

- [ ] **Step 1: Add `data/` to .gitignore**

In `.gitignore`, append after the `# Project-specific` section:

```
# NeDB data files
data/
```

- [ ] **Step 2: Add BattleNet env vars to .env.local.example**

Replace the entire content of `.env.local.example` with:

```
# Secret JWT pour signer les cookies de session (>= 32 caractères)
AZERO_SESSION_SECRET=change-me-please-use-a-long-random-string-32chars-min

# BattleNet OAuth (https://develop.battle.net/access/clients)
BNET_CLIENT_ID=your_client_id_here
BNET_CLIENT_SECRET=your_client_secret_here
BNET_REDIRECT_URI=http://localhost:3000/api/auth/bnet/callback
```

- [ ] **Step 3: Add vars to your local .env.local**

Add the same three BNET vars to your real `.env.local` (fill in actual values from the dev portal — see `docs/BNET_API_GUIDE.md` once created in Task 10).

- [ ] **Step 4: Commit**

```bash
git add .gitignore .env.local.example
git commit -m "chore: add data/ to gitignore and bnet env vars to example"
```

---

## Task 2: Types — extend User + add BnetCharacter

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Extend the `User` interface**

In `lib/types.ts`, replace the `User` interface:

```typescript
export interface User {
  id: string
  email: string
  username: string
  passwordHash: string
  createdAt: string
  bnetAccessToken?: string
  bnetTokenExpiry?: number
  bnetConnected?: boolean
}
```

- [ ] **Step 2: Add BnetCharacter interface**

Append to `lib/types.ts`:

```typescript
export interface BnetCharacter {
  _id?: string
  userId: string
  name: string
  realm: string
  realmSlug: string
  classId: number
  className: string
  raceId: number
  raceName: string
  level: number
  faction: 'horde' | 'alliance'
  fetchedAt: string
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat: extend User type and add BnetCharacter type"
```

---

## Task 3: NeDB — create lib/db.ts

**Files:**
- Create: `lib/db.ts`
- Create: `data/` directory (auto-created by NeDB, gitignored)

- [ ] **Step 1: Create lib/db.ts**

```typescript
import Datastore from '@seald-io/nedb'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

declare global {
  // eslint-disable-next-line no-var
  var __nedb_users: Datastore | undefined
  var __nedb_characters: Datastore | undefined
}

export const usersDb: Datastore =
  global.__nedb_users ??
  new Datastore({
    filename: path.join(DATA_DIR, 'users.db'),
    autoload: true,
  })

export const charactersDb: Datastore =
  global.__nedb_characters ??
  new Datastore({
    filename: path.join(DATA_DIR, 'characters.db'),
    autoload: true,
  })

if (process.env.NODE_ENV !== 'production') {
  global.__nedb_users = usersDb
  global.__nedb_characters = charactersDb
}

void usersDb.ensureIndexAsync({ fieldName: 'email', unique: true })
void charactersDb.ensureIndexAsync({ fieldName: 'userId' })
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add NeDB datastores (users + characters)"
```

---

## Task 4: Auth — migrate lib/auth.ts to NeDB

**Files:**
- Modify: `lib/auth.ts`

The current `lib/auth.ts` uses an in-memory `Map<string, User>`. Replace it with async NeDB calls. All JWT/session functions remain identical.

- [ ] **Step 1: Replace lib/auth.ts**

```typescript
import bcrypt from 'bcryptjs'
import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import type { SessionPayload, User } from './types'
import { usersDb } from './db'

const SESSION_COOKIE = 'azero_session'
const SESSION_DURATION_S = 60 * 60 * 24 * 7

function getSecret(): Uint8Array {
  const raw = process.env.AZERO_SESSION_SECRET || 'dev-only-fallback-secret-change-me-please-32'
  return new TextEncoder().encode(raw)
}

export async function registerUser(input: { email: string; username: string; password: string }): Promise<User> {
  const email = input.email.trim().toLowerCase()
  const existing = await usersDb.findOneAsync<User>({ email })
  if (existing) throw new Error('Un compte existe déjà pour cet email.')
  const passwordHash = await bcrypt.hash(input.password, 10)
  const user: User = {
    id: crypto.randomUUID(),
    email,
    username: input.username.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  }
  return usersDb.insertAsync<User>(user)
}

export async function authenticateUser(email: string, password: string): Promise<User> {
  const user = await usersDb.findOneAsync<User>({ email: email.trim().toLowerCase() })
  if (!user) throw new Error('Identifiants invalides.')
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw new Error('Identifiants invalides.')
  return user
}

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({ userId: user.id, email: user.email, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_S}s`)
    .sign(getSecret())
}

export async function setSessionCookie(token: string): Promise<void> {
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_S,
  })
}

export async function clearSessionCookie(): Promise<void> {
  ;(await cookies()).delete(SESSION_COOKIE)
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as SessionPayload
  } catch {
    return null
  }
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as SessionPayload
  } catch {
    return null
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test — register + login**

Start dev server: `npm run dev`

1. Open `http://localhost:3000/auth`
2. Register a new account
3. Verify redirect to `/`
4. Check that `data/users.db` was created: `cat data/users.db` — should show one JSON line with your user
5. Log out, log back in with the same credentials
6. Verify successful login

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: migrate auth to NeDB persistent storage"
```

---

## Task 5: BattleNet OAuth API routes

**Files:**
- Create: `app/api/auth/bnet/route.ts`
- Create: `app/api/auth/bnet/callback/route.ts`
- Create: `app/api/auth/bnet/disconnect/route.ts`

### 5a — Initiate OAuth redirect

- [ ] **Step 1: Create app/api/auth/bnet/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await readSession()
  if (!session) return NextResponse.redirect(new URL('/auth', req.url))

  const params = new URLSearchParams({
    client_id: process.env.BNET_CLIENT_ID!,
    redirect_uri: process.env.BNET_REDIRECT_URI!,
    response_type: 'code',
    scope: 'wow.profile',
  })

  return NextResponse.redirect(`https://oauth.battle.net/authorize?${params.toString()}`)
}
```

### 5b — Handle OAuth callback

- [ ] **Step 2: Create app/api/auth/bnet/callback/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { usersDb, charactersDb } from '@/lib/db'
import type { BnetCharacter } from '@/lib/types'

interface BnetTokenResponse {
  access_token: string
  expires_in: number
}

interface BnetRealm {
  name: string
  slug: string
}

interface BnetCharacterRaw {
  name: string
  realm: BnetRealm
  playable_class: { id: number; name: string }
  playable_race: { id: number; name: string }
  faction: { type: string }
  level: number
}

interface BnetProfileResponse {
  wow_accounts?: Array<{ characters?: BnetCharacterRaw[] }>
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/profil?error=bnet_denied', req.url))
  }

  const session = await readSession()
  if (!session) return NextResponse.redirect(new URL('/auth', req.url))

  const credentials = Buffer.from(
    `${process.env.BNET_CLIENT_ID}:${process.env.BNET_CLIENT_SECRET}`
  ).toString('base64')

  const tokenRes = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.BNET_REDIRECT_URI!,
    }).toString(),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/profil?error=token_failed', req.url))
  }

  const { access_token, expires_in } = (await tokenRes.json()) as BnetTokenResponse

  const charsRes = await fetch(
    'https://eu.api.blizzard.com/profile/user/wow?namespace=profile-eu&locale=fr_FR',
    { headers: { Authorization: `Bearer ${access_token}` } }
  )

  if (!charsRes.ok) {
    return NextResponse.redirect(new URL('/profil?error=chars_failed', req.url))
  }

  const charsData = (await charsRes.json()) as BnetProfileResponse

  await usersDb.updateAsync(
    { id: session.userId },
    {
      $set: {
        bnetAccessToken: access_token,
        bnetTokenExpiry: Date.now() + expires_in * 1000,
        bnetConnected: true,
      },
    },
    {}
  )

  await charactersDb.removeAsync({ userId: session.userId }, { multi: true })

  const accounts = charsData.wow_accounts ?? []
  const rawChars = accounts.flatMap((acc) => acc.characters ?? [])

  for (const char of rawChars) {
    const doc: Omit<BnetCharacter, '_id'> = {
      userId: session.userId,
      name: char.name,
      realm: char.realm?.name ?? '',
      realmSlug: char.realm?.slug ?? '',
      classId: char.playable_class?.id ?? 0,
      className: char.playable_class?.name ?? '',
      raceId: char.playable_race?.id ?? 0,
      raceName: char.playable_race?.name ?? '',
      level: char.level ?? 0,
      faction: char.faction?.type === 'HORDE' ? 'horde' : 'alliance',
      fetchedAt: new Date().toISOString(),
    }
    await charactersDb.insertAsync(doc)
  }

  return NextResponse.redirect(new URL('/profil', req.url))
}
```

### 5c — Disconnect

- [ ] **Step 3: Create app/api/auth/bnet/disconnect/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { usersDb, charactersDb } from '@/lib/db'

export async function POST() {
  const session = await readSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await usersDb.updateAsync(
    { id: session.userId },
    { $set: { bnetConnected: false } },
    {}
  )
  await usersDb.updateAsync(
    { id: session.userId },
    { $unset: { bnetAccessToken: true, bnetTokenExpiry: true } },
    {}
  )

  await charactersDb.removeAsync({ userId: session.userId }, { multi: true })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/bnet/
git commit -m "feat: add BattleNet OAuth API routes (initiate, callback, disconnect)"
```

---

## Task 6: Profile API route

**Files:**
- Create: `app/api/profile/route.ts`

- [ ] **Step 1: Create app/api/profile/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { usersDb, charactersDb } from '@/lib/db'
import type { BnetCharacter, User } from '@/lib/types'

export async function GET() {
  const session = await readSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await usersDb.findOneAsync<User>({ id: session.userId })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const characters = await charactersDb.findAsync<BnetCharacter>({ userId: session.userId })

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      bnetConnected: user.bnetConnected ?? false,
    },
    characters,
  })
}
```

- [ ] **Step 2: Manual test — call the route**

With dev server running and logged in:

```bash
# Should return user data with empty characters array
curl -b "$(cat /tmp/cookies.txt)" http://localhost:3000/api/profile
```

Or open DevTools in the browser while logged in and run:
```javascript
await fetch('/api/profile').then(r => r.json())
```

Expected: `{ user: { id, username, email, createdAt, bnetConnected: false }, characters: [] }`

- [ ] **Step 3: Commit**

```bash
git add app/api/profile/route.ts
git commit -m "feat: add profile API route returning user and bnet characters"
```

---

## Task 7: CharacterCard component

**Files:**
- Create: `components/profile/CharacterCard.tsx`

- [ ] **Step 1: Create components/profile/CharacterCard.tsx**

```typescript
"use client";
import type { BnetCharacter } from "@/lib/types";

const FACTION_COLORS = {
  horde: 'var(--red)',
  alliance: '#6CA6F0',
} as const;

const CLASS_COLORS: Record<number, string> = {
  1: '#C69B3A',
  2: '#F48CBA',
  3: '#AAD372',
  4: '#FFF468',
  5: '#FFFFFF',
  6: '#C41E3A',
  7: '#0070DD',
  8: '#3FC7EB',
  9: '#8788EE',
  10: '#00FF98',
  11: '#FF7C0A',
  12: '#A330C9',
  13: '#33937F',
};

export default function CharacterCard({ char }: { char: BnetCharacter }) {
  const classColor = CLASS_COLORS[char.classId] ?? 'var(--text)';
  const factionColor = FACTION_COLORS[char.faction];

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: classColor,
            fontFamily: 'Rajdhani',
            letterSpacing: 0.5,
          }}
        >
          {char.name}
        </span>
        <span style={{ fontSize: 10, color: factionColor, fontWeight: 700, letterSpacing: 0.5 }}>
          {char.faction === 'horde' ? 'HORDE' : 'ALLIANCE'}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
        {char.raceName} {char.className}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{char.realm}</span>
        <span
          style={{
            fontSize: 10,
            padding: '2px 6px',
            background: 'var(--surface3)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: 'var(--text-dim)',
          }}
        >
          Niv. {char.level}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/profile/CharacterCard.tsx
git commit -m "feat: add CharacterCard component"
```

---

## Task 8: Profile page

> ⚠️ **Depends on Task 9** — Complete Task 9 (Header update) before this task. `Header` must accept `active="profil"` or TypeScript will error.

**Files:**
- Create: `app/profil/page.tsx`

- [ ] **Step 1: Create app/profil/page.tsx**

```typescript
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import CharacterCard from "@/components/profile/CharacterCard";
import Button from "@/components/ui/Button";
import type { BnetCharacter } from "@/lib/types";

interface ProfileUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  bnetConnected: boolean;
}

interface ProfileData {
  user: ProfileUser;
  characters: BnetCharacter[];
}

export default function ProfilPage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/auth");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((j) => j && setData(j as ProfileData))
      .finally(() => setLoading(false));
  }, [router]);

  async function disconnect() {
    setDisconnecting(true);
    await fetch("/api/auth/bnet/disconnect", { method: "POST" });
    const res = await fetch("/api/profile");
    if (res.ok) setData((await res.json()) as ProfileData);
    setDisconnecting(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header active="profil" />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
          }}
        >
          Chargement…
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, characters } = data;
  const memberDate = new Date(user.createdAt).toLocaleDateString("fr-FR");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Header active="profil" />
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 24px",
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* User info */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--surface3)",
              border: "1px solid var(--border2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            👤
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontFamily: "Rajdhani",
                fontWeight: 700,
                color: "var(--gold-light)",
                letterSpacing: 1,
              }}
            >
              {user.username}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{user.email}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Membre depuis {memberDate}
            </div>
          </div>
        </div>

        {/* Battle.net section */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 12 }}>
            BATTLE.NET
          </div>
          {user.bnetConnected ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#22c55e", fontSize: 14 }}>●</span>
                <span style={{ fontSize: 13, color: "var(--text)" }}>Compte connecté</span>
              </div>
              <Button loading={disconnecting} onClick={disconnect}>
                DÉCONNECTER
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                Connectez votre compte pour importer vos personnages.
              </span>
              <Button onClick={() => router.push("/api/auth/bnet")}>
                CONNECTER BATTLE.NET
              </Button>
            </div>
          )}
        </div>

        {/* Characters */}
        {user.bnetConnected && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 12 }}>
              VOS PERSONNAGES ({characters.length})
            </div>
            {characters.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucun personnage trouvé.</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 8,
                }}
              >
                {characters.map((char) => (
                  <CharacterCard key={`${char.name}-${char.realmSlug}`} char={char} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/profil/
git commit -m "feat: add profile page with user info and bnet connection status"
```

---

## Task 9: Update Header — add PROFIL nav

**Files:**
- Modify: `components/layout/Header.tsx`

The `Header` component uses `type Page = "home" | "metiers" | "collections"`. Add `"profil"` and a nav entry.

- [ ] **Step 1: Update Header.tsx**

Replace the top of `components/layout/Header.tsx` (lines 1–16):

```typescript
"use client";
import { useRouter } from "next/navigation";

type Page = "home" | "metiers" | "collections" | "profil";

interface NavItem {
  label: string;
  page: Page;
  href: string;
}

const NAV: NavItem[] = [
  { label: "ACCUEIL", page: "home", href: "/" },
  { label: "MÉTIERS", page: "metiers", href: "/metiers" },
  { label: "COLLECTIONS", page: "collections", href: "/metiers" },
  { label: "PROFIL", page: "profil", href: "/profil" },
];
```

- [ ] **Step 2: Make the avatar button link to /profil**

In the same file, replace the logout button section (the `<div>` containing the 👤 button at the end of the header):

```typescript
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => router.push("/profil")}
          title="Profil"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--surface3)",
            border: "1px solid var(--border2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>👤</span>
        </button>
      </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual test — navigate to profile**

With dev server running:
1. Log in
2. Click PROFIL in nav — should load the profile page
3. Click the 👤 avatar button — should also navigate to /profil
4. Verify PROFIL appears highlighted (active state) when on `/profil`

- [ ] **Step 5: Commit**

```bash
git add components/layout/Header.tsx
git commit -m "feat: add PROFIL nav entry to header"
```

---

## Task 10: BattleNet API Guide

**Files:**
- Create: `docs/BNET_API_GUIDE.md`

- [ ] **Step 1: Create docs/BNET_API_GUIDE.md**

```markdown
# Guide — Obtenir une clé API BattleNet (WoW)

## 1. Créer un compte développeur Blizzard

1. Aller sur [https://develop.battle.net](https://develop.battle.net)
2. Se connecter avec un compte Battle.net existant (ou en créer un)

---

## 2. Créer un client OAuth

1. Cliquer sur **"CREATE CLIENT"** (en haut à droite)
2. Remplir le formulaire :
   - **Client Name** : `azero-dev` (ou le nom souhaité)
   - **Redirect URIs** : `http://localhost:3000/api/auth/bnet/callback`
   - **Service URL** : `http://localhost:3000` (optionnel en dev)
   - **Intended Use** : `Game Tools`
3. Cocher les **Terms of Service**
4. Cliquer **"SAVE"**

> En production, ajouter aussi l'URL de prod dans Redirect URIs, par exemple `https://monapp.com/api/auth/bnet/callback`.

---

## 3. Récupérer les credentials

Après création, la page affiche :
- **Client ID** → copier dans `BNET_CLIENT_ID`
- **Client Secret** → cliquer "SHOW SECRET" → copier dans `BNET_CLIENT_SECRET`

---

## 4. Configurer le projet

Dans `.env.local` (à la racine du projet) :

```env
BNET_CLIENT_ID=votre_client_id_ici
BNET_CLIENT_SECRET=votre_client_secret_ici
BNET_REDIRECT_URI=http://localhost:3000/api/auth/bnet/callback
```

> ⚠️ Ne jamais committer `.env.local`. Il est déjà dans `.gitignore`.

---

## 5. Scopes utilisés

| Scope | Usage |
|-------|-------|
| `wow.profile` | Accès aux personnages WoW du compte connecté |

---

## 6. Endpoints API utilisés dans ce projet

| Endpoint | Description |
|----------|-------------|
| `https://oauth.battle.net/authorize` | Redirection vers le consentement OAuth |
| `https://oauth.battle.net/token` | Échange du code d'autorisation contre un access token |
| `https://eu.api.blizzard.com/profile/user/wow` | Liste des personnages WoW (région EU) |

---

## 7. Tester la connexion

1. Lancer `npm run dev`
2. Se connecter sur l'app (`/auth`)
3. Aller sur `/profil`
4. Cliquer **"CONNECTER BATTLE.NET"**
5. Autoriser l'accès sur la page Battle.net
6. Être redirigé vers `/profil` avec les personnages affichés

---

## 8. Changer de région

Ce projet est configuré pour la région **EU uniquement**.  
Pour supporter d'autres régions, remplacer `eu.api.blizzard.com` par :
- `us.api.blizzard.com` (Amériques)
- `kr.api.blizzard.com` (Corée)
- `tw.api.blizzard.com` (Taïwan)

Et adapter `namespace=profile-eu` → `profile-us`, `profile-kr`, `profile-tw`.

---

## 9. Erreurs courantes

| Erreur | Cause | Fix |
|--------|-------|-----|
| `?error=bnet_denied` | Utilisateur a refusé l'autorisation | Normal, aucune action requise |
| `?error=token_failed` | Client ID/Secret incorrect ou Redirect URI non enregistrée | Vérifier les valeurs dans `.env.local` et sur develop.battle.net |
| `?error=chars_failed` | Access token invalide ou scope manquant | Vérifier que `wow.profile` est bien dans les scopes demandés |
| 401 sur l'API Blizzard | Token expiré | Se déconnecter et se reconnecter Battle.net |
```

- [ ] **Step 2: Commit**

```bash
git add docs/BNET_API_GUIDE.md
git commit -m "docs: add BattleNet API key setup guide"
```

---

## Task 11: End-to-end smoke test

- [ ] **Step 1: Full flow test**

1. `npm run dev`
2. Register a new account at `/auth`
3. Navigate to `/profil` — verify user info is displayed, BNet status shows "not connected"
4. Click **CONNECTER BATTLE.NET** — verify redirect to `oauth.battle.net`
5. Authorize — verify redirect back to `/profil` with characters displayed
6. Verify `data/characters.db` has records: `cat data/characters.db`
7. Click **DÉCONNECTER** — verify characters disappear and status reverts
8. Log out, log back in — verify session still works (NeDB persisted)

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "chore: verify bnet oauth + profile + nedb end-to-end"
```
```
