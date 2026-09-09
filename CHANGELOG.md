# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [0.2.0] — 2026-05-20

### Ajouté

#### Architecture base de données
- Migration **NeDB → MongoDB + Mongoose** : remplacement complet de `@seald-io/nedb`
- Modèles Mongoose : `User`, `Character`, `SearchCache`, `ItemCache`
- `SearchCache` : cache public des recherches de personnages (TTL 1h, index unique `{realm, name, region}`)
- `ItemCache` : cache des données d'items — stats Blizzard + sources WowHead (TTL 7 jours)
- `lib/db.ts` : singleton de connexion MongoDB (pattern global Next.js)
- `MONGODB_URI` ajouté dans `.env.local.example`

#### Page d'accueil publique — recherche de personnage
- Nouvelle homepage `/` : formulaire de recherche par nom + realm slug (aucune auth requise)
- Accessible aux utilisateurs déconnectés
- `GET /api/characters/public/[realm]/[name]` : client credentials BNet, cache-first (`SearchCache`)

#### Fiche de personnage publique
- Nouvelle route `/personnage/[realm]/[name]` : fiche complète via API publique BNet
- Header visible dans tous les états (chargement, erreur, données)

#### Enrichissement des items
- `lib/services/bnetToken.ts` : token client credentials BNet partagé (singleton module)
- `lib/services/itemService.ts` : orchestration Blizzard API + WowHead XML + cache MongoDB
- Blizzard Game Data API → stats d'item en français (Endurance, Hâte, Maîtrise…)
- WowHead XML (`/item={id}&xml`) → sources de drop : boss + taux de drop
- `EquippedItem.itemId` + `SelectedItem.itemId` : ID numérique Blizzard propagé jusqu'au `ItemDetailPanel`
- `GET /api/items/[id]/sources` : réécrit — accepte ID numérique, retourne stats + sources réelles
- `ItemSlot` → `SelectedItem` : passage du `itemId` au clic
- `ItemDetailPanel` : appel par ID numérique, skip si `itemId` absent

#### Header — dropdown Personnages
- Bouton PERSONNAGES visible uniquement pour utilisateurs connectés avec BNet lié
- Dropdown avec liste des favoris (★) et sous-favoris (☆)
- Fallback : lien direct vers premier personnage si aucun favori configuré
- Fermeture au clic extérieur

#### Navigation profil
- Clic sur `CharacterCard` → navigation vers `/personnage/[realm]/[name]`
- `onView` prop sur `CharacterCard` ; boutons internes avec `stopPropagation`

#### Middleware — garde de routes sélective
- `proxy.ts` : garde de routes ciblée (convention du projet)
- `/metiers` et `/profil` redirigent vers `/auth` si non connecté
- `/`, `/auth`, `/personnage/*` : accès libre
- `/auth` redirige vers `/` si déjà connecté

### Modifié

- `lib/db.ts` : vérification `MONGODB_URI` déplacée dans `connectDB()` — plus de crash au démarrage
- `app/auth/page.tsx` : Header ajouté (navigation visible sur la page d'auth)
- `app/metiers/page.tsx` : vérification auth au montage
- `Page` type Header : ajout de `'personnage'`
- Routes enrich + public : `EquippedItem` inclut désormais `itemId`
- `CharacterCard` : hover effect sur le conteneur + `onView` prop

### Supprimé

- `lib/mock-data.ts` (748 lignes) — remplacé par vraies données BNet + MongoDB
- `@seald-io/nedb` dependency
- `data/` directory (fichiers `.db` NeDB)

---

## [0.1.2] — 2026-05-19/20

### Ajouté

#### BNet OAuth
- `GET  /api/auth/bnet` : initiation du flux OAuth Battle.net
- `GET  /api/auth/bnet/callback` : échange du code, fetch des personnages WoW, stockage NeDB
- `POST /api/auth/bnet/disconnect` : déconnexion BNet + suppression des personnages en DB
- Page Profil : bouton CONNECTER / DÉCONNECTER Battle.net
- `docs/BNET_API_GUIDE.md` : guide de configuration des credentials Battle.net

#### Données réelles BNet
- `GET /api/characters` : retourne les `BnetCharacter` depuis NeDB (filtrés `level === 90`)
- `POST /api/characters/[id]/enrich` : enrichissement lazy — ilvl, spec, guilde, titre, avatar, équipement, or
- Icônes d'items via BNet item media API (fetch en parallèle)
- Auto-enrich si `slotsLeft.length === 0` au chargement de la page

#### Favoris
- `PUT /api/profile/favorites` : persiste `favoriteCharId` + `subFavoriteCharIds`
- Tri `/api/characters` : favori → sous-favoris → alphabétique
- `CharacterCard` : boutons ★ / ☆, bordures colorées

#### Layout
- Homepage 4 colonnes : `1fr 160px 160px 1fr`
- Page Profil : 3 sections — ★ Principal · ☆ Sous-favoris · Personnages

### Modifié

- `Character.id` : `number` → `string` (`${name.toLowerCase()}-${realmSlug}`)
- `BnetCharacter` : champs enrichis optionnels
- `CharAvatar` : image réelle si `avatarUrl`, SVG fallback sinon
- `ItemSlot` : image réelle si `iconUrl`, fallback initiales

### Supprimé

- Lien COLLECTIONS retiré du Header

---

## [0.1.1] — 2026-05-06

### Modifié

- Remplacement de `next lint` (ESLint) par **Biome** pour le linting
- Ajout des scripts `lint` (`biome lint .`) et `lint:fix` (`biome lint --write --unsafe .`)
- Suppression de `postcss.config.mjs` — config PostCSS déplacée dans `package.json`
- Suppression de `autoprefixer` (inutile avec Tailwind v4 + Lightning CSS)
- Déplacement de `@tailwindcss/postcss` de `dependencies` vers `devDependencies`
- Mise à jour : `zustand` 5.0.13
- Version bump : 0.1.0 → 0.1.1

---

## [0.1.0] — 2026-04-30

Première version fonctionnelle (V1) — données mockées, auth locale.

### Ajouté

#### Authentification
- Inscription email / pseudo / mot de passe avec hash bcrypt
- Connexion avec session JWT signée HS256 (cookie `httpOnly`, `sameSite: lax`)
- Déconnexion (clear cookie)
- Store utilisateurs en mémoire (`Map` JS)

#### Dashboard principal (`/`)
- Layout 3 colonnes : slots gauche · portrait central · slots droite
- Composants : `ItemSlot`, `CharAvatar`, `CharacterDropdown`, `StatChip`, `ObtainableItem`
- Detail Panel `position: fixed` avec animation `slideInR`
- Panel inférieur avec onglets par slot

#### Pages
- `/auth` : onglets CONNEXION / INSCRIPTION
- `/metiers` : Coming Soon

#### API
- `POST /api/auth/register` / `login` / `logout`
- `GET  /api/characters` / `GET /api/characters/:id`
- `GET  /api/items/:id/sources` / `GET /api/items/slot/:slot`

#### Données mockées
- 3 personnages : Kratós (Paladin), Aelindra (Mage), Thorvak (Chasseur)
- Items obtenables par slot avec sources complètes
