# Primadija by Khadija — Boutique en ligne

Site e-commerce simple :
- **`index.html`** → page client (catalogue, panier, commande)
- **`admin.html`** → espace admin (gestion des commandes et des articles)
- **Firebase** → base de données (Firestore) + connexion admin (Auth)
- **Cloudinary** → stockage gratuit des photos (sans carte bancaire)
- **Netlify** → hébergement du site + une petite fonction serveur qui envoie l'e-mail de commande via Gmail

Ce document t'explique **toutes les étapes**, dans l'ordre, pour mettre le site en ligne. Prends ton temps, chaque étape est courte.

---

## 0) Ce qu'il te faut avant de commencer

- Un compte Google (Gmail) — tu l'as déjà sûrement.
- Un compte [Netlify](https://netlify.com) (gratuit).
- Un compte [GitHub](https://github.com) (gratuit) — nécessaire pour que la fonction d'e-mail fonctionne.

---

## 1) Créer le projet Firebase

1. Va sur [https://console.firebase.google.com](https://console.firebase.google.com)
2. Clique **"Ajouter un projet"** → donne-lui un nom (ex: `primadija`) → continue → tu peux désactiver Google Analytics (pas nécessaire) → **Créer le projet**.

### 1.1 Activer Firestore (la base de données)
1. Dans le menu de gauche : **Build > Firestore Database**
2. Clique **"Créer une base de données"**
3. Choisis **"Mode production"** → choisis une région proche (ex: `eur3 (europe-west)`) → **Activer**
4. Va dans l'onglet **"Règles"** en haut, efface tout, colle le contenu du fichier [`firestore.rules`](firestore.rules) de ce dossier, puis clique **"Publier"**.

### 1.2 Storage — non utilisé (on passe par Cloudinary)
Firebase demande maintenant une carte bancaire (plan "Blaze") pour activer Storage. Pour rester 100% gratuit sans carte, ce projet stocke les photos sur **Cloudinary** à la place (voir étape 3 ci-dessous). Tu peux donc **ignorer Firebase Storage** complètement.

### 1.3 Activer l'authentification (pour toi, l'admin)
1. Menu de gauche : **Build > Authentication** → **"Get started"**
2. Onglet **"Sign-in method"** → clique **"E-mail/Mot de passe"** → active-le → **Enregistrer**
3. Onglet **"Users"** → **"Ajouter un utilisateur"** → mets **ton e-mail** et **un mot de passe** → **Ajouter**
   → C'est avec cet e-mail/mot de passe que tu te connecteras sur `admin.html`.

### 1.4 Récupérer la config Firebase et l'ajouter au site
1. Clique sur l'icône ⚙️ (en haut à gauche) → **"Paramètres du projet"**
2. Descends jusqu'à **"Vos applications"** → clique sur l'icône **`</>`** (Web)
3. Donne un surnom (ex: `primadija-web`) → **"Enregistrer l'application"** (pas besoin de Firebase Hosting)
4. Firebase t'affiche un bloc de code `firebaseConfig = {...}` → **copie ces valeurs**
5. Ouvre le fichier [`js/firebase-config.js`](js/firebase-config.js) dans ce dossier et remplace les `"REMPLACE_MOI"` par tes vraies valeurs. Exemple :

```js
export const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "primadija.firebaseapp.com",
  projectId: "primadija",
  storageBucket: "primadija.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcd1234",
};
```

6. **Enregistre le fichier.**

---

## 2) Ajouter tes premiers articles

Une fois le site en ligne (étape 5), va sur `tonsite.netlify.app/admin.html`, connecte-toi avec l'e-mail/mot de passe créé à l'étape 1.3, onglet **"Articles"** → **"+ Ajouter un article"**. Les photos que tu as déjà préparées dans le dossier `article/` sont prêtes à être importées une par une depuis ce formulaire (nom, prix, description, catégorie optionnelle, photo).

---

## 3) Cloudinary (stockage gratuit des photos, sans carte bancaire)

1. Va sur [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free) et crée un compte gratuit (aucune carte bancaire demandée).
2. Une fois connectée, tu arrives sur le **Dashboard** → en haut tu vois **"Cloud name"** (ex: `dxyzabc12`). Note-le.
3. Clique sur l'icône ⚙️ **Settings** (en haut à droite) → onglet **"Upload"**.
4. Descends jusqu'à **"Upload presets"** → clique **"Add upload preset"**.
5. Change **"Signing Mode"** de `Signed` à **`Unsigned`** (obligatoire, sinon l'upload depuis le site ne marchera pas).
6. Tu peux renommer le preset (ex: `primadija_unsigned`) ou garder le nom généré → **Save**.
7. Ouvre le fichier [`js/cloudinary-config.js`](js/cloudinary-config.js) et remplace les 2 valeurs :

```js
export const CLOUDINARY_CLOUD_NAME = "dxyzabc12"; // ton Cloud name
export const CLOUDINARY_UPLOAD_PRESET = "primadija_unsigned"; // le nom de ton preset
```

8. Enregistre le fichier.

> Quota gratuit Cloudinary : 25 crédits/mois (~25 Go), largement suffisant pour une boutique de foulards. Aucune carte bancaire n'est jamais demandée sur le plan gratuit.

---

## 4) Gmail SMTP (pour recevoir un e-mail à chaque commande)

Gmail n'autorise plus le mot de passe normal pour l'envoi automatique — il faut un **"mot de passe d'application"** :

1. Va sur [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Active la **validation en 2 étapes** si ce n'est pas déjà fait (obligatoire pour l'étape suivante)
3. Cherche **"Mots de passe des applications"** (ou va directement sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))
4. Crée-en un nouveau (nom libre, ex: "Primadija site"), Google te donne un code à **16 caractères** (ex: `abcd efgh ijkl mnop`)
5. **Garde-le de côté** (sans espaces) — tu en auras besoin à l'étape 5 pour Netlify. Ne le mets **jamais** directement dans le code.

---

## 5) Mettre le site en ligne (GitHub + Netlify)

### 5.1 Pousser le projet sur GitHub
Dans un terminal, à la racine de ce dossier :

```bash
git init
git add .
git commit -m "Site Primadija"
```

Puis crée un nouveau repository (vide, sans README) sur [github.com/new](https://github.com/new), et suis les instructions GitHub pour "push an existing repository" (elle te donneront les 2-3 commandes exactes à copier-coller, du type `git remote add origin ...` puis `git push -u origin main`).

### 5.2 Connecter Netlify
1. Va sur [app.netlify.com](https://app.netlify.com) → **"Add new site" > "Import an existing project"**
2. Choisis **GitHub**, autorise Netlify, sélectionne ton repository
3. Netlify détecte automatiquement `netlify.toml` → laisse les réglages par défaut → **"Deploy site"**

### 5.3 Ajouter les variables d'environnement (mot de passe Gmail)
1. Sur le site Netlify → **"Site configuration" > "Environment variables"**
2. Ajoute :
   - `GMAIL_USER` = ton adresse Gmail complète (ex: `contact@gmail.com`)
   - `GMAIL_APP_PASSWORD` = le code à 16 caractères de l'étape 3 (sans espaces)
3. Va dans **"Deploys"** → **"Trigger deploy" > "Deploy site"** pour que les variables soient prises en compte.

Ton site est en ligne ! Netlify te donne une adresse du type `https://nom-au-hasard.netlify.app`. Tu peux la personnaliser dans **"Domain settings"**, ou brancher un vrai nom de domaine plus tard.

---

## 6) Utilisation au quotidien

- **Boutique client** : `https://tonsite.netlify.app/`
- **Espace admin** : `https://tonsite.netlify.app/admin` (connexion avec l'e-mail/mot de passe créés à l'étape 1.3)
  - Onglet **Commandes** : voir toutes les commandes, filtrer par statut, confirmer/annuler.
  - Onglet **Articles** : ajouter/modifier/supprimer un article, marquer "rupture de stock".
- Chaque nouvelle commande envoie automatiquement un e-mail à ton adresse Gmail avec le détail (articles, client, paiement).
- Le paiement est soit **Cash à la livraison**, soit **Virement bancaire** (le client peut indiquer une référence).

---

## 7) Structure du projet

```
index.html                        page client (boutique)
admin.html                        espace admin
css/style.css                     tout le style visuel
js/firebase-config.js             ⚠️ à remplir avec TA config Firebase
js/firebase-init.js               initialise Firebase (ne pas toucher)
js/cloudinary-config.js           ⚠️ à remplir avec TON cloud name + preset Cloudinary
js/cloudinary-upload.js           envoi des photos vers Cloudinary (ne pas toucher)
js/site-config.js                 réglages optionnels (numéro WhatsApp du bouton flottant)
js/store.js                       logique boutique (panier, commande)
js/admin.js                       logique admin (auth, commandes, articles)
netlify/functions/send-order-email.js   envoi de l'e-mail (Gmail SMTP)
netlify.toml                      config Netlify
firestore.rules                   règles de sécurité Firestore à copier-coller
storage.rules                     non utilisé (gardé si tu bascules sur Firebase Storage un jour)
assets/logo/                      logo de la marque
assets/hero/                      photo utilisée en fond de la section d'accueil
article/                          tes photos de produits (à importer via l'admin)
```

Le site est conçu **mobile-first** : boutique et espace admin (tableau de bord, gestion des commandes/articles) sont optimisés pour un usage au téléphone, puisque la majorité des visiteurs et de l'utilisation admin se fait sur mobile.

Pour activer le bouton WhatsApp flottant sur la boutique, ouvre [`js/site-config.js`](js/site-config.js) et mets ton numéro (format international sans le "+", ex: `212612345678`).

## 8) Pour aller plus loin (si tu veux, plus tard)

- Ajouter un lien WhatsApp de contact dans le footer.
- Ajouter un numéro de suivi / statut "En livraison" avant "Livrée".
- Passer sur un vrai nom de domaine (ex: `primadija.ma`) via Netlify.

---

Besoin d'aide pour une étape ? Dis-moi où tu bloques (screenshot si possible) et on avance ensemble. 🌸
