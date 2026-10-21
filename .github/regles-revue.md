# Règles de revue de Relève

Référentiel lu par l'agent de revue à chaque PR. Alex l'enrichit à chaque faux positif ou oubli constaté : c'est ce fichier qui fait progresser la revue, pas le prompt.

## Ce que l'agent cherche, par ordre de gravité

| Gravité | Exemples propres à Relève |
|---|---|
| **Bloquant** | Table ou colonne sans RLS forcée ; fonction `security definer` sans `search_path` vide ; accès croisé possible entre cabinets ; champ pouvant recevoir une donnée patient ; écriture d'abonnement hors webhook Stripe ; webhook sans vérification de signature ou sans idempotence ; secret en clair ; migration existante réécrite |
| **Important** | Règle métier vérifiée seulement dans l'interface (éligibilité, signature, parrainage, fenêtre d'accès à la fiche) ; écriture qui contourne `actions.ts` / `mutate()` ; écriture multi-requêtes non transactionnelle sur « retenir » ou « signer » ; calcul métier sans test ; régression du mode démonstration ; donnée exposée par `annuaire()` au-delà du nécessaire |
| **Mineur** | Libellé d'interface incohérent avec le vocabulaire infirmier ; dépendance navigateur lourde ; documentation `docs/` non mise à jour alors que le comportement change |

## Ce que l'agent ne commente pas

- Ce que la CI vérifie déjà : formatage, lint, types, tests rouges, taille du bundle, audit npm, gitleaks. Il lit le statut de la CI et le cite, il ne le refait pas.
- Les préférences de style sans conséquence.
- Le code non modifié par la PR, sauf si le changement le casse.

## Filtre anti faux positifs

Un constat n'est publié que si l'agent a :
1. relu le code autour du diff (appelants, politique RLS, migration concernée) ;
2. décrit un scénario concret de défaillance (« un remplaçant du cabinet A peut lire… ») ;
3. vérifié qu'aucun test, déclencheur ou politique existant ne le couvre déjà.

Sinon, le constat est écarté ou reformulé en question.

## Faux positifs connus (à ne plus signaler)

- `'unsafe-inline'` dans la politique de contenu : imposé par le build en fichier unique.
- Missions publiées visibles de tous les cabinets : voulu, c'est une place de marché.
