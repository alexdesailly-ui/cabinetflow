# Sprint autonome Relève — 2026-10-30

## 1. Fait / Non fait / Bloqué

| Élément | État | Détail |
|---|---|---|
| Constat Mineur de la revue (PR #8) : `docs/qualite.md` invoquait « PostgreSQL absent » pour le report de `est_systeme()` | Fait | Motif remplacé par « en attente de la décision d'Alex » |
| Commentaires d'Alex sur la PR #8 | Aucun | Trois questions du rapport précédent sans réponse |
| Tickets « sprint » | Aucun | Liste vide |
| Point « `annuaire()` » de `docs/qualite.md` | Fait (documentation) | Champs exposés, tests existants, coût de l'option « restreindre au département », variante légère |
| Restriction de `annuaire()` | Non fait | Touche la base et le produit ; attend la décision d'Alex |
| `retenir_remplacant` transactionnel, durcissement de `est_systeme()` | Non fait | Attendent Alex (questions 1 et 2) |
| `npm run check` | Vert | `dist/index.html` 181,5 Ko gzip (budget 250 Ko) |
| `bash scripts/db-test.sh` | Non lancé | Aucun fichier `supabase/` modifié |

Ce run ne contient que de la documentation : aucun point restant ne pouvait avancer sans décision d'Alex.

## 2. Décisions prises seul

| Décision | Alternative écartée |
|---|---|
| Documenter `annuaire()` sans migration | Masquer le code postal et le nom de famille tout de suite : change le produit (vivier, annonces) sans accord |

## 3. Ce qui requiert Alex (par impact)

1. Visibilité de l'annuaire des remplaçants ?
   - A. Inchangée (tous les membres connectés)
   - B. Variante légère : code postal masqué et nom réduit à l'initiale hors candidature
   - C. Restreinte au département et voisins (migration + table de voisinage)
   - D. Autre
2. Rendre « retenir un remplaçant » transactionnel (une fonction SQL) ?
   - A. Oui, au prochain run
   - B. Non, le rechargement après erreur suffit
   - C. Autre
3. Durcir `est_systeme()` ?
   - A. Oui, par une nouvelle migration
   - B. Non, le constat (décision 23) suffit
   - C. Autre
4. Motif d'absence visible des candidats ?
   - A. Afficher « Absence »
   - B. Garder le motif
   - C. Autre

## 4. Les 3 prochaines actions d'Alex

| Action | Durée |
|---|---|
| Répondre aux quatre questions ci-dessus | 10 min |
| Relire les PR #6 (page d'attente) et #9 (correctifs du sprint) | 30 min |
| Créer des tickets « sprint » pour alimenter le prochain run | 20 min |

## 5. Sans réponse d'Alex au prochain run

Les autres lignes de « Points d'attention connus » ne demandent que de la documentation : chiffrement sans rotation (options et coût d'une rotation) et suppression de compte (procédure de validation sur un projet réel). Aucune modification de la base.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
