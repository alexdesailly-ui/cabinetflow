# État des lieux — Relève (1er octobre 2026)

> Rédigé avant toute modification. Les écarts listés en fin de document forment le backlog traité dans cette PR.

## 1. Ce qu'est réellement le dépôt

| Élément | Constat |
|---|---|
| Produit | **Relève** : remplacement infirmier libéral (IDEL). Pas un logiciel de gestion de cabinet au sens « dossier patient / facturation ». |
| Stack | React 18 + Vite 5 + TypeScript strict. Un seul fichier HTML produit (`vite-plugin-singlefile`). |
| Backend | **Aucun.** Ni Supabase, ni API, ni Stripe. Tout l'état vit dans `localStorage` (`src/lib/store.ts`). |
| Déploiement | GitHub Pages à chaque push sur `main` → https://alexdesailly-ui.github.io/cabinetflow/ |
| Taille | ~3 900 lignes de TS/TSX, 11 écrans, 0 test. |
| Historique | 8 commits, aucun secret détecté (recherche par motifs sur tout l'historique). |

**Hypothèse à challenger dès maintenant** : « la version WhatsApp n'existe pas ». Faux — **une démo partageable existe déjà** (lien GitHub Pages, monde fictif pré-chargé, deux comptes de démo). Ce qui manque pour une *prod*, ce sont des **comptes réels multi-appareils** : aujourd'hui, deux collègues ne peuvent pas collaborer (le cabinet sur son téléphone, le remplaçant sur le sien) car chaque navigateur a son propre monde.

## 2. Ce qui marche

- Parcours complet en local : publier un besoin → candidatures → contrôles bloquants (autorisation expirée, RCP, règle des 2 remplacements simultanés) → contrat généré → double signature simple → transmission Ordre → fiche de passation → suivi de rétrocession → recommandation.
- Parrainage plat plafonné (12 mois/an), fiabilité calculée sur des actes vérifiables, badges.
- Architecture saine pour brancher un backend : **toutes les écritures passent par `actions.ts` → `mutate()`**, les écrans ne touchent jamais l'état directement.
- `npm run typecheck` et `npm run build` passent (build 314 Ko, 96 Ko gzip).
- Recueil d'avis intégré (stocké localement, export par email/partage).

## 3. Ce qui est cassé ou fragile

| # | Problème | Gravité |
|---|---|---|
| 1 | Pas de comptes réels : la « connexion » est un simple changement d'identifiant local, n'importe qui peut « devenir » n'importe quel compte depuis *Mon compte*. Acceptable en démo, bloquant en prod. | Bloquant prod |
| 2 | La règle « fiche de passation visible J-7 → J+3 » n'est vérifiée **que dans l'interface** (`MissionDetail.tsx:268`). Aucune garantie serveur. | Bloquant prod |
| 3 | La fiche de passation contient des **données de santé** (initiales + rue + soins) et des **secrets d'accès** (code d'alarme, boîte à clé dans la démo). Voir `DONNEES_SANTE.md`. | Structurant |
| 4 | Le seed référence des contrats inexistants (`ctr-ext-1…5` dans les recommandations) : une base avec clés étrangères refuserait ces données. | Moyen |
| 5 | Aucun test, aucun lint, aucune CI sur les PR : seul un déploiement sur `main` existe. Un push cassé part directement en ligne. | Élevé |
| 6 | Déploiement prod automatique à chaque push sur `main` (contraire à la règle « prod manuelle »). | Moyen |
| 7 | Pas de mentions légales, CGU, politique de confidentialité, alors que l'app collecte nom, email, téléphone. | Élevé avant tout vrai utilisateur |
| 8 | Pas d'aperçu riche (Open Graph) : un lien collé dans WhatsApp n'affiche ni titre ni image → taux de clic plus faible. | Moyen (levier viral) |
| 9 | `crediter()` : compte les filleuls activés « cette année » mais `moisOfferts` n'expire jamais — sans conséquence tant que l'abonnement n'est pas réel. | Faible |

## 4. Dette technique

- Fichiers denses (une ligne JSX peut dépasser 400 caractères) : lisible pour l'auteur, coûteux pour un relecteur externe. Pas de reformatage massif dans cette PR (bruit de diff), Prettier proposé en option.
- `JSON.parse(JSON.stringify(etat))` à chaque mutation : coût négligeable à l'échelle actuelle, à revoir au-delà de quelques milliers d'objets.
- Pas de gestion d'erreurs réseau (normal : pas de réseau).
- Identifiants générés par `Math.random()` (OK localement, remplacés par des UUID serveur en mode cloud).

## 5. Dépendances

| Paquet | Installé | Dernière | Commentaire |
|---|---|---|---|
| vite | 5.4.21 | 8.3.1 | **Vulnérabilité modérée** via esbuild ≤ 0.24.2 (GHSA-67mh-4wv8-2f99) : ne touche que le serveur de **développement**, pas le build publié. Montée de version majeure → reportée (voir `DECISIONS.md`). |
| react / react-dom | 18.3.1 | 19.3.0 | Pas de faille connue. Migration 19 non urgente. |
| typescript | 5.9.3 | 7.0.2 | Pas de faille. |
| @vitejs/plugin-react | 4.7.0 | 6.1.1 | Suit Vite. |

`npm audit` : 2 alertes (1 modérée, 1 haute — la même chaîne vite → esbuild), **aucune dans le code livré au navigateur**.

## 6. Couverture de tests

**0 %.** Aucun framework de test installé. Les calculs à risque (rétrocession, conformité des pièces, contrôles d'affectation, plafond de parrainage) ne sont pas protégés.

## 7. MVP « WhatsApp » : attendu vs existant

| Fonction minimale pour la démo collègues | Existe ? | Écart |
|---|---|---|
| Lien qui s'ouvre sur mobile, compréhensible sans explication | Oui | Ajouter aperçu WhatsApp (Open Graph) et lien direct vers la démo (`?demo=cabinet`) |
| Essayer sans créer de compte | Oui (démo locale) | — |
| Créer un vrai compte (email) et le retrouver sur un autre appareil | **Non** | Supabase Auth (lien magique) + synchronisation |
| Cabinet et remplaçant sur deux téléphones voient la même mission | **Non** | Base Supabase + RLS + adaptateur `store.ts` |
| Isolation stricte entre cabinets | Sans objet (local) | RLS + tests d'isolation |
| Mentions légales / confidentialité / CGU | **Non** | Brouillons `/legal` |
| Paiement | **Non** | Stripe mode test (non requis pour une démo collègues, requis pour le premier client) |
| CI qui empêche de casser la démo | **Non** | GitHub Actions sur PR |

**Backlog prioritaire (dans l'ordre)** : CI + tests → schéma Supabase + RLS + tests d'isolation → adaptateur cloud derrière variable d'environnement → pages légales + aperçu WhatsApp → Stripe test → docs (coûts, revue de code, Stripe).
