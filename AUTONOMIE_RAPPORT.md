# Sprint autonome Relève — 2026-10-23

## 1. Fait / Non fait / Bloqué

| Élément | État | Détail |
|---|---|---|
| Constat Mineur de la revue (PR #8) : ligne vide coupant le tableau de `docs/decisions.md` | Fait | Ligne supprimée |
| Commentaires d'Alex sur la PR #8 | Aucun | Questions du dernier rapport sans réponse |
| Tickets « sprint » | Aucun | `gh issue list --label sprint` est vide |
| Analyse « Synchronisation par différence d'état » | Fait | Inventaire des écritures dans `docs/qualite.md` : seul `retenir` (N+2 requêtes) peut laisser un état partiel |
| Fonction transactionnelle `retenir_remplacant` | Non fait | Touche la base et la sécurité ; attend l'accord d'Alex |
| Durcissement de `est_systeme()` | Non fait | Attend la réponse d'Alex (question 1) |
| `npm run check` | Vert | 59 tests, `dist/index.html` 181,5 Ko gzip (budget 250 Ko) |
| `bash scripts/db-test.sh` | Vert | PostgreSQL disponible cette fois : 225 assertions, migrations jouées deux fois |

## 2. Décisions prises seul

| Décision | Alternative écartée |
|---|---|
| Analyser sans modifier la base, comme prévu au rapport précédent | Écrire `retenir_remplacant` sans validation d'Alex : migration de sécurité, choix de conception à deux sorties |

## 3. Ce qui requiert Alex (par impact)

1. Rendre « retenir un remplaçant » transactionnel (une fonction SQL, un appel) ?
   - A. Oui, au prochain run (migration nouvelle, tests SQL ajoutés)
   - B. Non, le rechargement après erreur suffit pour l'instant
   - C. Autre
2. Durcir `est_systeme()` (risque aujourd'hui fermé par l'absence de droits `anon`) ?
   - A. Oui, par une nouvelle migration
   - B. Non, le constat (décision 23) suffit
   - C. Autre
3. Motif d'absence visible des candidats ?
   - A. Afficher « Absence »
   - B. Garder le motif
   - C. Autre

## 4. Les 3 prochaines actions d'Alex

| Action | Durée |
|---|---|
| Répondre aux trois questions ci-dessus | 10 min |
| Relire la PR #6 (page d'attente) et la PR #9 (correctifs du sprint) | 30 min |
| Créer des tickets « sprint » pour alimenter le prochain run | 20 min |

## 5. Sans réponse d'Alex au prochain run

Point « `annuaire()` » de `docs/qualite.md` : documenter les champs exposés et chiffrer l'option « restreindre au département », sans modifier la base.
