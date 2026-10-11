# Relève

**Trouver, sécuriser et suivre un remplaçant, pour les infirmiers libéraux.**

Un infirmier libéral n'a pas de congés payés : chaque jour sans remplaçant est un jour sans revenu et une patientèle laissée sans soins. Aujourd'hui, le remplacement se règle par petites annonces et bouche-à-oreille, puis par un contrat, une déclaration à l'Ordre et un reversement d'honoraires gérés à la main.

Relève outille tout ce parcours : annoncer une absence, recevoir des candidatures, **vérifier automatiquement** que le remplaçant peut légalement remplacer, générer le contrat, suivre le reversement des honoraires.

<table>
<tr>
<td align="center" valign="top"><img src="docs/img/demo-hub.png" width="190" alt="Accueil de la démonstration : cinq blocs numérotés, à noter d'un emoji"><br><sub><b>La démo en 5 blocs</b>,<br>chacun noté d'un emoji</sub></td>
<td align="center" valign="top"><img src="docs/img/demo-whatsapp.png" width="190" alt="Bloc 1 : l'annonce d'absence prête à partir sur WhatsApp"><br><sub><b>Bloc 1 · gratuit</b> : l'annonce<br>part vraiment sur WhatsApp</sub></td>
<td align="center" valign="top"><img src="docs/img/demo-premium.png" width="190" alt="Bloc 3 : essai Premium de 14 jours sans carte bancaire"><br><sub><b>Bloc 3 · Premium</b> :<br>14 jours gratuits, sans carte</sub></td>
<td align="center" valign="top"><img src="docs/img/demo-controles.png" width="190" alt="Bloc 5 : deux remplaçants sur trois bloqués avant la signature"><br><sub><b>Bloc 5</b> : les dossiers non<br>conformes sont bloqués</sub></td>
</tr>
</table>

**Démonstration en ligne : <https://cabinetflow.fr>** : cinq blocs à tester séparément en une trentaine de secondes chacun, sans compte, avec des données fictives. On arrive en version gratuite (l'annonce WhatsApp fonctionne réellement) ; les blocs Premium se débloquent par un essai simulé. Chaque bloc se note d'un emoji, ce qui sert à décider des priorités ([protocole](docs/tests-utilisateurs.md)).
Accès direct : `/?demo=cabinet` (les cinq blocs, puis l'application complète en pied de page) · `/?demo=remplacant` (vue remplaçant).

## Le produit en un coup d'œil

| | |
|---|---|
| **Utilisateurs** | Les cabinets infirmiers libéraux (titulaires) qui cherchent un remplaçant, et les infirmiers remplaçants |
| **Ce qui change** | De l'annonce au reversement, chaque étape est vérifiée ou suivie au lieu d'être gérée à la main |
| **Ce qui le distingue** | Contrôles bloquants avant la signature (autorisation valable jusqu'au dernier jour, assurance professionnelle, règle des deux remplacements simultanés), suivi du reversement jusqu'au paiement, recommandations impossibles sans contrat signé |
| **Modèle économique** | Hypothèse testée dans la démonstration : annonce WhatsApp gratuite ; contrat, signature et suivi des honoraires en Premium (29 € par mois, essai de 14 jours sans carte) ; gratuit pour le remplaçant |
| **Stade** | Pré-lancement : démonstration en ligne, backend sécurisé prêt mais non activé, premiers retours d'infirmiers libéraux attendus |

## Où en est le projet

| Domaine | État |
|---|---|
| Démonstration en cinq blocs (annonce WhatsApp, souscription, signature, honoraires, conformité) et application complète (candidatures, contrôles, contrat, passation, reversement) | En ligne |
| Comptes réels, synchronisés entre appareils (Supabase) | Prêt, non activé en production |
| Isolation des données, chiffrement, droits RGPD | Implémentés et testés (225 assertions SQL) |
| Abonnement (Stripe) | Prêt en mode test, non branché |
| Signature du contrat | Signature simple ; signature électronique qualifiée à faire |
| Notifications par email et SMS | À faire |
| Vérification des pièces justificatives (aujourd'hui déclaratives) | À faire |
| Relecture juridique des conditions d'utilisation et du contrat | Brouillons à faire relire par un avocat |
| Validation des priorités auprès d'utilisateurs | Protocole défini ([détail](docs/tests-utilisateurs.md)), premiers retours attendus |

## Ce que le dépôt montre côté ingénierie

- **La sécurité est dans la base de données, pas dans l'interface** : isolation par cabinet imposée par Postgres (Row Level Security forcée sur toutes les tables, droits par colonne, règles métier rejouées côté serveur).
- **Tests** : 59 tests unitaires (Vitest) et 225 assertions SQL exécutées sur un Postgres jetable, dont une matrice d'isolation entre cabinets. Les migrations sont rejouées deux fois pour prouver qu'elles sont idempotentes.
- **Intégration continue** : lint, typage strict, tests, build, budget de taille du bundle, audit des dépendances, tests de base de données, typage des fonctions serveur, scan de secrets.
- **Données sensibles traitées dès la conception** : chiffrement des fiches de passation, journal d'accès, purge automatique, export et suppression en libre-service ([détail](docs/securite-et-donnees.md)).
- **Paiement** : abonnement Stripe via fonctions serveur (webhook signé et idempotent), en mode test.
- **Démonstration sans serveur** : l'annonce d'absence voyage dans le lien WhatsApp lui-même (aucune donnée stockée) et les blocs réutilisent le vrai domaine : contrôles d'éligibilité et modèle de contrat sont ceux de l'application.
- **Livraison simple** : application React/TypeScript produite en un seul fichier HTML ; production déployée à la main avec confirmation explicite.

Environ 5 200 lignes de TypeScript (écrans, feuilles de démonstration et logique métier), 1 100 lignes de migrations SQL, 540 lignes de tests SQL.

## Démarrer en local

```bash
npm ci
npm run dev        # http://localhost:5173 — mode démonstration, aucune configuration
```

| Commande | Rôle |
|---|---|
| `npm run check` | Lint, types, tests unitaires, build (ce que fait la CI) |
| `npm test` | Tests unitaires : domaine, actions, synchronisation, logique de paiement |
| `npm run test:db` | Tests SQL sur un Postgres jetable : migrations ×2, jeu de données, isolation, règles métier, RGPD |
| `npm run build` | Produit `dist/index.html`, autonome |
| `bash scripts/og/generer.sh` | Régénère l'image d'aperçu des liens partagés (`public/og.png`) |

Le mode « comptes réels » s'active uniquement si `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont définies au build (voir [`.env.example`](.env.example) et [l'exploitation](docs/exploitation.md)).

## Documentation

| Document | Contenu |
|---|---|
| [Produit](docs/produit.md) | Problème, solution, utilisateurs, déploiement par paliers, concurrence, risques |
| [Modèle économique](docs/modele-economique.md) | Marché, tarification, coût de revient par cabinet |
| [Architecture](docs/architecture.md) | Vue d'ensemble technique, modèle de données, règles tenues par le serveur |
| [Sécurité et données](docs/securite-et-donnees.md) | Décision sur les données de santé, RGPD, mesures en place |
| [Qualité](docs/qualite.md) | Tests, intégration continue, points d'attention, limites connues |
| [Exploitation](docs/exploitation.md) | Mise en ligne, variables et secrets, paiement, déploiement |
| [Décisions](docs/decisions.md) | Choix structurants et alternatives écartées |
| [Validation auprès d'utilisateurs](docs/tests-utilisateurs.md) | Protocole de recueil des priorités |

Les pages légales (mentions, confidentialité, conditions d'utilisation) sont dans [`legal/`](legal/) : ce sont des brouillons, affichés dans l'application.

## Avertissement

Version de démonstration : aucune donnée de patient ne doit y être saisie. Les montants de rétrocession sont des estimations, pas un calcul fiscal ; le contrat est un modèle de travail à relire, pas un conseil juridique.
