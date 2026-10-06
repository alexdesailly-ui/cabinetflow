# Brief de revue de code : Relève (1 page)

**Produit** : SaaS de remplacement pour infirmiers libéraux. Le cabinet publie un besoin, le remplaçant candidate, l'app contrôle l'éligibilité, génère le contrat, suit la rétrocession. Le front existe depuis le début ; le backend est **neuf et non encore déployé** (PR `ccr-e70710f7-d7tk7n`).

## Architecture
```
React 18 + Vite (un seul fichier HTML) ──► store.ts (état + mutate) ──► actions.ts (toutes les écritures)
                                             │ mode démo : localStorage
                                             └ mode cloud : cloud/sync.ts ─ diff(avant, après) ─► Supabase (PostgREST)
Supabase : Postgres (RLS forcée), Auth (OTP email), Vault (clé), pg_cron, Edge Functions Deno (Stripe)
```
- Mode cloud activé seulement si `VITE_SUPABASE_URL/ANON_KEY` sont fournis au build.
- **La sécurité est dans la base**, pas dans le front : RLS + GRANT par colonne + triggers « garde » + RPC `security definer`.

## Où regarder en priorité (par risque)
1. `supabase/migrations/20261001000200_securite_rls.sql` : politiques, `private.*` (security definer, `search_path=''`), gardes métier.
2. `supabase/migrations/20261001000300_donnees_sensibles_rgpd.sql` : chiffrement pgcrypto, fenêtre d'accès à la fiche, export et suppression RGPD.
3. `src/lib/cloud/mapping.ts` + `sync.ts` : synchronisation par différence d'état (approche inhabituelle, voir ci-dessous).
4. `supabase/functions/stripe-webhook/index.ts` : signature, idempotence, relecture de l'abonnement.

## Points à challenger
- **Synchro par diff d'état** plutôt qu'une API par action : moins de code, écrans inchangés, mais écritures non transactionnelles (ex. `retenir` = 4 requêtes). Faut-il des RPC transactionnelles pour `retenir` et `signer` ?
- **`annuaire()` en security definer** expose nom, ville, profil et statut des pièces de *tous* les comptes à tout utilisateur connecté (inscription gratuite côté remplaçant). Acceptable pour une place de marché ? Restreindre au département ?
- **`est_systeme()`** s'appuie sur `auth.uid() is null` + rôle. Vérifier qu'aucun chemin `authenticated` n'arrive sans `sub`.
- **Chiffrement** : clé symétrique unique (Vault), pas de rotation. Suffisant pour le scénario A ?
- **Suppression RGPD** : `delete from auth.users` depuis une fonction SQL. Valider sur un vrai projet Supabase (droits du rôle `postgres`).
- **Politique `missions_select`** : `statut = 'publiee'` rend visibles les missions de tous les cabinets. C'est voulu (place de marché).
- `'unsafe-inline'` dans la CSP, imposé par le build en fichier unique.
- Quotas en table (`private.quotas`) : contention possible sous forte charge (pas un sujet avant 1 000 cabinets).

## Comment vérifier
```bash
npm ci && npm run check   # lint, types, 40 tests unitaires, build
npm run test:db           # Postgres jetable : migrations ×2 (rejouables), seed, 225 assertions SQL
cd supabase/functions && deno check */index.ts
```
Les tests SQL simulent les rôles Supabase (`supabase/tests/shim/`). **Non testé contre un vrai projet Supabase** (aucun projet créé : décision réservée au propriétaire).

## Questions ouvertes
- Pas de test E2E navigateur (Playwright) : à ajouter sur le parcours inscription → mission → signature.
- Pas de notification email/SMS (publication, expiration de pièce, échéance de rétrocession).
- `vite` 5 : alerte modérée qui concerne seulement le serveur de dev ; montée en version 6+ à planifier.
