// Crée une session Stripe Checkout (abonnement mensuel ou annuel) pour le cabinet connecté.
// L'essai restant (14 j + mois offerts) est reporté dans Stripe : s'abonner tôt ne fait rien perdre.
import { admin, cabinetAppelant, env, json, quota, servir, stripe, urlApp } from '../_shared/serveur.ts'
import { joursEssaiPourCheckout, prixPour, validerCorps } from '../_shared/stripe-logique.ts'

servir(async req => {
  const sb = admin()
  const { userId, email, cabinetId } = await cabinetAppelant(req, sb)
  await quota(sb, `checkout:${userId}`, 10, 3600)
  const { intervalle, retour } = validerCorps(await req.json().catch(() => ({})), urlApp())
  const st = stripe()

  const { data: abo } = await sb.from('subscriptions').select('stripe_customer_id, statut').eq('cabinet_id', cabinetId).maybeSingle()
  if (abo && ['active', 'trialing', 'past_due'].includes(abo.statut)) return json({ erreur: 'Abonnement déjà actif : utilisez le portail' }, 409)

  let client = abo?.stripe_customer_id as string | undefined
  if (!client) {
    const c = await st.customers.create({ email, metadata: { cabinet_id: cabinetId } }, { idempotencyKey: `client-${cabinetId}` })
    client = c.id
    await sb.from('subscriptions').upsert({ cabinet_id: cabinetId, stripe_customer_id: client, statut: 'incomplete' }, { onConflict: 'cabinet_id' })
  }

  const { data: restant } = await sb.rpc('essai_restant_jours', { cabinet: cabinetId })
  const session = await st.checkout.sessions.create({
    mode: 'subscription',
    customer: client,
    client_reference_id: cabinetId,
    line_items: [{ price: prixPour(intervalle, { mensuel: env('STRIPE_PRICE_MENSUEL'), annuel: Deno.env.get('STRIPE_PRICE_ANNUEL') }), quantity: 1 }],
    subscription_data: { trial_period_days: joursEssaiPourCheckout(restant as number | null), metadata: { cabinet_id: cabinetId } },
    payment_method_collection: 'always',
    allow_promotion_codes: true,
    locale: 'fr',
    success_url: retour + (retour.includes('?') ? '&' : '?') + 'paiement=ok',
    cancel_url: retour,
  })
  return json({ url: session.url })
})
