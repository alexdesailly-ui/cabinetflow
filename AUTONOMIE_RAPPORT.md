# Sprint autonome Relève — 2026-10-21

## 1. Fait / Non fait / Bloqué

| Élément | État | Détail |
|---|---|---|
| PR de revue en cours | Sans objet | La seule PR ouverte (#6, page d'attente) n'est pas un sprint ; aucun commentaire ni constat |
| Tickets « sprint » | Aucun | `gh issue list --label sprint` est vide |
| Audit de `est_systeme()` (points d'attention) | Fait | Constat dans `docs/qualite.md` et `docs/decisions.md` (n° 23) |
| Durcissement de `est_systeme()` | Bloqué | PostgreSQL absent : `scripts/db-test.sh` non exécutable, `supabase/` non modifié |
| `npm run check` | Vert | `dist/index.html` 181 Ko gzip (budget 250 Ko) |

## 2. Décisions prises seul

| Décision | Alternative écartée |
|---|---|
| Documenter le constat sans toucher à la base | Réécrire la garde sans pouvoir la tester |

## 3. Ce qui requiert Alex

1. Durcir `est_systeme()` (sécurité ; risque aujourd'hui fermé par l'absence de droits `anon`) ?
   - A. Oui, au prochain run si PostgreSQL est disponible
   - B. Non, le constat suffit
   - C. Autre
2. Motif d'absence visible des candidats ?
   - A. Afficher « Absence »
   - B. Garder le motif
   - C. Autre

## 4. Les 3 prochaines actions d'Alex

| Action | Durée |
|---|---|
| Relire la PR #6 (page d'attente) | 15 min |
| Répondre aux deux questions ci-dessus | 10 min |
| Créer des tickets « sprint » pour alimenter le prochain run | 20 min |

## 5. Sans réponse d'Alex au prochain run

Analyse (sans code) du point « Synchronisation par différence d'état » : liste des écritures multi-requêtes à rendre transactionnelles.
