# Design — Branchement composants WoW à données réelles

**Date:** 2026-05-19  
**Branch:** aoz/bnet-connexion-and-api-link

## Contexte

L'OAuth BattleNet est connecté. Les `BnetCharacter` sont stockés en DB avec données basiques (name, realm, class, race, level, faction). Les composants affichent encore des données mock. Ce spec couvre le branchement aux données réelles.

## Objectifs

1. Image du personnage dans dropdown + section centrale
2. Icônes d'équipement via Item Media API
3. Dropdown filtre sur level 90 uniquement
4. Toutes variables statiques rendues dynamiques (ilvl, spec, guilde, gold, slots équipement)

## Architecture

### Stratégie d'enrichissement

**Lazy + cache DB.** Les données enrichies sont absentes au premier load. Le client détecte les personnages sans `enrichedAt` et appelle `POST /api/characters/[id]/enrich`. Les données sont stockées en DB. Bouton Refresh sur CharacterCard pour forcer une mise à jour.

### ID des personnages

`Character.id` passe de `number` à `string`. ID stable = `${name.toLowerCase()}-${realmSlug}`. Toutes les références (store, composants, pages) sont mises à jour.

## Types (`lib/types.ts`)

### BnetCharacter — champs enrichis optionnels

```ts
avatarUrl?: string
mainRawUrl?: string  
ilvl?: number
spec?: string
specId?: number
title?: string
guildName?: string
gold?: number
slotsLeft?: EquippedItem[]
slotsRight?: EquippedItem[]
enrichedAt?: string
```

### EquippedItem — icône optionnelle

```ts
iconUrl?: string
```

### Character.id

`id: string` (était `number`)

## Endpoints BNet appelés lors de l'enrichissement

| Endpoint | Données extraites |
|----------|-------------------|
| `GET /profile/wow/character/{realm}/{name}` | ilvl, spec, guilde, titre |
| `GET /profile/wow/character/{realm}/{name}/character-media` | avatarUrl, mainRawUrl |
| `GET /profile/wow/character/{realm}/{name}/equipment` | slots équipement (nom, ilvl, enchant, qualité, itemId) |
| `GET /profile/wow/character/{realm}/{name}/currencies` | gold (currency ID 1, quantité en cuivre ÷ 10000) |
| `GET /data/wow/media/item/{itemId}?namespace=static-eu` | iconUrl par slot équipé |

Token utilisé: `user.bnetAccessToken` (déjà stocké en DB).

## API Routes

### `GET /api/characters`

- Retourne BnetCharacters depuis DB filtrés `level === 90`
- Map vers `Character` avec defaults pour champs manquants (`slotsLeft: []`, `slotsRight: []`, `ilvl: 0`, etc.)

### `POST /api/characters/[id]/enrich`

- `[id]` = `name-realmSlug`
- Auth requise (readSession)
- Récupère `bnetAccessToken` de usersDb
- Appels BNet séquentiels: summary → media → equipment → currencies
- Pour chaque équipement: fetch item media pour iconUrl
- Organise slots en left (head, neck, shoulders, back, chest, wrist, tabard, hands) et right (belt, legs, boots, ring1, ring2, trinket1, trinket2, mainhand, offhand)
- Sauvegarde dans charactersDb (upsert par `name + realmSlug + userId`)
- Retourne le `Character` enrichi

## Composants modifiés

### `CharAvatar`

- Nouvelle prop `avatarUrl?: string`
- Si `avatarUrl` présent: `<img>` avec `object-fit: cover`, borderRadius, fallback `onError` vers SVG
- Sinon: SVG gradient existant (inchangé)

### `CharacterDropdown`

- Props: `selectedId: string | null`, `onSelect: (id: string) => void`
- Avatar 28×28 circulaire si `avatarUrl` présent, sinon point faction actuel
- Affiche `char.spec` si disponible dans le dropdown

### `CharacterBar`

- Props: `selectedId: string | null`, `onSelect: (id: string) => void`
- Inchangé fonctionnellement

### `CharacterCard` (profil)

- Affiche `ilvl` si `char.ilvl` disponible
- Bouton "Rafraîchir" → `POST /api/characters/[id]/enrich` → re-fetch profil
- État loading pendant enrichissement

### `ItemSlot`

- Si `slot.iconUrl` présent: `<img src={slot.iconUrl}>` dans le carré 32×32
- Sinon: initiales actuelles (fallback inchangé)

### `CharacterStore`

- `selectedCharId: string | null`

## Page principale (`app/page.tsx`)

- IDs string partout
- Après load characters: si `!char.enrichedAt` pour le char sélectionné → POST enrich auto → re-fetch characters
- Passe `avatarUrl` à `CharAvatar`

## Mapping slots BNet → EquipmentSlot

```
HEAD → head (left)
NECK → neck (left)
SHOULDER → shoulders (left)
BACK → back (left)
CHEST → chest (left)
WRIST → wrist (left)
TABARD → tabard (left)
HANDS → hands (left)
WAIST → belt (right)
LEGS → legs (right)
FEET → boots (right)
FINGER_1 → ring1 (right)
FINGER_2 → ring2 (right)
TRINKET_1 → trinket1 (right)
TRINKET_2 → trinket2 (right)
MAIN_HAND → mainhand (right)
OFF_HAND → offhand (right)
```

## Mapping qualité BNet → ItemRarity

```
POOR / COMMON → "common"
UNCOMMON → "uncommon"
RARE → "rare"
EPIC → "epic"
LEGENDARY → "legendary"
```

## Labels slots (fr)

```ts
const SLOT_LABELS: Record<string, string> = {
  head: "Tête", neck: "Cou", shoulders: "Épaules", back: "Dos",
  chest: "Torse", wrist: "Poignets", tabard: "Tabard", hands: "Mains",
  belt: "Ceinture", legs: "Jambes", boots: "Bottes",
  ring1: "Anneau 1", ring2: "Anneau 2",
  trinket1: "Breloque 1", trinket2: "Breloque 2",
  mainhand: "Main droite", offhand: "Main gauche"
}
```

## Gestion d'erreurs

- Token expiré: retour 401 avec `error: "token_expired"`
- Char introuvable BNet: 404
- Echec item media: `iconUrl` omis (pas bloquant)
- Echec currencies: `gold` omis (pas bloquant)

## Fichiers créés / modifiés

| Fichier | Action |
|---------|--------|
| `lib/types.ts` | Modifier |
| `store/character-store.ts` | Modifier |
| `components/character/CharAvatar.tsx` | Modifier |
| `components/character/CharacterDropdown.tsx` | Modifier |
| `components/layout/CharacterBar.tsx` | Modifier |
| `components/profile/CharacterCard.tsx` | Modifier |
| `components/equipment/ItemSlot.tsx` | Modifier |
| `app/api/characters/route.ts` | Modifier |
| `app/api/characters/[id]/route.ts` | Modifier |
| `app/api/characters/[id]/enrich/route.ts` | Créer |
| `app/page.tsx` | Modifier |
