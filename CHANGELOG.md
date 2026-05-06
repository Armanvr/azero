# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [0.1.1] — 2026-05-06

### Modifié

- Remplacement de `next lint` (ESLint) par **Biome** pour le linting
- Ajout des scripts `lint` (`biome lint .`) et `lint:fix` (`biome lint --write --unsafe .`)
- Ajout du script `format` (`biome format --write .`)
- Suppression des scripts `biome:*` redondants
- Suppression de `postcss.config.mjs` — config PostCSS déplacée dans `package.json` (section `"postcss"`)
- Suppression de `autoprefixer` (inutile avec Tailwind v4 + Lightning CSS)
- Déplacement de `@tailwindcss/postcss` de `dependencies` vers `devDependencies`
- Mise à jour : `zustand` 5.0.13
- Suppression de `postcss`
- Version bump : 0.1.0 → 0.1.1

---

## [0.1.0] — 2026-04-30

Première version fonctionnelle (V1) — données mockées, auth locale.

### Ajouté

#### Authentification
- Inscription email / pseudo / mot de passe avec hash bcrypt
- Connexion avec session JWT signée HS256 (cookie `httpOnly`, `sameSite: lax`)
- Déconnexion (clear cookie)
- Garde de routes via `middleware.ts` : toute page hors `/auth` redirige vers l'auth si non connecté
- Store utilisateurs en mémoire (`Map` JS) — volontairement éphémère en V1

#### Dashboard principal (`/`)
- Layout 3 colonnes : 8 slots équipés gauche · portrait central (240 px) · 8 slots équipés droite
- Composant `ItemSlot` : icône colorée par rareté, nom Rajdhani, iLvl + enchant (prefix ✦), état actif avec border colorée
- Composant `CharAvatar` : avatar SVG placeholder (initiales + dégradé radial par couleur de classe)
- Composant `CharacterDropdown` : sélecteur de personnage coloré par classe, liste déroulante avec iLvl, fermeture au clic extérieur
- Composant `StatChip` : chips Or / iLvl moyen / Score M+
- Panel inférieur (240 px, hauteur fixe) avec onglets par slot (TÊTE / ÉPAULES / TORSE / JAMBES…)
- Grille d'items obtenables `auto-fill minmax(220px, 1fr)` avec animations `fadeIn` staggerées (0.04 s par item)
- `ObtainableItem` : icône iLvl, nom uppercase Rajdhani, dot rareté, badge SET, compteur joueurs
- Detail Panel `position: fixed` (largeur 320 px) avec animation `slideInR` (translateX 24 px → 0, 0.22 s)
- Detail Panel : header item, badges iLvl/rareté/enchant, liste de stats, sources d'obtention, footer hint
- `SourceCard` : nom du boss, instance, badge difficulté coloré, plage iLvl, drop rate
- `DiffBadge` : badge coloré par difficulté (LFR vert · Normal bleu · Héroïque violet · Mythique/M+ or · Craft rouge · Réputation gris)
- `RarityDot` : point coloré par rareté

#### Pages
- `/auth` : onglets CONNEXION / INSCRIPTION (SegmentTabs), validation temps réel confirmation mot de passe, état loading, redirect automatique après succès, décoration blob gold + purple en `blur(80px)`
- `/metiers` : page Coming Soon avec icône ⚒️ et anneau dashed animé (spin 12 s)

#### API (Next.js Route Handlers)
- `POST /api/auth/register` — création de compte + émission session
- `POST /api/auth/login` — vérification bcrypt + émission session
- `POST /api/auth/logout` — suppression du cookie de session
- `GET  /api/characters` — liste des personnages du compte connecté
- `GET  /api/characters/:id` — détail d'un personnage (équipement inclus)
- `GET  /api/items/:id/sources` — sources d'obtention d'un item
- `GET  /api/items/slot/:slot` — items obtenables pour un slot donné

#### Infrastructure & tooling
- Next.js App Router avec TypeScript strict
- Tailwind CSS v4 + tokens CSS custom (`--bg`, `--surface`, `--gold`, etc.)
- Zustand (`character-store`) : personnage sélectionné, catégorie active, item actif dans le Detail Panel
- Biome (lint + format) en remplacement d'ESLint / Prettier
- Polices Google Fonts : Rajdhani (700, 600) + Exo 2 (400–700)
- `.env.local.example` avec `AZERO_SESSION_SECRET`
- `SETUP.md` : documentation d'installation et de configuration

#### Données mockées
- 3 personnages : Kratós (Paladin), Aelindra (Mage), Thorvak (Chasseur)
- Équipement complet (16 slots) par personnage avec raretés et enchantements
- Items obtenables par slot avec sources (boss, instance, difficulté, iLvl, drop rate)

---

## À venir — V2

- Intégration API Blizzard (Battle.net OAuth, Game Data API, Profile API)
- Page Métiers : progression par personnage
- Persistance DB : Prisma + PostgreSQL (ou Supabase) — remplacement du store in-memory
- Migration auth vers NextAuth.js (provider Battle.net)
- Remplacement des emojis décoratifs par des icônes SVG (Lucide / Heroicons)
