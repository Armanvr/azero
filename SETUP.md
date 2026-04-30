# Azero — Setup

Dashboard Armory pour World of Warcraft (Next.js 14 + TypeScript).
Cette V1 utilise des **données mockées** (3 personnages factices) et une auth locale (cookie JWT signé, store utilisateurs en mémoire).

## Prérequis

- **Node.js** ≥ 18.18 (recommandé : 20.x LTS)
- **npm** ≥ 9 (ou pnpm / yarn — adapter les commandes)

## Installation

```bash
cd /Users/nebula/Projets/azero
npm install
```

## Configuration

Créer un fichier `.env.local` à la racine (à partir de l'exemple fourni) :

```bash
cp .env.local.example .env.local
```

Puis éditer la valeur de `AZERO_SESSION_SECRET` (chaîne aléatoire ≥ 32 caractères, ex. `openssl rand -base64 48`).

```env
AZERO_SESSION_SECRET=<chaîne_aléatoire_longue>
```

> Si vous lancez sans `.env.local`, un secret de fallback est utilisé (dev seulement). À ne **pas** déployer en production.

## Lancer en développement

```bash
npm run dev
```

L'app est disponible sur [http://localhost:3000](http://localhost:3000).

Première utilisation :
1. Vous serez redirigé sur `/auth`.
2. Cliquez sur l'onglet **INSCRIPTION** → créez un compte (n'importe quel email/pseudo/mot de passe).
3. Vous arriverez automatiquement sur `/` avec le personnage **Kratós** sélectionné.

> ⚠️ Le store utilisateurs est en mémoire (`Map` JS). Les comptes sont **perdus à chaque redémarrage du serveur**. C'est volontaire pour la V1.

## Build de production

```bash
npm run build
npm start
```

## Structure du projet

```
azero/
├─ app/
│  ├─ layout.tsx            # Polices Google + globals
│  ├─ globals.css           # Tokens CSS + keyframes
│  ├─ page.tsx              # Dashboard principal (3 cols + bottom panel + detail)
│  ├─ auth/page.tsx         # Connexion / Inscription (segment tabs)
│  ├─ metiers/page.tsx      # Coming Soon
│  └─ api/
│     ├─ auth/{login,register,logout}/route.ts
│     ├─ characters/route.ts
│     ├─ characters/[id]/route.ts
│     ├─ items/[id]/sources/route.ts
│     └─ items/slot/[slot]/route.ts
├─ components/
│  ├─ layout/{Header,CharacterBar}.tsx
│  ├─ character/{CharacterDropdown,CharAvatar,StatChip}.tsx
│  ├─ equipment/{ItemSlot,ObtainableItem,ItemDetailPanel,SourceCard,DiffBadge,RarityDot}.tsx
│  └─ ui/{Button,Input,SegmentTabs}.tsx
├─ lib/
│  ├─ types.ts              # Types métier (Character, Item, etc.)
│  ├─ constants.ts          # Couleurs (rarity / class / difficulty)
│  ├─ mock-data.ts          # 3 personnages + items obtainables + sources
│  └─ auth.ts               # Hash bcrypt + JWT (jose) + cookie httpOnly
├─ store/
│  └─ character-store.ts    # Zustand : sélection perso, catégorie, item actif
├─ middleware.ts            # Garde de routes (redirect /auth ↔ /)
├─ next.config.mjs
├─ tailwind.config.ts
├─ postcss.config.mjs
├─ tsconfig.json
├─ .env.local.example
└─ package.json
```

## Routes

| Route                          | Description                          |
| ------------------------------ | ------------------------------------ |
| `GET  /`                       | Dashboard principal (auth requis)    |
| `GET  /auth`                   | Connexion / Inscription              |
| `GET  /metiers`                | Page Coming Soon                     |
| `POST /api/auth/register`      | Création de compte + session         |
| `POST /api/auth/login`         | Connexion + session                  |
| `POST /api/auth/logout`        | Déconnexion (clear cookie)           |
| `GET  /api/characters`         | Liste des personnages du compte      |
| `GET  /api/characters/:id`     | Détail d'un personnage               |
| `GET  /api/items/:name/sources`| Sources d'obtention d'un item        |
| `GET  /api/items/slot/:slot`   | Items obtenables pour un slot        |

## Stack

- **Next.js 14** (App Router, route handlers, middleware)
- **TypeScript strict**
- **Tailwind CSS** (config minimal — la fidélité visuelle s'appuie sur les tokens CSS du design system + styles inline issus du prototype)
- **Zustand** pour l'état UI (perso sélectionné, item actif, catégorie)
- **jose** (JWT signé HS256) pour les sessions, **bcryptjs** pour le hash mot de passe
- Polices : **Rajdhani** (titres / items) et **Exo 2** (UI / corps), via Google Fonts

## Comportements implémentés (V1)

- ✅ Auth email/mot de passe (inscription, login, logout) via cookie httpOnly signé
- ✅ Garde de routes via `middleware.ts` (toute page hors `/auth` redirige vers l'auth si non connecté)
- ✅ Dashboard 3 colonnes : 8 slots gauche · portrait + avatar SVG · 8 slots droite
- ✅ Sélection de personnage via dropdown (3 personnages mockés ; clic extérieur ferme)
- ✅ Stat chips inline (Or, iLvl, M+)
- ✅ Panel inférieur avec onglets (TÊTE / ÉPAULES / TORSE / JAMBES) et grille `auto-fill 220px`
- ✅ Detail Panel `position:fixed` 320px avec `slideInR` ; cliquer un autre item le remplace
- ✅ Animations `fadeIn` staggered sur les items obtenables et les sources

## Roadmap V2 (non implémentée)

- ⬜ Connexion API Blizzard (Battle.net OAuth + Game Data + Profile API)
- ⬜ Page **Métiers** réelle (progression par personnage)
- ⬜ Persistance DB (Prisma + PostgreSQL ou Supabase) — remplacer la `Map` en mémoire
- ⬜ Migration auth vers **NextAuth.js** (Battle.net provider)
- ⬜ Remplacer les emojis décoratifs par des icônes SVG (Lucide / Heroicons)

## Dépannage

- **« Les comptes disparaissent après redémarrage »** → comportement normal V1 (in-memory). Voir Roadmap V2.
- **« Boucle de redirection /auth »** → vérifier `AZERO_SESSION_SECRET` dans `.env.local` (au moins 32 caractères).
- **Polices manquantes** → vérifier la connexion à `fonts.googleapis.com` (le `<head>` les charge depuis `app/layout.tsx`).
- **Port 3000 occupé** → `PORT=3001 npm run dev`.
