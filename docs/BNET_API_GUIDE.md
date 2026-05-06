# Guide — Obtenir une clé API BattleNet (WoW)

## 1. Créer un compte développeur Blizzard

1. Aller sur [https://develop.battle.net](https://develop.battle.net)
2. Se connecter avec un compte Battle.net existant (ou en créer un)

---

## 2. Créer un client OAuth

1. Cliquer sur **"CREATE CLIENT"** (en haut à droite)
2. Remplir le formulaire :
   - **Client Name** : `azero-dev` (ou le nom souhaité)
   - **Redirect URIs** : `http://localhost:3000/api/auth/bnet/callback`
   - **Service URL** : `http://localhost:3000` (optionnel en dev)
   - **Intended Use** : `Game Tools`
3. Cocher les **Terms of Service**
4. Cliquer **"SAVE"**

> En production, ajouter aussi l'URL de prod dans Redirect URIs, par exemple `https://monapp.com/api/auth/bnet/callback`.

---

## 3. Récupérer les credentials

Après création, la page affiche :
- **Client ID** → copier dans `BNET_CLIENT_ID`
- **Client Secret** → cliquer "SHOW SECRET" → copier dans `BNET_CLIENT_SECRET`

---

## 4. Configurer le projet

Dans `.env.local` (à la racine du projet) :

```env
BNET_CLIENT_ID=votre_client_id_ici
BNET_CLIENT_SECRET=votre_client_secret_ici
BNET_REDIRECT_URI=http://localhost:3000/api/auth/bnet/callback
```

> ⚠️ Ne jamais committer `.env.local`. Il est déjà dans `.gitignore`.

---

## 5. Scopes utilisés

| Scope | Usage |
|-------|-------|
| `wow.profile` | Accès aux personnages WoW du compte connecté |

---

## 6. Endpoints API utilisés dans ce projet

| Endpoint | Description |
|----------|-------------|
| `https://oauth.battle.net/authorize` | Redirection vers le consentement OAuth |
| `https://oauth.battle.net/token` | Échange du code d'autorisation contre un access token |
| `https://eu.api.blizzard.com/profile/user/wow` | Liste des personnages WoW (région EU) |

---

## 7. Tester la connexion

1. Lancer `npm run dev`
2. Se connecter sur l'app (`/auth`)
3. Aller sur `/profil`
4. Cliquer **"CONNECTER BATTLE.NET"**
5. Autoriser l'accès sur la page Battle.net
6. Être redirigé vers `/profil` avec les personnages affichés

---

## 8. Changer de région

Ce projet est configuré pour la région **EU uniquement**.  
Pour supporter d'autres régions, remplacer `eu.api.blizzard.com` par :
- `us.api.blizzard.com` (Amériques)
- `kr.api.blizzard.com` (Corée)
- `tw.api.blizzard.com` (Taïwan)

Et adapter `namespace=profile-eu` → `profile-us`, `profile-kr`, `profile-tw`.

---

## 9. Erreurs courantes

| Erreur | Cause | Fix |
|--------|-------|-----|
| `?error=bnet_denied` | Utilisateur a refusé l'autorisation | Normal, aucune action requise |
| `?error=token_failed` | Client ID/Secret incorrect ou Redirect URI non enregistrée | Vérifier les valeurs dans `.env.local` et sur develop.battle.net |
| `?error=chars_failed` | Access token invalide ou scope manquant | Vérifier que `wow.profile` est bien dans les scopes demandés |
| 401 sur l'API Blizzard | Token expiré | Se déconnecter et se reconnecter Battle.net |
| `?error=bnet_invalid_state` | Paramètre de sécurité CSRF invalide | Réessayer la connexion depuis le début |
| `?error=bnet_not_configured` | Variables d'environnement manquantes | Vérifier BNET_CLIENT_ID, BNET_CLIENT_SECRET, BNET_REDIRECT_URI dans .env.local |
