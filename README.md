# Azero

**Azero** est un dashboard de type _Armory_ pour World of Warcraft.  
Il permet à un joueur de consulter l'équipement de ses personnages, de découvrir les items obtenables par slot avec leurs sources d'obtention, et de gérer plusieurs personnages sur un même compte.

---

## Aperçu

- Dashboard 3 colonnes : slots équipés gauche · portrait central · slots équipés droite
- Panel inférieur : items obtenables filtrés par slot (onglets TÊTE / ÉPAULES / TORSE / JAMBES…)
- Detail Panel animé (slide-in) au clic sur n'importe quel item — nom, stats, sources d'obtention avec difficulté et drop rate
- Authentification email/mot de passe avec session JWT (cookie `httpOnly`)
- Gestion multi-personnages par compte (dropdown avec couleurs de classe WoW)

> **V1** — Les données sont mockées (3 personnages factices). Le store utilisateurs est en mémoire (perdu à chaque redémarrage). Voir [Roadmap](#roadmap-v2) pour la suite.

---

## Stack

| Couche | Technologie |
|---|---|
| Framework | Next.js (App Router) |
| Langage | TypeScript strict |
| Style | Tailwind CSS v4 + tokens CSS custom |
| État UI | Zustand |
| Auth | JWT signé HS256 (jose) + bcryptjs |
| Lint/Format | Biome (`lint`, `lint:fix`, `format`) |
| Polices | Rajdhani · Exo 2 (Google Fonts) |

---

## Prérequis

- **Node.js** 24.x LTS (géré via `.nvmrc` — `nvm use`)
- **npm** ≥ 9 (ou pnpm / yarn)

---

## Installation

```bash
git clone <repo>
cd azero
npm install
```

### Configuration

Copier le fichier d'exemple et renseigner le secret de session :

```bash
cp .env.local.example .env.local
```

Éditer `.env.local` :

```env
AZERO_SESSION_SECRET=<chaîne_aléatoire_≥_32_caractères>
# Générer avec : openssl rand -base64 48
```

> Sans `.env.local`, un secret de fallback est utilisé (dev uniquement — **ne pas déployer en production**).

---

## Lancer le projet

```bash
# Développement
npm run dev
# → http://localhost:3000

# Build de production
npm run build
npm start
```

Première utilisation :

1. Vous êtes redirigé vers `/auth`.
2. Onglet **INSCRIPTION** → créez un compte (email / pseudo / mot de passe).
3. Vous arrivez sur le dashboard avec le personnage **Kratós** sélectionné.

---

## Structure du projet

```
azero/
├─ app/
│  ├─ layout.tsx                  # Polices Google + globals
│  ├─ globals.css                 # Tokens CSS + keyframes
│  ├─ page.tsx                    # Dashboard principal
│  ├─ auth/page.tsx               # Connexion / Inscription
│  ├─ metiers/page.tsx            # Coming Soon
│  └─ api/
│     ├─ auth/{login,register,logout}/route.ts
│     ├─ characters/route.ts
│     ├─ characters/[id]/route.ts
│     ├─ items/[id]/sources/route.ts
│     └─ items/slot/[slot]/route.ts
├─ proxy.ts                    # Garde de routes (redirect /auth ↔ /)
├─ components/
│  ├─ layout/         # Header, CharacterBar
│  ├─ character/      # CharacterDropdown, CharAvatar, StatChip
│  ├─ equipment/      # ItemSlot, ObtainableItem, ItemDetailPanel, SourceCard, DiffBadge, RarityDot
│  └─ ui/             # Button, Input, SegmentTabs
├─ lib/
│  ├─ types.ts        # Types métier (Character, Item, etc.)
│  ├─ constants.ts    # Couleurs rareté / classe / difficulté
│  ├─ mock-data.ts    # 3 personnages + items obtenables + sources
│  └─ auth.ts         # Hash bcrypt + JWT (jose) + cookie httpOnly
├─ store/
│  └─ character-store.ts   # Zustand : personnage sélectionné, catégorie, item actif
├─ .env.local.example
└─ package.json
```

---

## Routes

| Route | Description |
|---|---|
| `GET  /` | Dashboard principal (auth requis) |
| `GET  /auth` | Connexion / Inscription |
| `GET  /metiers` | Coming Soon |
| `POST /api/auth/register` | Création de compte + session |
| `POST /api/auth/login` | Connexion + session |
| `POST /api/auth/logout` | Déconnexion (clear cookie) |
| `GET  /api/characters` | Liste des personnages du compte |
| `GET  /api/characters/:id` | Détail d'un personnage |
| `GET  /api/items/:id/sources` | Sources d'obtention d'un item |
| `GET  /api/items/slot/:slot` | Items obtenables pour un slot |

---

## Design system

Le design est entièrement dark. Les tokens CSS principaux :

```css
--bg:         #0c0c10   /* fond global */
--surface:    #13131a   /* surface principale */
--gold:       #c9960c   /* or WoW */
--gold-light: #f0b429
--purple:     #a855f7   /* épique */
--blue:       #38bdf8   /* rare */
--green:      #4ade80   /* peu commun */
--red:        #f87171   /* légendaire / M+ */
--text:       #e2e2f0
--text-dim:   #8888aa
```

Typographie : **Rajdhani** (titres, noms d'items) · **Exo 2** (UI, labels, corps).

---

## Dépannage

| Problème | Solution |
|---|---|
| Comptes perdus après redémarrage | Comportement normal V1 (store in-memory). |
| Boucle de redirection sur `/auth` | Vérifier `AZERO_SESSION_SECRET` ≥ 32 caractères dans `.env.local`. |
| Polices manquantes | Vérifier la connexion à `fonts.googleapis.com`. |
| Port 3000 occupé | `PORT=3001 npm run dev` |

---

## Roadmap V2

- Connexion API Blizzard (Battle.net OAuth + Game Data + Profile API)
- Page **Métiers** (progression par personnage)
- Persistance DB (Prisma + PostgreSQL ou Supabase) — remplacer le store in-memory
- Migration auth vers **NextAuth.js** (Battle.net provider)
- Remplacement des emojis décoratifs par des icônes SVG (Lucide / Heroicons)

---

## Licence

Projet privé — usage personnel.
