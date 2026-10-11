# Qualité

## Ce qui est vérifié automatiquement

Chaque changement déclenche l'intégration continue ; rien n'est fusionné sans contrôles verts.

| Contrôle | Ce qu'il vérifie |
|---|---|
| Lint, types, tests, build | ESLint, TypeScript en mode strict, tests unitaires, construction du fichier HTML |
| Budget de taille | Alerte au-delà de 250 Ko compressés (actuel : ≈ 166 Ko) |
| Audit des dépendances livrées | Échec en cas de vulnérabilité haute dans ce qui part au navigateur |
| Base de données | Postgres 16 jetable : migrations appliquées **deux fois**, jeu de données, 225 assertions SQL |
| Fonctions serveur | Vérification des types (Deno) |
| Secrets | Scan de tout l'historique (gitleaks) |
| Aperçu de chaque proposition de changement | Déploiement de prévisualisation (inactif tant que les accès ne sont pas configurés) |

## Tests

**40 tests unitaires** (Vitest) : calculs métier (15), synchronisation avec la base (11), actions (7), logique de paiement (7).

**225 assertions SQL**, exécutées avec une simulation des rôles Supabase :

| Fichier | Assertions | Objet |
|---|---|---|
| `01_couverture_rls` | 10 | Chaque table a la sécurité par ligne activée et forcée |
| `02_isolation_cabinets` | 140 | Matrice quatre cabinets × dix tables : aucun accès croisé |
| `03_regles_metier` | 41 | Éligibilité, signature, parrainage, accès à la publication |
| `04_donnees_sensibles_rgpd` | 26 | Chiffrement, fenêtre d'accès à la fiche, export, suppression, rétention |
| `05_stripe` | 8 | Abonnement écrit uniquement par le webhook |

Commandes : `npm run check` et `npm run test:db`.

## Où lire le code en priorité

Par niveau de risque :

1. `supabase/migrations/20261001000200_securite_rls.sql` : politiques, fonctions internes `private.*`, règles métier.
2. `supabase/migrations/20261001000300_donnees_sensibles_rgpd.sql` : chiffrement, fenêtre d'accès à la fiche, export et suppression.
3. `src/lib/cloud/mapping.ts` et `sync.ts` : synchronisation par différence d'état, approche peu courante (voir [Architecture](architecture.md)).
4. `supabase/functions/stripe-webhook/index.ts` : signature, idempotence, relecture de l'abonnement.

## Points d'attention connus

| Sujet | Question ouverte |
|---|---|
| Synchronisation par différence d'état | Les écritures ne sont pas transactionnelles (retenir un candidat = plusieurs requêtes). Faut-il des fonctions transactionnelles pour « retenir » et « signer » ? |
| `annuaire()` | Cette fonction expose nom, ville, profil et statut des pièces de tous les comptes à tout utilisateur connecté, l'inscription étant gratuite côté remplaçant. Acceptable pour une place de marché, ou à restreindre au département ? |
| `est_systeme()` | Repose sur l'absence d'identifiant utilisateur et sur le rôle ; vérifier qu'aucun chemin authentifié ne peut arriver sans identifiant |
| Chiffrement | Clé symétrique unique dans Vault, sans rotation : suffisant tant qu'aucune donnée de santé n'est hébergée ? |
| Suppression de compte | Supprime l'utilisateur d'authentification depuis une fonction SQL : à valider sur un projet réel (droits du rôle propriétaire) |
| Politique de lecture des missions | Les missions publiées sont visibles de tous les cabinets : voulu, c'est une place de marché |
| Politique de contenu | `'unsafe-inline'` est nécessaire à cause du build en fichier unique |
| Quotas | Stockés en table : contention possible à forte charge, sans enjeu avant plusieurs centaines de cabinets |
| Motif d'absence | « Maladie » ou « maternité » du titulaire est visible des candidats : afficher « Absence » serait plus discret |

## Limites connues

- Pas de tests de bout en bout dans un navigateur (parcours inscription → mission → signature).
- Pas de notifications par email ou SMS (publication, expiration d'une pièce, échéance de reversement).
- Pièces justificatives **déclaratives** : ni pièce jointe, ni contrôle dans l'annuaire des professionnels.
- Signature **simple** (nom saisi, date posée par le serveur), pas de signature électronique qualifiée.
- Le mode comptes réels n'a pas encore été exercé de bout en bout contre un projet Supabase de production ; la base est installée et les tests SQL passent.

## Dette technique

- Fichiers denses (une ligne de JSX peut dépasser 400 caractères) : lisibles pour l'auteur, plus coûteux pour un relecteur. Aucun reformatage global n'a été appliqué pour ne pas noyer l'historique ; un formateur automatique est envisageable.
- L'état est copié à chaque mutation (`JSON.parse(JSON.stringify(...))`) : négligeable aujourd'hui, à revoir au-delà de quelques milliers d'objets.
- En démonstration, les identifiants sont générés côté client ; en mode comptes réels, ils sont générés par le serveur.

## Dépendances

- **Vite 5** : une alerte modérée (esbuild jusqu'à la version 0.24.2) concerne uniquement le serveur de développement, pas le fichier publié. La montée de version majeure est reportée : risque de régression sans bénéfice pour le produit. `npm audit` signale deux alertes, toutes de cette même chaîne ; la CI vérifie séparément les dépendances livrées.
- React 18 et TypeScript 5 : pas de faille connue ; la migration vers React 19 n'est pas urgente.

## Taille

Le fichier HTML produit pèse environ 570 Ko, soit ≈ 166 Ko compressés. Le SDK Supabase y est inclus même en démonstration : le build en fichier unique empêche le chargement différé, et le total reste sous le budget de 250 Ko.
