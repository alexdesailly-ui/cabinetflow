/**
 * État d'abonnement : traduction des objets Stripe vers la table public.subscriptions.
 * Fonctions pures, sans réseau ni Deno : testées par Vitest (abonnement.test.ts).
 */

/** Les statuts d'abonnement de Stripe, tels que la table public.subscriptions les accepte. */
export const STATUTS_ABONNEMENT = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
] as const
export type StatutAbonnement = (typeof STATUTS_ABONNEMENT)[number]

/** Sous-ensemble de l'objet Stripe.Subscription que nous lisons. */
export interface AbonnementStripe {
  id: string
  customer: string | { id: string }
  status: StatutAbonnement
  created?: number
  cancel_at_period_end: boolean
  trial_end: number | null
  current_period_end?: number | null
  metadata?: Record<string, string>
  items: {
    data: {
      price: { id: string; recurring?: { interval?: string } | null }
      current_period_end?: number | null
    }[]
  }
}

/** Une ligne de public.subscriptions, telle que l'attend la fonction SQL enregistrer_abonnement. */
export interface LigneAbonnement {
  cabinet_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  statut: StatutAbonnement
  price_id: string | null
  intervalle: 'month' | 'year' | null
  trial_end: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  maj_le: string
}

const enIso = (secondes?: number | null) =>
  secondes ? new Date(secondes * 1000).toISOString() : null

export const identifiantClient = (sub: Pick<AbonnementStripe, 'customer'>): string =>
  typeof sub.customer === 'string' ? sub.customer : sub.customer.id

/** `luLe` est l'instant où Stripe a répondu : il départage deux écritures simultanées. */
export function ligneDepuisAbonnement(
  sub: AbonnementStripe,
  cabinetId: string,
  luLe: Date,
): LigneAbonnement {
  const element = sub.items.data[0]
  const intervalle = element?.price.recurring?.interval
  return {
    cabinet_id: cabinetId,
    stripe_customer_id: identifiantClient(sub),
    stripe_subscription_id: sub.id,
    statut: sub.status,
    price_id: element?.price.id ?? null,
    intervalle: intervalle === 'month' || intervalle === 'year' ? intervalle : null,
    trial_end: enIso(sub.trial_end),
    // Depuis l'API 2025, la fin de période est portée par l'élément d'abonnement.
    current_period_end: enIso(element?.current_period_end ?? sub.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    maj_le: luLe.toISOString(),
  }
}

/** Ligne écrite quand le client Stripe est créé, avant tout abonnement ; le premier abonnement la remplace. */
export function ligneProvisoire(cabinetId: string, clientId: string): LigneAbonnement {
  return {
    cabinet_id: cabinetId,
    stripe_customer_id: clientId,
    stripe_subscription_id: null,
    statut: 'incomplete',
    price_id: null,
    intervalle: null,
    trial_end: null,
    current_period_end: null,
    cancel_at_period_end: false,
    maj_le: new Date(0).toISOString(),
  }
}

const ORDRE_STATUTS: StatutAbonnement[] = [
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'paused',
  'incomplete',
  'canceled',
  'incomplete_expired',
]

/** Parmi les abonnements d'un client : celui qui compte est le plus avancé, puis le plus récent. */
export function abonnementRetenu<T extends AbonnementStripe>(abonnements: T[]): T | undefined {
  return [...abonnements].sort(
    (a, b) =>
      ORDRE_STATUTS.indexOf(a.status) - ORDRE_STATUTS.indexOf(b.status) ||
      (b.created ?? 0) - (a.created ?? 0),
  )[0]
}

/** Stripe ne facture jamais deux fois la période d'essai : on n'envoie que les jours réellement restants. */
export function joursEssaiPourCheckout(restant: number | null | undefined): number | undefined {
  if (!restant || restant < 1) return undefined
  return Math.min(730, Math.floor(restant))
}

/** Un abonnement dans l'un de ces états donne accès aux fonctions payantes (voir private.cabinet_actif). */
export const STATUTS_EN_COURS: StatutAbonnement[] = ['trialing', 'active', 'past_due']
