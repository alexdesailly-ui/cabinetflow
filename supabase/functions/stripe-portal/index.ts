// Ouvre le portail client Stripe (carte, factures, résiliation) pour le cabinet connecté.
import { admin, cabinetAppelant, ErreurHttp, json, quota, servir, stripe, urlApp } from '../_shared/serveur.ts'
import { validerCorps } from '../_shared/stripe-logique.ts'

servir(async req => {
  const sb = admin()
  const { userId, cabinetId } = await cabinetAppelant(req, sb)
  await quota(sb, `portal:${userId}`, 20, 3600)
  const { retour } = validerCorps(await req.json().catch(() => ({})), urlApp())
  const { data: abo } = await sb.from('subscriptions').select('stripe_customer_id').eq('cabinet_id', cabinetId).maybeSingle()
  if (!abo?.stripe_customer_id) throw new ErreurHttp(404, 'Aucun abonnement')
  const session = await stripe().billingPortal.sessions.create({ customer: abo.stripe_customer_id, return_url: retour, locale: 'fr' })
  return json({ url: session.url })
})
