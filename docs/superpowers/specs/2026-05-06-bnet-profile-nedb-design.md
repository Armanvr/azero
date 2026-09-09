# Design: BattleNet OAuth + Profile Page + NeDB

Date: 2026-05-06  
Branch: aoz/bnet-connexion-and-api-link

## Scope

Three features shipped together:
1. `docs/BNET_API_GUIDE.md` — how to get a BattleNet API key
2. Profile page at `/profil` — read-only user info + BattleNet OAuth connect + character list
3. NeDB persistence — replace in-memory `Map` in `lib/auth.ts` with file-backed NeDB datastores

---

## Architecture

```
lib/db.ts                              ← NeDB datastores (usersDb, charactersDb)
lib/auth.ts                            ← swap Map → usersDb async calls
lib/types.ts                           ← add BnetCharacter, extend User

app/profil/page.tsx                    ← Profile page (server component, reads session)
app/api/profile/route.ts               ← GET: return user + stored characters
app/api/auth/bnet/route.ts             ← GET: redirect to oauth.battle.net/authorize
app/api/auth/bnet/callback/route.ts    ← GET: exchange code→token, fetch+store chars

components/layout/Header.tsx           ← add PROFIL nav entry

docs/BNET_API_GUIDE.md                 ← BNet dev portal + env vars guide
.env.local.example                     ← add BNET_CLIENT_ID/SECRET/REDIRECT_URI
```

---

## Data Models

### User (extended)

```typescript
interface User {
  id: string
  email: string
  username: string
  passwordHash: string
  createdAt: string
  bnetAccessToken?: string
  bnetTokenExpiry?: number   // unix ms timestamp
  bnetConnected?: boolean
}
```

### BnetCharacter (new)

```typescript
interface BnetCharacter {
  _id?: string              // NeDB auto-generated
  userId: string            // FK → User.id
  name: string
  realm: string
  realmSlug: string
  classId: number
  className: string
  raceId: number
  raceName: string
  level: number
  faction: 'horde' | 'alliance'
  avatarUrl?: string
  fetchedAt: string         // ISO timestamp
}
```

---

## NeDB Collections

File: `lib/db.ts`

```
data/users.db       ← persistent users collection
data/characters.db  ← persistent characters collection
```

Both use `autoload: true`. `data/` is gitignored.

Indexes:
- `usersDb`: unique index on `email`
- `charactersDb`: index on `userId`

---

## BattleNet OAuth Flow (EU, server-side)

### Endpoints

| Step | Route | Action |
|------|-------|--------|
| 1 | `GET /api/auth/bnet` | Redirect to `https://oauth.battle.net/authorize?...` |
| 2 | `GET /api/auth/bnet/callback` | Receive `code`, exchange for token, fetch chars, redirect `/profil` |

### OAuth parameters

```
Authorization URL: https://oauth.battle.net/authorize
Token URL:         https://oauth.battle.net/token
Characters API:    https://eu.api.blizzard.com/profile/user/wow
Scope:             wow.profile
Response type:     code
```

### Callback logic

1. Exchange `code` for `access_token` via POST to token URL (Basic auth with client_id:secret)
2. GET `https://eu.api.blizzard.com/profile/user/wow` with Bearer token
3. Store `access_token` + `bnetConnected: true` on user in `usersDb`
4. Store characters in `charactersDb` (delete old records for userId first)
5. Redirect to `/profil`

### Disconnect

`POST /api/auth/bnet/disconnect` — clear `bnetAccessToken`, set `bnetConnected: false`, remove characters from DB.

---

## Profile Page Layout

```
┌────────────────────────────────────────────┐
│ [Header — PROFIL active]                   │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 👤  Username                         │  │
│  │     email@example.com                │  │
│  │     Membre depuis DD/MM/YYYY         │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ BATTLE.NET                           │  │
│  │                                      │  │
│  │  [Connect with Battle.net]           │  │  ← not connected
│  │   or                                 │  │
│  │  ✓ Connecté  [Déconnecter]           │  │  ← connected
│  └──────────────────────────────────────┘  │
│                                            │
│  VOS PERSONNAGES (if connected)            │
│  ┌──────┐ ┌──────┐ ┌──────┐              │
│  │Char 1│ │Char 2│ │Char 3│ ...          │
│  └──────┘ └──────┘ └──────┘              │
│                                            │
└────────────────────────────────────────────┘
```

Character card shows: name, realm, level, class, faction badge.

---

## Environment Variables

```
# Existing
AZERO_SESSION_SECRET=

# New
BNET_CLIENT_ID=
BNET_CLIENT_SECRET=
BNET_REDIRECT_URI=http://localhost:3000/api/auth/bnet/callback
```

---

## Files to Create

- `lib/db.ts`
- `app/profil/page.tsx`
- `app/api/profile/route.ts`
- `app/api/auth/bnet/route.ts`
- `app/api/auth/bnet/callback/route.ts`
- `app/api/auth/bnet/disconnect/route.ts`
- `components/profile/CharacterCard.tsx`
- `docs/BNET_API_GUIDE.md`

## Files to Modify

- `lib/auth.ts` — async DB calls, add bnet field helpers
- `lib/types.ts` — extend User, add BnetCharacter
- `components/layout/Header.tsx` — add PROFIL nav
- `.env.local.example` — add BNET vars
- `.gitignore` — add `data/`

---

## Constraints

- Region: EU only (`oauth.battle.net` + `eu.api.blizzard.com`)
- Characters fetched once on connect, stored in NeDB
- Profile page read-only (no settings editing in this iteration)
- No NextAuth — custom OAuth with API routes
