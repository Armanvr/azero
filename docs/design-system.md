# Design System AZERO

## Philosophie

AZERO est un dashboard armory pour World of Warcraft avec une esthétique cyberpunk sombre et élégante. Le design system privilégie la lisibilité, la hiérarchie visuelle claire et une expérience gaming premium.

## Typographie

### Échelle de tailles

**Taille de base : 16px** — Toujours utiliser cette taille pour le texte principal standard (paragraphes, descriptions, contenu).

| Classe Tailwind | Taille | Usage | Exemple |
|---|---|---|---|
| `text-xs` | 10px | Labels, métadonnées, timestamps | "ÉQUIPEMENT", dates |
| `text-sm` | 12px | Texte secondaire, sous-informations | Nom de serveur, stats secondaires |
| `text-base` | **16px** | **Texte principal (défaut)** | Descriptions, contenu standard |
| `text-md` | 18px | Sous-titres, informations importantes | Nom de personnage secondaire |
| `text-lg` | 20px | Titres de sections | Nom de personnage principal |
| `text-xl` | 24px | Grands titres | Titres de pages |
| `text-2xl` | 32px | Hero titres | Logo, page d'accueil |

### Familles de polices

```tsx
font-exo      // "'Exo 2', sans-serif" — Texte principal, UI
font-rajdhani // "Rajdhani, sans-serif" — Titres, labels, emphase
```

**Règle :** `font-exo` par défaut, `font-rajdhani` pour les titres, labels en majuscules et éléments gaming/tech.

## Couleurs

### Palette principale

```tsx
// Backgrounds
bg-bg         // #0c0c10 — Fond principal
bg-surface    // #13131a — Cartes, panels niveau 1
bg-surface2   // #1a1a24 — Cartes, panels niveau 2
bg-surface3   // #22222f — Cartes, panels niveau 3 / états hover

// Bordures
border-border   // #2a2a3a — Bordures subtiles
border-border2  // #363650 — Bordures visibles, séparateurs

// Texte
text-text       // #e2e2f0 — Texte principal (haute lisibilité)
text-text-dim   // #8888aa — Texte secondaire
text-text-muted // #55556a — Texte tertiaire, désactivé

// Accent principal (or)
bg-gold           // #c9960c — Boutons, fond accent
text-gold-light   // #f0b429 — Texte accent, hover
bg-gold-dim       // rgba(201,150,12,0.15) — Fond accent subtil

// Accents secondaires
text-purple / bg-purple-dim  // Mythique, M+
text-blue                    // Info, liens
text-green                   // Succès, positif
text-red                     // Erreur, négatif
```

### Hiérarchie d'élévation

```
bg → surface → surface2 → surface3
```

Chaque niveau représente une élévation visuelle (z-index conceptuel). Utiliser `surface` pour les cards de premier plan, `surface2` pour les inputs/dropdowns, `surface3` pour les états hover/actifs.

## Espacement

### Grille de base : 4px

Utiliser des multiples de 4px pour maintenir la cohérence :

```tsx
gap-1    // 4px  — Espacement minimal (entre icon et texte)
gap-2    // 8px  — Espacement standard interne
gap-3    // 12px — Espacement entre sections légères
gap-4    // 16px — Espacement entre sections
gap-6    // 24px — Espacement entre blocs majeurs
gap-8    // 32px — Espacement entre zones distinctes
```

**Padding standard des composants :**
- Boutons : `px-4 py-3` (16px × 12px)
- Cards : `p-4` ou `p-6` (16px ou 24px)
- Inputs : `px-3 py-2.5` (12px × 10px)

## Composants

### Boutons

```tsx
// Primary (gold)
<Button>Action</Button>
// className: bg-gold text-[#0c0c10] font-bold

// States: disabled → bg-surface3 text-text-dim cursor-not-allowed
```

### Inputs

```tsx
<Input label="EMAIL" placeholder="votre@email.com" />
// Base: bg-surface2 border-border2
// Focus: focus:border-gold
// Text: text-base (16px)
```

### Tags / Badges

```tsx
<Tag variant="gold" size="md">Epic</Tag>
// Taille md: text-sm (12px)
// Taille sm: text-xs (10px)
```

### Cartes

```tsx
<div className="bg-surface border border-border rounded-lg p-6">
  {/* Contenu */}
</div>
```

## Principes d'interaction

### Transitions

Toutes les interactions utilisent `transition-all duration-150` sauf :
- Animations d'entrée : `duration-200` à `duration-300`
- Rotations lentes : `duration-[12s]` (decoratif)

### États hover

```tsx
hover:bg-surface3      // Cartes cliquables
hover:border-border2   // Boutons outline
hover:text-gold-light  // Liens, texte interactif
```

### États actifs

```tsx
// Background + border colorée
bg-surface3 border-gold
```

## Animation

### Animations globales (définies dans globals.css)

```css
animation-[fadeIn_0.3s_ease]      // Apparition de contenu
animation-[slideInR_0.22s_ease]   // Slide depuis la droite (panels)
animation-[spin_12s_linear_infinite] // Rotation décorative lente
```

## Règles strictes

1. **Toujours utiliser `text-base` (16px) pour le texte standard.** Ne descendre à `text-sm` ou `text-xs` que pour les métadonnées/labels.

2. **Ne jamais utiliser de valeurs arbitraires pour les tailles de texte** sauf si absolument nécessaire. Privilégier l'échelle définie (`text-xs`, `text-sm`, `text-base`, etc.).

3. **Respecter la hiérarchie d'élévation** : `bg` < `surface` < `surface2` < `surface3`.

4. **Utiliser `font-rajdhani` uniquement pour** : titres, labels en majuscules, stats gaming, badges.

5. **Toujours tester la lisibilité** sur fond sombre avant de valider une taille de texte.

## Exemples de composition

### Card de personnage

```tsx
<div className="bg-surface border border-border rounded-lg p-6">
  <h2 className="text-lg font-rajdhani font-bold text-gold-light mb-2">
    {character.name}
  </h2>
  <p className="text-base text-text-dim">
    {character.race} {character.class}
  </p>
  <div className="flex gap-3 mt-4">
    <Tag variant="gold" size="md">iLvl {character.ilvl}</Tag>
    <Tag variant="purple" size="md">M+ {character.score}</Tag>
  </div>
</div>
```

### Section avec header

```tsx
<section>
  <h3 className="text-xs text-text-muted tracking-wider uppercase mb-3">
    ÉQUIPEMENT
  </h3>
  <div className="space-y-2">
    {items.map(item => (
      <ItemSlot key={item.id} {...item} />
    ))}
  </div>
</section>
```
