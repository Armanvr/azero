# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [0.4.0] — 2026-11-20

### Ajouté

#### Gestionnaire de métiers
- `/metiers` : métiers principaux et secondaires (Cuisine, Pêche, Archéologie) de chaque personnage, en colonnes distinctes, avec icône, extension, niveau et barre ; filtres par personnage, métier et extension
- Recherche globale d'une recette parmi les recettes connues de tous les personnages (Cuisine incluse), insensible à la casse et aux accents, avec lien direct vers la fiche
- Nouvelle page `/metiers/[charId]/[professionId]` : niveau par extension, recettes apprises / manquantes par rapport au catalogue Blizzard, barre de pourcentage, catalogue par catégorie, filtres Toutes / Apprises / Manquantes, recherche, tri par nom ou statut
- Fiche recette : statut (Apprise, Non apprise, Inconnu), objets fabriqués, composants et quantités, description ; un champ absent est indiqué « Non fourni par Blizzard »
- Pêche : progression par extension uniquement ; Archéologie : niveau global uniquement (Blizzard ne fournit ni découvertes ni projets) ; le Secourisme n'est jamais affiché

#### Données Battle.net
- `GET /api/professions/[professionId]/tiers/[tierId]` : catalogue de recettes d'une extension
- `GET /api/professions/recipes/[id]` : détail d'une recette, limité aux champs fournis par Blizzard
- `GET /api/professions/recipes/[id]/icon` : redirection vers l'icône, pour le chargement paresseux des listes
- `lib/services/professionService.ts` et collection `BnetCache` : données statiques Blizzard en cache 7 jours, un échec n'est jamais mis en cache
- `lib/professions.ts` : recherche, statut et statistiques de recettes, sans dépendance à React

#### Tests
- 176 tests (42 de plus) : routes métiers, catalogue, recette, icône et logique de recettes

### Modifié

- `GET /api/professions` : renvoie pour chaque personnage `professionsKnown` et l'arbre complet des métiers (extensions, recettes connues), avec les noms français du catalogue ; cache déplacé vers `professionData` / `professionDataFetchedAt`
- Extension déduite du nom du palier (« Forge de Midnight » → Midnight), Blizzard ne fournissant pas ce champ
- Métiers : un personnage pour lequel Blizzard n'a jamais répondu reste affiché avec un avertissement, et aucune de ses recettes n'est comptée comme manquante

### Supprimé

- `/metiers` : bandeau de synthèse par métier et blocs « Bientôt disponible » (Craftables, Cooldowns)

---

## [0.3.0] — 2026-11-16

### Ajouté

#### Refonte de l'interface d'après maquettes
- Nouveau système visuel : palette or / parchemin sombre, polices **Cinzel** (titres) et **Figtree** (texte), tokens dans `app/globals.css`
- Header commun : logo, navigation Personnages / Compte / Planning, recherche `Nom-Royaume` (raccourci `/`), avatar
- Fiche personnage `/personnage/[realm]/[name]` : colonne d'identité (niveau, guilde, score d'équipement, statistiques, dernière connexion), emplacements autour du rendu en pied, barre de sélection avec lien « Détails → » vers le panneau d'item
- Page **Métiers du compte** `/metiers` : synthèse par métier et tableau par personnage, données réelles
- Page de connexion en deux colonnes : bouton Afficher / Masquer, « Se souvenir de moi »
- Nouvelle page **Tableau hebdomadaire** `/planning` (protégée) : semaine et compte à rebours du reset réels, le reste en données de démonstration (`app/planning/mock-data.ts`)
- Accueil « Personnages » : recherche + liste des personnages du compte une fois connecté
- Blocs sans donnée réelle affichés en « Bientôt disponible » (onglets Talents, Hauts faits, Collection, Craftables, Cooldowns)
- Mises en page étroites jusqu'à 360 px sur toutes les pages

#### Mot de passe oublié sans email
- Code de récupération `XXXX-XXXX-XXXX-XXXX` affiché une seule fois à l'inscription, stocké haché
- `POST /api/auth/reset` : email + code → nouveau mot de passe, nouvelle session et nouveau code
- `POST /api/profile/recovery-code` : (re)génération depuis `/profil` avec le mot de passe
- Composant `components/ui/RecoveryCode` partagé entre `/auth` et `/profil`

#### Données Battle.net
- Fiche publique : niveau, rendu en pied, dernière connexion et statistiques (principale, Endurance, Hâte, Critique, Maîtrise, Polyvalence)
- `GET /api/professions` : métiers principaux des personnages du compte, cache 1h sur le document `Character`
- `lib/services/realm.ts` : résolution du royaume saisi (slug, nom affiché, accents, cyrillique) via l'index des royaumes Blizzard, cache mémoire 24h
- `lib/characterPath.ts` : construction unique des liens vers une fiche et de l'URL d'API
- `lib/services/character.ts` : mapping personnage + équipement partagé par les routes
- Cache négatif : un personnage introuvable est mémorisé 5 min

#### Tests
- Suite `node:test` dans `tests/` (134 tests, sans base ni réseau) et script `npm test`

### Modifié

- **Tailwind supprimé** : styles inline migrés vers des CSS Modules par composant
- Polices hébergées avec le site via `next/font` (plus d'appel à Google à l'exécution)
- `GET /api/characters/public/:realm/:name` : 404 uniquement si Blizzard répond 404, 502 en cas d'erreur Battle.net, 503 sans token ; les appels optionnels (rendu, équipement, statistiques, icônes) dégradent au lieu de faire échouer la page
- `lib/services/bnetToken.ts` : appels avec statut, timeout de 8 s, relance unique sur token rejeté, logs serveur `bnet <statut> <chemin>`
- `POST /api/characters/:id/enrich` : token client credentials, statuts 404 / 502 / 503, n'écrit rien en cas d'échec
- Métiers : en cas d'échec Blizzard, les métiers déjà connus restent affichés
- Session : logique JWT partagée dans `lib/session.ts` ; `AZERO_SESSION_SECRET` obligatoire en production
- Routes d'authentification : message générique pour les erreurs imprévues, 400 sur un corps invalide
- `PUT /api/profile/favorites` : validation des entrées
- Couleurs de classe : une seule table (palette officielle, par id de classe) dans `lib/constants.ts`
- Liaison Battle.net : le token utilisateur n'est plus stocké
- `ItemCache` : un item n'est mis en cache que si Blizzard a répondu
- Profil : état d'erreur avec « Réessayer », favoris mis à jour seulement après enregistrement réussi, carte de personnage accessible au clavier
- Dépendances mises à jour (Next 16.4, React 19.3, TypeScript 7, Biome 2.6, Mongoose 9.12) ; `tsconfig.json` et `biome.json` adaptés

### Corrigé

- Recherche d'un personnage au nom ou au royaume accentué : double encodage de l'URL d'API → 404
- Royaumes saisis avec accents, apostrophes, espaces ou parenthèses (« Arak-arahm », « Aggra (Português) », « Kael'thas »)
- Erreurs Battle.net affichées comme « Personnage introuvable »
- Enrichissement avec un token expiré : écrasement des données du personnage par des valeurs vides
- `itemId` perdu à l'enregistrement des personnages (champ absent du schéma)
- Regex construite depuis l'identifiant de personnage sans échappement
- Balisage Blizzard (`|A:…|a`) affiché dans les enchantements
- Animations cassées par le renommage des `@keyframes` dans les CSS Modules

### Supprimé

- `tailwindcss`, `tailwind.config.ts`
- `zustand` et `store/character-store.ts`
- Composants `CharacterBar`, `CharacterDropdown`, `ObtainableItem`, `StatChip`, `RarityDot`, `SegmentTabs` ; dropdown Personnages du header
- Routes `GET /api/characters/[id]` et `GET /api/items/slot/[slot]`
- `SETUP.md`, documents de conception NeDB (`docs/superpowers/…-bnet-profile-nedb*`), entrée `data/` du `.gitignore`

Sujets mis de côté : voir `FEATURES.md`.

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
