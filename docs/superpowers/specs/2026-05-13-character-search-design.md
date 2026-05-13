# Character Search — Design Spec

**Date:** 2026-05-13  
**Statut:** Approuvé  
**Scope:** Recherche de personnage WoW via l'API Blizzard avec page de profil partageable

---

## Contexte

Azero est un dashboard Armory pour World of Warcraft. En V1, les données sont mockées (3 personnages factices). Cette feature introduit la recherche de personnage en temps réel via l'API Blizzard et crée des pages de profil à URL partageable.

---

## Objectif

Permettre à tout visiteur (authentifié ou non) de rechercher un personnage WoW par région/royaume/nom, et d'afficher sa fiche complète (profil + équipement) via les composants existants du dashboard.

---

## Architecture

### Nouvelles routes

| Route | Type | Accès |
|---|---|---|
| `GET /` | Page → formulaire de recherche | Authentifié (inchangé) |
| `GET /character/[region]/[realm]/[name]` | Page → fiche personnage | **Public** (partageable) |
| `GET /api/blizzard/character/[region]/[realm]/[name]` | API proxy | Public |

### Nouveaux fichiers

```
app/
├── page.tsx                                          # Modifié : formulaire de recherche
├── character/
│   └── [region]/
│       └── [realm]/
│           └── [name]/
│               └── page.tsx                          # Nouveau : fiche personnage (Server Component)
└── api/
    └── blizzard/
        └── character/
            └── [region]/
                └── [realm]/
                    └── [name]/
                        └── route.ts                  # Nouveau : proxy API Blizzard

components/
└── search/
    └── CharacterSearchForm.tsx                       # Nouveau : formulaire de recherche

lib/
└── blizzard.ts                                       # Nouveau : client Blizzard API

proxy.ts                                              # Modifié : exclure /character/* de l'auth redirect
.env.local.example                                    # Modifié : ajouter BLIZZARD_CLIENT_ID / SECRET
```

---

## Blizzard API — Authentification

L'API Blizzard utilise le flux **Client Credentials** (OAuth2) pour l'accès aux données publiques de jeu. Pas besoin d'OAuth utilisateur.

### Credentials nécessaires

1. Aller sur [https://develop.battle.net/](https://develop.battle.net/) → "Create Client"
2. Callback URL : `http://localhost:3000` (ou l'URL de production)
3. Récupérer **Client ID** et **Client Secret**
4. Ajouter dans `.env.local` :
   ```env
   BLIZZARD_CLIENT_ID=your-client-id
   BLIZZARD_CLIENT_SECRET=your-client-secret
   ```

### Token endpoint

```
POST https://oauth.battle.net/token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Body: grant_type=client_credentials
```

Le token retourné est valide ~24h. Il doit être mis en cache côté serveur pour éviter un appel OAuth à chaque requête.

### Endpoints utilisés

```
GET https://{region}.api.blizzard.com/profile/wow/character/{realm-slug}/{name}
    ?namespace=profile-{region}&locale=fr_FR
    Authorization: Bearer {token}

GET https://{region}.api.blizzard.com/profile/wow/character/{realm-slug}/{name}/equipment
    ?namespace=profile-{region}&locale=fr_FR
    Authorization: Bearer {token}
```

Régions supportées : `eu`, `us`, `kr`, `tw`  
Le `realm-slug` est le royaume en minuscules, accents supprimés, espaces remplacés par des tirets (ex: `hyjal`, `conseil-des-ombres`).

---

## Mapping Blizzard → type `Character`

Le type `Character` existant (`lib/types.ts`) est réutilisé tel quel. Mapping :

| Champ `Character` | Source Blizzard |
|---|---|
| `id` | `character.id` |
| `name` | `character.name` |
| `race` | `character.race.name` |
| `class` | `character.character_class.name` (traduit en `WowClass` français) |
| `spec` | `character.active_spec.name` |
| `ilvl` | `character.average_item_level` |
| `realm` | `character.realm.name` |
| `guild` | `character.guild.name` (ou `""` si pas de guilde) |
| `faction` | `character.faction.type` → `"horde"` ou `"alliance"` |
| `color` | Lookup via `CLASS_COLORS[wowClass]` (constante extraite dans `lib/blizzard.ts`) |
| `title` | `""` (non disponible sans données supplémentaires) |
| `score` | `0` (Raider.io hors scope V1) |
| `gold` | `0` (non exposé par l'API publique) |
| `slotsLeft` | Construits depuis l'endpoint `/equipment` (7 slots gauche) |
| `slotsRight` | Construits depuis l'endpoint `/equipment` (7 slots droite) |

### Slots gauche / droite

Les slots sont distribués selon la convention existante du projet :

**Gauche (slotsLeft):** `head`, `neck`, `shoulders`, `back`, `chest`, `wrist`, `hands`  
**Droite (slotsRight):** `belt`, `legs`, `boots`, `ring1`, `ring2`, `trinket1`, `mainhand`

Chaque `EquippedItem` est construit depuis l'item Blizzard :
```ts
{
  id: slot_type,          // ex: "HEAD"
  label: slot_label,      // ex: "Tête"
  item: item_name,        // nom de l'objet
  ilvl: item_level,       // niveau d'objet
  enchant: null,          // enchantement (hors scope V1)
  rarity: quality_type    // "COMMON" → "common", "EPIC" → "epic", etc.
}
```

---

## Traduction des classes Blizzard → `WowClass` français

L'API Blizzard retourne les noms de classe en anglais (ou dans la locale demandée). Avec `locale=fr_FR`, les noms sont déjà en français mais peuvent différer légèrement du type `WowClass` défini :

```ts
const CLASS_MAP: Record<string, WowClass> = {
  'Paladin': 'Paladin',
  'Mage': 'Mage',
  'Hunter': 'Chasseur',
  'Chasseur': 'Chasseur',
  'Warrior': 'Guerrier',
  'Guerrier': 'Guerrier',
  'Priest': 'Prêtre',
  'Prêtre': 'Prêtre',
  'Warlock': 'Démoniste',
  'Démoniste': 'Démoniste',
  'Shaman': 'Chaman',
  'Chaman': 'Chaman',
  'Druid': 'Druide',
  'Druide': 'Druide',
  'Rogue': 'Voleur',
  'Voleur': 'Voleur',
  'Monk': 'Moine',
  'Moine': 'Moine',
  'Demon Hunter': 'Chasseur de démons',
  'Chasseur de démons': 'Chasseur de démons',
  'Death Knight': 'Chevalier de la mort',
  'Chevalier de la mort': 'Chevalier de la mort',
  'Evoker': 'Evocateur',
  'Évocateur': 'Evocateur',
}
```

---

## Composants

### `CharacterSearchForm` (`components/search/CharacterSearchForm.tsx`)

Composant client avec :
- Select **Région** : `EU | US | KR | TW` (défaut : `EU`)
- Input **Royaume** : texte libre (placeholder : "Hyjal")
- Input **Nom** : texte libre (placeholder : "Kratós")
- Bouton **RECHERCHER**
- `onSubmit` → `router.push('/character/{region}/{realm}/{name}')`
- Validation : les 3 champs sont requis avant soumission
- État loading sur le bouton pendant la navigation

Design : centré sur la page, `bg-surface border border-border rounded-lg p-8`, titre `AZERO` en `font-rajdhani`, sous-titre en `text-text-dim`. Suit le design system (tokens sémantiques, pas de couleurs arbitraires).

### `app/page.tsx` (modifié)

Remplace le dashboard actuel par un écran centré contenant `CharacterSearchForm`. Le Header est conservé. L'état de chargement et la logique personnages mockés sont retirés.

### `app/character/[region]/[realm]/[name]/page.tsx` (nouveau)

Server Component :
1. Appelle l'API route `/api/blizzard/character/[region]/[realm]/[name]`
2. Si erreur → affiche un message "Personnage introuvable" avec bouton retour vers `/`
3. Si succès → affiche le dashboard existant avec les données Blizzard

Utilise les composants : `Header`, `CharAvatar`, `ItemSlot`. Le `CharacterBar` n'est **pas rendu** sur cette page (un seul personnage affiché, sans sélection multi-personnage). La partie basse (items obtenables par slot, `ObtainableItem`) n'est **pas rendue** non plus — elle dépend de données mockées, hors scope V1. La page affiche uniquement le Header + le layout 3 colonnes (slots gauche / portrait central / slots droite).

### `app/api/blizzard/character/[region]/[realm]/[name]/route.ts` (nouveau)

Route Next.js `GET` :
- Appelle `lib/blizzard.ts` → `fetchCharacter(region, realm, name)`
- Retourne `{ character: Character }` ou `{ error: string }` avec le bon status HTTP
- Pas d'auth requise (données publiques)

---

## `lib/blizzard.ts` — Client API

```ts
// Cache token en mémoire (module-level, valide ~23h)
let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string>
async function fetchCharacter(region: string, realm: string, name: string): Promise<Character>
function mapToCharacter(profile: BlizzardProfile, equipment: BlizzardEquipment): Character
function slugifyRealm(realm: string): string  // espaces → tirets, minuscules, pas d'accents
```

---

## Proxy / Middleware (`proxy.ts`)

Le matcher actuel exclut déjà `/api` et `_next`. Il faut ajouter `/character` :

```ts
// Avant
matcher: ['/((?!api|_next|.*\\..*).*)']

// Après
matcher: ['/((?!api|_next|.*\\..*|character).*)']
```

Les pages `/character/*` sont ainsi accessibles sans session JWT.

---

## Gestion d'erreurs

| Cas | Comportement |
|---|---|
| Personnage introuvable (404 Blizzard) | Page d'erreur élégante + bouton retour |
| Serveur Blizzard indisponible | Message "Service temporairement indisponible" |
| Credentials Blizzard manquants | Erreur 500 avec log serveur explicite |
| Royaume invalide / mal orthographié | 404 Blizzard → même page d'erreur |

---

## Hors scope (V1)

- Score Mythic+ (nécessite Raider.io API séparée)
- Historique "Derniers personnages consultés" en localStorage (amélioration future)
- Enchantements sur les équipements
- Section items obtenables par slot sur la page personnage
- Mise en favoris d'un personnage
