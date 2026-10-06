# Scripts à appliquer à la main

Le connecteur Supabase utilisé depuis Claude refuse silencieusement les scripts
contenant `DROP` ou `DELETE`. Les fonctions ci-dessous en contiennent par nature
(effacement de compte RGPD, purge de rétention) : elles s'appliquent depuis le
tableau de bord Supabase, *SQL Editor → New query → coller → Run*.

| Fichier | Quand | Contenu |
|---|---|---|
| `rgpd_et_purge.sql` | Une fois, après les migrations | `rgpd_export`, `rgpd_supprimer_mon_compte`, `private.purger`, tâche quotidienne `releve-purge` |

Ces fonctions sont identiques à celles de `supabase/migrations/20261001000300_donnees_sensibles_rgpd.sql`,
qui reste la source de vérité pour `supabase db push` et les tests locaux.
