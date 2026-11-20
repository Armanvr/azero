# Azero

**Azero** est un dashboard de type _Armory_ pour World of Warcraft.  
Il permet de rechercher et consulter l'équipement de n'importe quel personnage EU, d'enrichir les données via l'API Blizzard et WowHead, et de gérer ses favoris sur un compte connecté.

---

## Aperçu

- **Recherche publique** : formulaire sur la homepage et champ du header (`Nom-Royaume`) — aucune connexion requise. Le royaume peut être saisi sous n'importe quelle forme (slug, nom affiché, accents) : il est résolu côté serveur via l'index des royaumes Blizzard
- **Fiche personnage** : équipement complet, icônes BNet, stats d'item en français, sources de drop WowHead
- **Compte connecté** : liaison Battle.net, favoris ★ / sous-favoris ☆, liste des personnages du compte sur l'accueil
- **Métiers du compte** : métiers principaux de chaque personnage (API professions Battle.net, cache 1h)
- **Tableau hebdomadaire** `/planning` : maquette avec données de démonstration (`app/planning/mock-data.ts`)
- **Cache MongoDB** : `SearchCache` pour les recherches publiques (1h pour un personnage trouvé, 5 min pour un personnage introuvable, jamais pour une erreur Battle.net), `ItemCache` (7j) pour les données d'items
- **Auth email/mot de passe** : session JWT HS256 cookie `httpOnly`
- **Mot de passe oublié** : code de récupération affiché une seule fois (inscription, réinitialisation ou `/profil`), sans email

---

## Stack

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript strict |
| Style | CSS vanilla : CSS Modules + tokens CSS custom |
| Auth | JWT HS256 (jose) + bcryptjs |
| Base de données | MongoDB + Mongoose |
| Lint/Format | Biome |
| Polices | Cinzel · Figtree (`next/font`, hébergées avec le site) |
| Tests | `node:test` (runner intégré de Node, sans base ni réseau) |

---

## Prérequis

- **Node.js** : version indiquée dans `.nvmrc` (`nvm use`)
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

# JWT session (>= 32 caractères, obligatoire en production)
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
npm test           # tests/ : node:test, stubs dans tests/stubs
npm run lint
```

### Premier démarrage

1. Homepage `/` : formulaire de recherche de personnage (accès libre)
2. Pour un compte : `/auth` → inscription → liaison Battle.net sur `/profil`
3. Une fois BNet connecté, les personnages du compte apparaissent sur l'accueil et dans `/metiers`

---

## Structure du projet

```
azero/
├─ app/
│  ├─ layout.tsx
│  ├─ globals.css                  # Tokens CSS + styles de base
│  ├─ page.tsx                     # Personnages : recherche (public) + personnages du compte
│  ├─ auth/page.tsx                # Connexion / Inscription / Mot de passe oublié
│  ├─ metiers/page.tsx             # Métiers du compte (auth requis)
│  ├─ planning/                    # Tableau hebdomadaire (auth requis, données de démonstration)
│  ├─ profil/page.tsx              # Gestion compte + BNet (auth requis)
│  ├─ personnage/[realm]/[name]/page.tsx   # Fiche personnage (public)
│  └─ api/
│     ├─ auth/{login,register,logout,reset}/
│     ├─ auth/bnet/{route,callback,disconnect}/
│     ├─ characters/route.ts               # Liste personnages (auth)
│     ├─ characters/[id]/enrich/route.ts
│     ├─ characters/public/[realm]/[name]/ # Lookup public (cache-first) + talents/
│     ├─ items/[id]/sources/route.ts       # Stats + sources (journal Blizzard, recettes)
│     ├─ professions/route.ts              # Métiers des personnages du compte (auth)
│     └─ profile/{route,favorites,recovery-code}/
├─ proxy.ts                        # Garde de routes (protège /metiers, /planning, /profil)
├─ components/
│  ├─ layout/         # Header (navigation, recherche, avatar)
│  ├─ character/      # CharAvatar
│  ├─ equipment/      # ItemSlot, ItemDetailPanel, SourceCard
│  ├─ talents/        # TalentsTab, TalentTreeView
│  ├─ profile/        # CharacterCard (cliquable → fiche)
│  └─ ui/             # Button, Input, RecoveryCode
├─ lib/
│  ├─ types.ts        # Types métier (Character, EquippedItem, Profession…)
│  ├─ constants.ts    # Couleurs et libellés rareté / classe
│  ├─ characterPath.ts # Liens vers une fiche, slug de royaume, URL d'API depuis useParams
│  ├─ auth.ts         # bcrypt + JWT + cookies
│  ├─ session.ts      # Secret + vérification JWT (partagé avec proxy.ts)
│  ├─ db.ts           # Connexion MongoDB singleton + exports modèles
│  ├─ models/
│  │  ├─ User.ts
│  │  ├─ Character.ts
│  │  ├─ SearchCache.ts    # Cache recherches publiques (TTL 1h)
│  │  └─ ItemCache.ts      # Cache données items (TTL 7j)
│  └─ services/
│     ├─ bnetToken.ts      # Token client credentials BNet + appels avec statut, timeout et relance sur 401
│     ├─ realm.ts          # Slug réel d'un royaume via l'index Blizzard (cache mémoire 24h)
│     ├─ character.ts      # Mapping personnage + équipement BNet (partagé par les routes)
│     ├─ itemService.ts    # Objet Blizzard + sources + cache
│     ├─ sourceService.ts  # Sources : journal Blizzard (raid, donjon) et index des recettes
│     └─ talentService.ts  # Talents d'un personnage (profil + arbre statique Blizzard)
├─ tests/                          # Tests node:test + stubs (base, cookies, fetch)
├─ docs/
│  └─ BNET_API_GUIDE.md
├─ .env.local.example
└─ package.json
```

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `GET  /` | Non | Recherche de personnage + personnages du compte si connecté |
| `GET  /auth` | Non | Connexion / Inscription |
| `GET  /personnage/[realm]/[name]` | Non | Fiche personnage publique |
| `GET  /metiers` | Oui | Métiers du compte |
| `GET  /planning` | Oui | Tableau hebdomadaire (données de démonstration) |
| `GET  /api/professions` | Oui | Métiers principaux des personnages du compte (cache 1h) |
| `GET  /profil` | Oui | Compte + liaison BNet |
| `POST /api/auth/register` | Non | Création de compte + session |
| `POST /api/auth/login` | Non | Connexion + session |
| `POST /api/auth/logout` | Non | Déconnexion |
| `POST /api/auth/reset` | Non | Nouveau mot de passe via code de récupération |
| `POST /api/profile/recovery-code` | Oui | Génère un nouveau code de récupération |
| `GET  /api/auth/bnet` | Oui | Initiation OAuth Battle.net |
| `GET  /api/auth/bnet/callback` | Oui | Callback OAuth : liste les personnages, ne stocke pas le token utilisateur |
| `POST /api/auth/bnet/disconnect` | Oui | Déconnexion BNet |
| `GET  /api/characters` | Oui | Liste personnages max-level (triés) |
| `POST /api/characters/:id/enrich` | Oui | Enrichissement via BNet. 404 personnage introuvable, 502/503 Battle.net indisponible ; n'écrase jamais les données stockées en cas d'échec |
| `GET  /api/characters/public/:realm/:name` | Non | Lookup public (SearchCache → BNet). 404 personnage introuvable, 502 erreur Battle.net, 503 pas de token |
| `GET  /api/items/:id/sources` | Non | Stats + sources drop (ItemCache → BNet + WowHead). 400 si l'id est invalide |
| `GET  /api/profile` | Oui | Données utilisateur + personnages |
| `PUT  /api/profile/favorites` | Oui | Mise à jour favoris |

---

## Design system

Dark only. Tokens CSS principaux :

```css
--bg:         #0d0c0a
--surface:    #12100d
--border:     #2a241b
--gold:       #c9a45f   /* action, accent */
--gold-light: #d4af6a   /* liens, grands chiffres */
--gold-dim:   #8f7645   /* progression partielle */
--green:      #7fb069   /* prêt */
--red:        #c8553d   /* alerte, erreur */
--text:       #ece3cf
--text-dim:   #9a8f7a
--text-muted: #6b6252
--rarity-legendary: #e08a3c
--rarity-epic:      #a57bd6
--rarity-rare:      #5b95d6
```

Liste complète dans `app/globals.css`. Typographie : **Cinzel** (titres, chiffres, libellés gravés) · **Figtree** (texte).

L'illustration de la page de connexion est optionnelle : déposer le fichier dans `public/` (par exemple `public/login-art.jpg`) et l'ajouter comme couche de fond dans `app/auth/page.module.css` (`.art`), au-dessus de l'ambiance en CSS.

---

## Dépannage

| Problème | Solution |
|---|---|
| `MONGODB_URI not defined` | Ajouter `MONGODB_URI` dans `.env.local` |
| Connexion MongoDB échoue | Vérifier les credentials Atlas + IP whitelist |
| BNet OAuth échoue (`bnet_not_configured`) | Vérifier `BNET_CLIENT_ID`, `BNET_CLIENT_SECRET`, `BNET_REDIRECT_URI` |
| Boucle de redirection sur `/auth` | Vérifier `AZERO_SESSION_SECRET` ≥ 32 caractères |
| Fiche personnage lente (1ère fois) | Normal — fetch BNet + 20+ appels icônes. Ensuite en cache : 1h pour un personnage trouvé, 5 min pour un introuvable. |
| « Battle.net est indisponible » | Erreur ou délai côté Blizzard, ou identifiants `BNET_CLIENT_ID` / `BNET_CLIENT_SECRET` invalides : voir les lignes `bnet <statut> <chemin>` dans les logs serveur |
| Échec du build sur les polices | `next/font` télécharge Cinzel et Figtree au build : vérifier l'accès à `fonts.googleapis.com` à ce moment-là |
| Port 3000 occupé | `PORT=3001 npm run dev` |

---

## Prochaines étapes

- **Planning** : remplacer les données de démonstration par un vrai suivi
- **Métiers** : cooldowns et craftables (non exposés par l'API Battle.net)
- Fiche personnage : onglets Talents, Hauts faits, Collection
- Instance info sur les sources d'items (Blizzard journal API → boss → zone)
- Raider.IO API → score Mythic+
- Remplacement emojis décoratifs par SVG (Lucide / Heroicons)
- Support multi-régions (US / KR / TW)

---

## Licence

Projet privé — usage personnel.
