import { describe, expect, it } from 'vitest'
import { type AbonnementStripe, ErreurEntree, enTetesCors, evenementGere, joursEssaiPourCheckout, ligneDepuisAbonnement, prixPour, validerCorps } from './stripe-logique'

const sub = (extra: Partial<AbonnementStripe> = {}): AbonnementStripe => ({
  id: 'sub_1', customer: 'cus_1', status: 'trialing', cancel_at_period_end: false, trial_end: 1_790_000_000,
  items: { data: [{ price: { id: 'price_m', recurring: { interval: 'month' } }, current_period_end: 1_791_000_000 }] },
  ...extra,
})

describe('webhook → table subscriptions', () => {
  it('convertit un abonnement en essai', () => {
    const l = ligneDepuisAbonnement(sub(), 'cab-1', new Date('2026-10-01T00:00:00Z'))
    expect(l).toEqual({
      cabinet_id: 'cab-1', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', statut: 'trialing', price_id: 'price_m',
      intervalle: 'month', trial_end: new Date(1_790_000_000_000).toISOString(), current_period_end: new Date(1_791_000_000_000).toISOString(),
      cancel_at_period_end: false, maj_le: '2026-10-01T00:00:00.000Z',
    })
  })
  it('client développé, annuel, sans essai, fin de période à l’ancien emplacement', () => {
    const l = ligneDepuisAbonnement(sub({
      customer: { id: 'cus_2' }, status: 'past_due', trial_end: null, current_period_end: 1_800_000_000,
      items: { data: [{ price: { id: 'price_a', recurring: { interval: 'year' } } }] },
    }), 'cab-2')
    expect(l).toMatchObject({ stripe_customer_id: 'cus_2', statut: 'past_due', intervalle: 'year', trial_end: null, current_period_end: new Date(1_800_000_000_000).toISOString() })
  })
  it('filtre les événements', () => {
    expect(evenementGere('invoice.payment_failed')).toBe(true)
    expect(evenementGere('charge.refunded')).toBe(false)
  })
})

describe('checkout', () => {
  it('jours d’essai : rien si nul, plafonné à 730', () => {
    expect(joursEssaiPourCheckout(0)).toBeUndefined()
    expect(joursEssaiPourCheckout(null)).toBeUndefined()
    expect(joursEssaiPourCheckout(34)).toBe(34)
    expect(joursEssaiPourCheckout(5000)).toBe(730)
  })
  it('refuse une redirection hors de l’application', () => {
    expect(() => validerCorps({ intervalle: 'month', retour: 'https://pirate.example/' }, 'https://releve.app/')).toThrow(ErreurEntree)
    expect(() => validerCorps({ intervalle: 'week' }, 'https://releve.app/')).toThrow(ErreurEntree)
    expect(validerCorps({ intervalle: 'year', retour: 'https://releve.app/#/compte' }, 'https://releve.app/')).toEqual({ intervalle: 'year', retour: 'https://releve.app/#/compte' })
    expect(validerCorps(undefined, 'https://releve.app/')).toEqual({ intervalle: 'month', retour: 'https://releve.app/' })
  })
  it('prix depuis l’environnement, erreur explicite sinon', () => {
    expect(prixPour('month', { mensuel: 'price_m' })).toBe('price_m')
    expect(() => prixPour('year', { mensuel: 'price_m' })).toThrow(/STRIPE_PRICE_ANNUEL/)
  })
  it('CORS limité à l’origine de l’application', () => {
    expect(enTetesCors('https://releve.app/chemin')['Access-Control-Allow-Origin']).toBe('https://releve.app')
  })
})
