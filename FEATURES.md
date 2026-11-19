# À faire

Liste des sujets mis de côté. Relevé du 2026-11-16, après la refonte d'après maquettes.

## Panneau « Détails » d'un item

### Sources d'obtention toujours vides

Le panneau affiche « Aucune source disponible » pour tous les items essayés sur un vrai personnage (ids 250060, 268291, 263919, 249346, 250063). `GET /api/items/:id/sources` renvoie `"sources": []` à chaque fois.

- Les sources viennent uniquement de `fetchWowheadSources` (`lib/services/itemService.ts`), qui renvoie `[]` en silence sur tout échec de requête ou d'analyse. On ne peut donc pas distinguer « WowHead bloque ou a changé de format » de « cet item n'a pas de source ».
- À faire : journaliser le statut et l'échec d'analyse côté serveur, vérifier la réponse réelle de WowHead, puis corriger ou changer de source de données.
- Défaut antérieur à la refonte.

### Statistiques d'item non mises à l'échelle

Les statistiques affichées ressemblent aux valeurs de base de l'item, pas à celles de son niveau d'objet : une tête de niveau 276 affiche « 9 Intelligence, 14 Endurance ».

- Exemple brut : `/api/items/250060/sources` → `"stats": ["9 Intelligence", "14 Endurance", "12 Hâte", "6 Maîtrise"]`.
- Les libellés diffèrent aussi entre le panneau (« Score de crit. ») et la fiche (« Critique »).
- À faire : utiliser les statistiques de l'item équipé (réponse `/equipment` de Blizzard, qui tient compte du niveau d'objet) plutôt que celles de l'item générique.
- Défaut antérieur à la refonte.

## Contraste du texte discret

`--text-muted` (`#6b6252`) donne environ 3,2:1 sur `--bg` et 3,1:1 sur `--surface`, sous le seuil de 4,5:1 recommandé pour du petit texte. Il sert au niveau d'objet des emplacements (11,5 px), à « Dernière connexion », à « Bientôt disponible », aux onglets inactifs et aux en-têtes de tableau.

- Même sujet pour `--gold-dark` (`#5a4a2c`) en bordure de case à cocher : environ 2,3:1, sous les 3:1 demandés pour le contour d'un contrôle.
- Les deux couleurs viennent de la maquette : c'est une décision de design.

## Bouton de déconnexion

La route `POST /api/auth/logout` existe, mais aucun écran ne propose de se déconnecter du compte. Le seul bouton « Déconnecter » est celui de Battle.net sur `/profil`.

## Header dans un layout serveur

Le header vit dans chaque page et appelle `/api/profile` à chaque montage (une lecture utilisateur et une lecture des personnages) pour n'afficher que l'initiale de l'avatar, alors que le pseudo est déjà dans le JWT de session.

- Proposition : un groupe de routes `app/(site)/layout.tsx`, composant serveur, qui lit la session (`readSession()`, sans base de données) et rend `<Header initial=… />` ; l'onglet actif viendrait de `usePathname()`.
- Effet : plus aucune requête pour le header, plus d'état « session inconnue », et les appels `<Header>` disparaissent des pages.

## Nettoyage des anciens jetons Battle.net

Le jeton OAuth de l'utilisateur n'est plus stocké. Pour effacer ceux déjà en base, la liaison (`app/api/auth/bnet/callback/route.ts`) et la déconnexion (`app/api/auth/bnet/disconnect/route.ts`) font un `$unset` de `bnetAccessToken` avec `{ strict: false }`, le champ ayant quitté le schéma.

- C'est du code permanent pour un besoin ponctuel : ces jetons expirent au bout de 24 h et sont donc déjà inutilisables.
- Alternative : passer une fois `updateMany({}, { $unset: { bnetAccessToken: '' } })` sur la collection des utilisateurs, puis retirer le `$unset`, le `strict: false` et les deux assertions de `tests/bnet-callback.test.ts`.
