# Scripts à appliquer à la main

Certains outils d'exécution SQL automatisée rejettent les scripts contenant `DROP` ou
`DELETE`. Les fonctions ci-dessous en contiennent par nature (suppression de compte
RGPD, purge de rétention) : elles s'appliquent depuis la console Supabase,
*SQL Editor → New query → coller → Run*.

| Fichier | Quand | Contenu |
|---|---|---|
| `rgpd_et_purge.sql` | Une fois, après les migrations | `rgpd_export`, `rgpd_supprimer_mon_compte`, `private.purger`, tâche quotidienne `releve-purge` |

Ces fonctions sont identiques à celles de `supabase/migrations/20261001000300_donnees_sensibles_rgpd.sql`,
qui reste la source de vérité pour `supabase db push` et les tests locaux.
