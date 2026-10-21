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
| Revue agentique | Un agent relit chaque PR selon `.github/regles-revue.md`, écarte ses faux positifs, commente et propose des correctifs (inactif tant que le jeton n'est pas posé) |

## Tests

**59 tests unitaires** (Vitest) : calculs métier (15), synchronisation avec la base (11), actions (7), logique de paiement (7), démonstration en blocs et dates (19).

**225 assertions SQL**, exécutées avec une simulation des rôles Supabase :

| Fichier | Assertions | Objet |
|---|---|---|
| `01_couverture_rls` | 10 | Chaque table a la sécurité par ligne activée et forcée |
| `02_isolation_cabinets` | 140 | Matrice quatre cabinets × dix tables : aucun accès croisé |
| `03_regles_metier` | 41 | Éligibilité, signature, parrainage, accès à la publication |
| `04_donnees_sensibles_rgpd` | 26 | Chiffrement, fenêtre d'accès à la fiche, export, suppression, rétention |
| `05_stripe` | 8 | Abonnement écrit uniquement par le webhook |

Commandes : `npm run check` et `npm run test:db`.

## Revue agentique

La revue suit une boucle où l'humain n'intervient qu'aux deux bouts : il pose l'intention, il juge le résultat.

| Étape | Qui | Où |
|---|---|---|
| 1. Écrire l'intention et les critères d'acceptation | Alex | Ticket GitHub : `@claude` pour un traitement immédiat, label `sprint` pour le sprint du vendredi |
| 2. Coder, tester, ouvrir la PR | Agent | `claude.yml`, ou `sprint-autonome.yml` (vendredi 17h48, lançable à la main) |
| 3-4. Lire le diff et le contexte (code, ticket, règles), lire la CI | Agent de revue | `revue-agent.yml` |
| 5. Vérifier chaque constat, écarter les faux positifs | Agent de revue | filtre de `.github/regles-revue.md` |
| 6. Commenter, proposer un correctif en un clic | Agent de revue | commentaires en ligne + synthèse |
| 7. Corriger, relancer la revue | Agent, sur `@claude corrige …` | `claude.yml` ; la revue repart seule après le commit |
| 8-9. Juger l'intention, approuver, fusionner | Alex | GitHub |

Garde-fous : l'agent de revue n'a aucun droit d'écriture sur le code et n'approuve jamais ; l'agent correcteur ne se déclenche que sur un commentaire humain (les bots sont refusés, donc pas de boucle sans fin) ; tours et durée plafonnés.

**Mise en service (une fois, par Alex)** :
1. Installer l'application GitHub Claude sur le dépôt : https://github.com/apps/claude
2. Générer un jeton d'abonnement : `claude setup-token` dans un terminal.
3. Le poser en secret du dépôt sous le nom `CLAUDE_CODE_OAUTH_TOKEN` (Settings → Secrets and variables → Actions).
4. Recommandé : protéger `main` (Settings → Branches) en exigeant la CI verte et une approbation.

**Faire progresser la revue** : chaque faux positif ou oubli constaté s'ajoute dans `.github/regles-revue.md`, pas dans le workflow.

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
| `est_systeme()` | Audit du 2026-10-21 : la fonction n'est pas `security definer` mais elle est appelée par des gardes qui le sont ; `current_user` y vaut donc le propriétaire (`postgres`), et un appel sans identifiant (clé `anon`) serait traité en système. Sans effet aujourd'hui : `anon` n'a aucun droit de table ni de colonne (testé dans `01_couverture_rls.sql`) et `authenticated` porte toujours un identifiant. Durcissement possible (`session_user` ou `auth.role()` seul) avec test SQL dédié : non fait, PostgreSQL absent de l'environnement du sprint |
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
- Démonstration en blocs : réponses WhatsApp simulées, aucun décompte des vraies réponses, bouton Retour du navigateur qui quitte la page au lieu de fermer la feuille ouverte ; l'interface n'est vérifiée que par des essais manuels sur navigateur (mobile, bureau, mode sombre, stockage bloqué).
- Le mode comptes réels n'a pas encore été exercé de bout en bout contre un projet Supabase de production ; la base est installée et les tests SQL passent.

## Dette technique

- Fichiers denses (une ligne de JSX peut dépasser 400 caractères) : lisibles pour l'auteur, plus coûteux pour un relecteur. Aucun reformatage global n'a été appliqué pour ne pas noyer l'historique ; un formateur automatique est envisageable.
- L'état est copié à chaque mutation (`JSON.parse(JSON.stringify(...))`) : négligeable aujourd'hui, à revoir au-delà de quelques milliers d'objets.
- En démonstration, les identifiants sont générés côté client ; en mode comptes réels, ils sont générés par le serveur.

## Dépendances

- **Vite 5** : une alerte modérée (esbuild jusqu'à la version 0.24.2) concerne uniquement le serveur de développement, pas le fichier publié. La montée de version majeure est reportée : risque de régression sans bénéfice pour le produit. `npm audit` signale deux alertes, toutes de cette même chaîne ; la CI vérifie séparément les dépendances livrées.
- React 18 et TypeScript 5 : pas de faille connue ; la migration vers React 19 n'est pas urgente.

## Taille

Le fichier HTML produit pèse environ 625 Ko, soit ≈ 181 Ko compressés. Le SDK Supabase y est inclus même en démonstration : le build en fichier unique empêche le chargement différé, et le total reste sous le budget de 250 Ko.
