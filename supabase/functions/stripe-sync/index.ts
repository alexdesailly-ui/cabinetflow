// Aligne l'abonnement du cabinet connecté sur Stripe. Appelée au retour du paiement : le webhook
// arrive parfois après la redirection, et le cabinet ne doit pas attendre pour voir son accès.
import { admin, cabinetAppelant, json, quota, servir, stripe } from '../_shared/serveur.ts'
import { enregistrerAbonnement } from '../_shared/stripe-ports.ts'
import { type AbonnementStripe, abonnementRetenu, ligneDepuisAbonnement } from '../_shared/abonnement.ts'

servir(async req => {
  const sb = admin()
  const { userId, cabinetId } = await cabinetAppelant(req, sb)
  await quota(sb, `sync:${userId}`, 30, 3600)
  const { data: existant } = await sb.from('subscriptions').select('stripe_customer_id').eq('cabinet_id', cabinetId).maybeSingle()
  if (!existant?.stripe_customer_id) return json({ statut: null })

  const liste = await stripe().subscriptions.list({ customer: existant.stripe_customer_id, status: 'all', limit: 10 })
  const retenu = abonnementRetenu(liste.data as unknown as AbonnementStripe[])
  if (!retenu) return json({ statut: null })
  await enregistrerAbonnement(sb, ligneDepuisAbonnement(retenu, cabinetId, new Date()))
  return json({ statut: retenu.status })
})
