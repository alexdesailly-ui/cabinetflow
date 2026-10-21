# Relève — consignes pour les agents

Lu à chaque exécution par les agents (sprint autonome, revue de PR, correctifs `@claude`). Rester court.

## Le produit

Place de marché de remplacement pour infirmiers libéraux : un cabinet publie une mission, un remplaçant postule, contrat signé, fiche de passation. React + Vite (un seul fichier HTML), Supabase (Postgres RLS forcée, Edge Functions Deno), Stripe pour l'abonnement. Détails : `docs/architecture.md`, `docs/securite-et-donnees.md`, `docs/qualite.md`.

## Commandes

| But | Commande |
|---|---|
| Tout vérifier avant de pousser | `npm run check` (lint, types, tests, build) |
| Tests base de données | `npm run test:db` (Postgres requis, tourne en CI) |

## Règles non négociables

1. **Aucune donnée de santé.** La liste des patients de la fiche de passation reste interdite côté serveur (`fiche_patients_autorises = false`). Ne jamais la réactiver ni ajouter un champ libre qui pourrait recevoir un patient.
2. **La sécurité est dans la base.** Toute nouvelle table : RLS activée et forcée, droits colonne par colonne, test d'isolation ajouté dans `supabase/tests/02_isolation_cabinets.sql`.
3. **Migrations : on ajoute, on ne réécrit pas.** Jamais de modification d'un fichier de `supabase/migrations/` déjà présent sur `main` ; nouvelle migration idempotente (elle est appliquée deux fois en CI).
4. **Un seul point d'écriture** : les écrans passent par `src/lib/actions.ts` puis `mutate()`, jamais d'écriture directe dans l'état.
5. **Stripe** : l'abonnement n'est écrit que par le webhook signé ; aucune logique de paiement côté navigateur.
6. **Secrets** : rien en clair dans le dépôt (gitleaks bloque la CI). Variables dans `.env.example` sans valeur.
7. **Budget de taille** : 250 Ko gzip pour `dist/index.html`. Toute nouvelle dépendance livrée au navigateur se justifie.

## Conventions

- Interface, messages de commit et documentation en français, vocabulaire des infirmiers libéraux (`src/lib/types.ts`).
- Tout calcul métier nouveau arrive avec son test Vitest.
- Ne jamais fusionner sur `main`, ne jamais déployer, ne jamais toucher à `.github/workflows/` sans demande explicite d'Alex.
