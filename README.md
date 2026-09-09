# Azero

**Azero** est un dashboard de type _Armory_ pour World of Warcraft.  
Il permet de rechercher et consulter l'équipement de n'importe quel personnage EU, d'enrichir les données via l'API Blizzard et WowHead, et de gérer ses favoris sur un compte connecté.

---

## Aperçu

- **Recherche publique** : formulaire sur la homepage — aucune connexion requise
- **Fiche personnage** : équipement complet, icônes BNet, stats d'item en français, sources de drop WowHead
- **Compte connecté** : liaison Battle.net, favoris ★ / sous-favoris ☆, dropdown Personnages dans le header
- **Cache MongoDB** : `SearchCache` (1h) pour les recherches publiques, `ItemCache` (7j) pour les données d'items
- **Auth email/mot de passe** : session JWT HS256 cookie `httpOnly`

---

## Stack

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript strict |
| Style | Tailwind CSS v4 + tokens CSS custom |
| État UI | Zustand |
| Auth | JWT HS256 (jose) + bcryptjs |
| Base de données | MongoDB + Mongoose |
| Lint/Format | Biome |
| Polices | Rajdhani · Exo 2 (Google Fonts) |

---

## Prérequis

- **Node.js** 24.x LTS
- **MongoDB** : instance locale ou [Atlas free tier](https://www.mongodb.com/atlas)
- Compte développeur Blizzard → [develop.battle.net](https://develop.battle.net)

---

## Installation

```bash
git clone <repo>
cd azero
npm install
```

### Configuration

```bash
cp .env.local.example .env.local
```

Renseigner `.env.local` :

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

# JWT session (>= 32 caractères)
AZERO_SESSION_SECRET=<openssl rand -base64 48>

# Battle.net OAuth (develop.battle.net)
BNET_CLIENT_ID=your_client_id
BNET_CLIENT_SECRET=your_client_secret
BNET_REDIRECT_URI=http://localhost:3000/api/auth/bnet/callback
```

Voir `docs/BNET_API_GUIDE.md` pour la configuration complète des credentials Blizzard.

---

## Lancer le projet

```bash
npm run dev        # http://localhost:3000
npm run build
npm start
```

### Premier démarrage

1. Homepage `/` : formulaire de recherche de personnage (accès libre)
2. Pour un compte : `/auth` → inscription → liaison Battle.net sur `/profil`
3. Une fois BNet connecté, le bouton PERSONNAGES apparaît dans le header

---

## Structure du projet

```
azero/
├─ app/
│  ├─ layout.tsx
│  ├─ globals.css                  # Tokens CSS + keyframes
│  ├─ page.tsx                     # Formulaire de recherche (public)
│  ├─ auth/page.tsx                # Connexion / Inscription
│  ├─ metiers/page.tsx             # Coming Soon (auth requis)
│  ├─ profil/page.tsx              # Gestion compte + BNet (auth requis)
│  ├─ personnage/[realm]/[name]/page.tsx   # Fiche personnage (public)
│  └─ api/
│     ├─ auth/{login,register,logout}/
│     ├─ auth/bnet/{route,callback,disconnect}/
│     ├─ characters/route.ts               # Liste personnages (auth)
│     ├─ characters/[id]/route.ts
│     ├─ characters/[id]/enrich/route.ts
│     ├─ characters/public/[realm]/[name]/ # Lookup public (cache-first)
│     ├─ items/[id]/sources/route.ts       # Stats + sources WowHead
│     ├─ items/slot/[slot]/route.ts
│     └─ profile/{route,favorites}/
├─ proxy.ts                        # Garde de routes (protège /metiers, /profil)
├─ components/
│  ├─ layout/         # Header (dropdown favoris), CharacterBar
│  ├─ character/      # CharAvatar, CharacterDropdown, StatChip
│  ├─ equipment/      # ItemSlot, ItemDetailPanel, SourceCard, DiffBadge, RarityDot
│  ├─ profile/        # CharacterCard (cliquable → fiche)
│  └─ ui/             # Button, Input, SegmentTabs
├─ lib/
│  ├─ types.ts        # Types métier (Character, EquippedItem, SelectedItem…)
│  ├─ constants.ts    # Couleurs rareté / classe / difficulté
│  ├─ auth.ts         # bcrypt + JWT + cookies
│  ├─ db.ts           # Connexion MongoDB singleton + exports modèles
│  ├─ models/
│  │  ├─ User.ts
│  │  ├─ Character.ts
│  │  ├─ SearchCache.ts    # Cache recherches publiques (TTL 1h)
│  │  └─ ItemCache.ts      # Cache données items (TTL 7j)
│  └─ services/
│     ├─ bnetToken.ts      # Client credentials token BNet (singleton)
│     └─ itemService.ts    # Orchestration Blizzard + WowHead + cache
├─ store/
│  └─ character-store.ts   # Zustand : personnage sélectionné, item actif
├─ docs/
│  └─ BNET_API_GUIDE.md
├─ .env.local.example
└─ package.json
```

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `GET  /` | Non | Formulaire de recherche de personnage |
| `GET  /auth` | Non | Connexion / Inscription |
| `GET  /personnage/[realm]/[name]` | Non | Fiche personnage publique |
| `GET  /metiers` | Oui | Coming Soon |
| `GET  /profil` | Oui | Compte + liaison BNet |
| `POST /api/auth/register` | Non | Création de compte + session |
| `POST /api/auth/login` | Non | Connexion + session |
| `POST /api/auth/logout` | Non | Déconnexion |
| `GET  /api/auth/bnet` | Oui | Initiation OAuth Battle.net |
| `GET  /api/auth/bnet/callback` | Oui | Callback OAuth |
| `POST /api/auth/bnet/disconnect` | Oui | Déconnexion BNet |
| `GET  /api/characters` | Oui | Liste personnages max-level (triés) |
| `GET  /api/characters/:id` | Oui | Détail personnage |
| `POST /api/characters/:id/enrich` | Oui | Enrichissement lazy via BNet |
| `GET  /api/characters/public/:realm/:name` | Non | Lookup public (SearchCache → BNet) |
| `GET  /api/items/:id/sources` | Non | Stats + sources drop (ItemCache → BNet + WowHead) |
| `GET  /api/items/slot/:slot` | Non | Items obtenables par slot |
| `GET  /api/profile` | Oui | Données utilisateur + personnages |
| `PUT  /api/profile/favorites` | Oui | Mise à jour favoris |

---

## Design system

Dark only. Tokens CSS principaux :

```css
--bg:         #0c0c10
--surface:    #13131a
--gold:       #c9960c
--gold-light: #f0b429
--purple:     #a855f7
--blue:       #38bdf8
--green:      #4ade80
--red:        #f87171
--text:       #e2e2f0
--text-dim:   #8888aa
--text-muted: #55556a
```

Typographie : **Rajdhani** (titres, noms d'items) · **Exo 2** (UI, labels).

---

## Dépannage

| Problème | Solution |
|---|---|
| `MONGODB_URI not defined` | Ajouter `MONGODB_URI` dans `.env.local` |
| Connexion MongoDB échoue | Vérifier les credentials Atlas + IP whitelist |
| BNet OAuth échoue (`bnet_not_configured`) | Vérifier `BNET_CLIENT_ID`, `BNET_CLIENT_SECRET`, `BNET_REDIRECT_URI` |
| Boucle de redirection sur `/auth` | Vérifier `AZERO_SESSION_SECRET` ≥ 32 caractères |
| Fiche personnage lente (1ère fois) | Normal — fetch BNet + 20+ appels icônes. Cache TTL 1h ensuite. |
| Polices manquantes | Vérifier connexion à `fonts.googleapis.com` |
| Port 3000 occupé | `PORT=3001 npm run dev` |

---

## Prochaines étapes

- Page **Métiers** : progression par personnage (BNet professions API)
- Instance info sur les sources d'items (Blizzard journal API → boss → zone)
- Raider.IO API → score Mythic+
- Remplacement emojis décoratifs par SVG (Lucide / Heroicons)
- Support multi-régions (US / KR / TW)

---

## Licence

Projet privé — usage personnel.
