/**
 * Logique Stripe pure (sans réseau, sans Deno) : testée par Vitest
 * (stripe-logique.test.ts) et importée par les Edge Functions.
 */

export type StatutAbonnement =
  | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused'

/** Sous-ensemble d'un objet Stripe.Subscription utilisé ici. */
export interface AbonnementStripe {
  id: string
  customer: string | { id: string }
  status: StatutAbonnement
  cancel_at_period_end: boolean
  trial_end: number | null
  current_period_end?: number | null
  metadata?: Record<string, string>
  items: { data: { price: { id: string; recurring?: { interval?: string } | null }; current_period_end?: number | null }[] }
}

export interface LigneAbonnement {
  cabinet_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  statut: StatutAbonnement
  price_id: string | null
  intervalle: 'month' | 'year' | null
  trial_end: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  maj_le: string
}

const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null)

/** Abonnement Stripe → ligne de public.subscriptions. */
export function ligneDepuisAbonnement(sub: AbonnementStripe, cabinetId: string, maintenant = new Date()): LigneAbonnement {
  const item = sub.items.data[0]
  const intervalle = item?.price.recurring?.interval
  return {
    cabinet_id: cabinetId,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    statut: sub.status,
    price_id: item?.price.id ?? null,
    intervalle: intervalle === 'month' || intervalle === 'year' ? intervalle : null,
    trial_end: iso(sub.trial_end),
    // Depuis l'API 2025, la fin de période est portée par l'élément d'abonnement.
    current_period_end: iso(item?.current_period_end ?? sub.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    maj_le: maintenant.toISOString(),
  }
}

/** Événements traités par le webhook ; les autres sont acquittés et ignorés. */
export const EVENEMENTS_GERES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
] as const

export function evenementGere(type: string): boolean {
  return (EVENEMENTS_GERES as readonly string[]).includes(type)
}

/** Stripe refuse trial_period_days = 0 et au-delà de 730 : on n'envoie la valeur que si elle est utile. */
export function joursEssaiPourCheckout(restant: number | null | undefined): number | undefined {
  if (!restant || restant < 1) return undefined
  return Math.min(730, Math.floor(restant))
}

export interface CorpsCheckout { intervalle: 'month' | 'year'; retour: string }

/**
 * Validation stricte des entrées : seul un retour vers l'application elle-même
 * est accepté (pas de redirection ouverte vers un site tiers après paiement).
 */
export function validerCorps(corps: unknown, urlApp: string): CorpsCheckout {
  const c = (corps ?? {}) as Record<string, unknown>
  const intervalle = c.intervalle === 'year' ? 'year' : c.intervalle === 'month' || c.intervalle === undefined ? 'month' : null
  if (!intervalle) throw new ErreurEntree('intervalle invalide')
  const retour = typeof c.retour === 'string' ? c.retour : urlApp
  if (!urlApp || !retour.startsWith(urlApp)) throw new ErreurEntree('URL de retour non autorisée')
  if (retour.length > 500) throw new ErreurEntree('URL de retour trop longue')
  return { intervalle, retour }
}

export class ErreurEntree extends Error {
  override name = 'ErreurEntree'
}

export function prixPour(intervalle: 'month' | 'year', env: { mensuel?: string; annuel?: string }): string {
  const prix = intervalle === 'year' ? env.annuel : env.mensuel
  if (!prix) throw new Error(`Prix Stripe manquant pour « ${intervalle} » (STRIPE_PRICE_${intervalle === 'year' ? 'ANNUEL' : 'MENSUEL'})`)
  return prix
}

/** En-têtes CORS : uniquement l'origine de l'application. */
export function enTetesCors(urlApp: string): Record<string, string> {
  let origine = '*'
  try { origine = new URL(urlApp).origin } catch { /* URL absente en local */ }
  return {
    'Access-Control-Allow-Origin': origine,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
