// Ouvre Stripe Checkout (abonnement mensuel ou annuel) pour le cabinet connecté.
// L'essai restant (14 jours + mois offerts) est reporté dans Stripe : s'abonner tôt ne fait rien perdre.
import type Stripe from 'npm:stripe@17.7.0'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  admin,
  cabinetAppelant,
  env,
  json,
  quota,
  servir,
  stripe,
  urlApp,
} from '../_shared/serveur.ts'
import { enregistrerAbonnement } from '../_shared/stripe-ports.ts'
import { joursEssaiPourCheckout, ligneProvisoire, STATUTS_EN_COURS } from '../_shared/abonnement.ts'
import { avecParametre, prixPour, validerCorps } from '../_shared/entrees.ts'

/** Crée le client Stripe du cabinet et le note aussitôt : le retour de paiement saura à qui il appartient. */
async function creerClient(
  st: Stripe,
  sb: SupabaseClient,
  cabinetId: string,
  email?: string,
): Promise<string> {
  const client = await st.customers.create(
    { email, metadata: { cabinet_id: cabinetId } },
    { idempotencyKey: `client-${cabinetId}` },
  )
  await enregistrerAbonnement(sb, ligneProvisoire(cabinetId, client.id))
  return client.id
}

servir(async req => {
  const sb = admin()
  const { userId, email, cabinetId } = await cabinetAppelant(req, sb)
  await quota(sb, `checkout:${userId}`, 10, 3600)
  const { intervalle, retour } = validerCorps(await req.json().catch(() => ({})), urlApp())
  const st = stripe()

  const { data: existant } = await sb
    .from('subscriptions')
    .select('stripe_customer_id, statut')
    .eq('cabinet_id', cabinetId)
    .maybeSingle()
  if (existant && STATUTS_EN_COURS.includes(existant.statut))
    return json({ erreur: 'Abonnement déjà actif : utilisez le portail' }, 409)
  const client = existant?.stripe_customer_id ?? (await creerClient(st, sb, cabinetId, email))

  const { data: essaiRestant } = await sb.rpc('essai_restant_jours', { cabinet: cabinetId })
  const session = await st.checkout.sessions.create({
    mode: 'subscription',
    customer: client,
    client_reference_id: cabinetId,
    line_items: [
      {
        price: prixPour(intervalle, {
          mensuel: env('STRIPE_PRICE_MENSUEL'),
          annuel: Deno.env.get('STRIPE_PRICE_ANNUEL'),
        }),
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: joursEssaiPourCheckout(essaiRestant),
      metadata: { cabinet_id: cabinetId },
    },
    payment_method_collection: 'always',
    // Une facture à un professionnel porte son nom, son adresse et, s'il en a un, son numéro de TVA.
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    customer_update: { name: 'auto', address: 'auto' },
    allow_promotion_codes: true,
    locale: 'fr',
    success_url: avecParametre(retour, 'paiement', 'ok'),
    cancel_url: retour,
  })
  return json({ url: session.url })
})
