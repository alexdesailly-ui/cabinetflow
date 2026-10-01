# Stripe : ce qui est fait, ce que vous devez faire

## Fait (mode test uniquement)

| Élément | Fichier |
|---|---|
| Checkout abonnement mensuel / annuel, essai reporté (14 j + mois offerts), codes promo, locale FR | `supabase/functions/stripe-checkout/` |
| Portail client (carte, factures, résiliation) | `supabase/functions/stripe-portal/` |
| Webhook signé, idempotent, relit l'abonnement chez Stripe (ordre des événements non garanti) | `supabase/functions/stripe-webhook/` |
| Table `subscriptions` écrite **uniquement** par le webhook ; `comptes.plan` suit automatiquement | `migrations/…0150`, `…0400` |
| Feature-gating serveur : publier une mission exige essai en cours ou statut `active`/`trialing`/`past_due` | `private.cabinet_actif` |
| Échec de paiement : `past_due` → accès maintenu pendant les relances Stripe, bandeau dans *Mon compte* ; `unpaid`/`canceled` → publication bloquée | webhook + RLS |
| Garde-fou : une clé `sk_live_` est **refusée** tant que `STRIPE_LIVE_AUTORISE=oui` n'est pas posé | `_shared/serveur.ts` |
| Logique testée sans réseau (conversion, essai, redirections, CORS) | `_shared/stripe-logique.test.ts` |

Clés : uniquement en variables d'environnement (secrets Supabase), jamais dans le front ni dans Git (gitleaks en CI).

## À faire par vous, dans l'ordre (≈ 45 min)

### 1. Mode test (pour essayer avec des collègues, 0 €)
1. Créer le compte Stripe (raison sociale, SIREN, IBAN) sur dashboard.stripe.com. Rester en **mode test**.
2. *Produits* → créer « Relève Cabinet » avec deux prix récurrents : mensuel et annuel (montants : voir `COUTS.md`). Noter les deux `price_…`.
3. *Paramètres → Facturation → Portail client* : activer résiliation, changement de carte, factures ; autoriser le passage mensuel ↔ annuel.
4. *Paramètres → Facturation → Relances* : 3 tentatives sur 2 semaines, puis passer l'abonnement en `unpaid`. Activer l'email « échec de paiement ».
5. Déployer les fonctions et poser les secrets :
   ```bash
   supabase functions deploy stripe-checkout
   supabase functions deploy stripe-portal
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_MENSUEL=price_... \
     STRIPE_PRICE_ANNUEL=price_... APP_URL=https://alexdesailly-ui.github.io/cabinetflow/
   ```
6. *Développeurs → Webhooks* → endpoint `https://<projet>.supabase.co/functions/v1/stripe-webhook`, événements : `checkout.session.completed`, `customer.subscription.created|updated|deleted|trial_will_end`, `invoice.paid`, `invoice.payment_failed`. Copier le secret : `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`.
7. Tester : carte `4242 4242 4242 4242` (succès), `4000 0000 0000 0341` (échec au renouvellement), puis `stripe trigger invoice.payment_failed`.

### 2. Passage en live (seulement après validation explicite)
1. Activer le compte (vérification d'identité Stripe).
2. Recréer produits et prix **en live** (les `price_` test ne marchent pas en live).
3. Nouvel endpoint webhook en live, nouveau `whsec_`.
4. `supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_... STRIPE_PRICE_MENSUEL=... STRIPE_PRICE_ANNUEL=... STRIPE_LIVE_AUTORISE=oui`
5. TVA : décider franchise en base (293 B) ou TVA 20 % ; si TVA, activer Stripe Tax ou fixer des prix TTC. Factures : numérotation et mentions obligatoires via les réglages de facturation Stripe.

## Non fait (volontairement)
- **Mois offerts par parrainage après souscription** : aujourd'hui ils allongent l'essai *avant* paiement. Après souscription, il faudra créditer le solde client Stripe (−29 € par mois offert) depuis le trigger de parrainage → 0,5 j. Question dans le rapport.
- Reversement de rétrocession via Stripe Connect : hors périmètre V1 (cf. `CONCEPT.md`).
