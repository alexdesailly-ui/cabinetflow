import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  type AbonnementStripe, abonnementRetenu, joursEssaiPourCheckout, ligneDepuisAbonnement, ligneProvisoire, STATUTS_ABONNEMENT, STATUTS_EN_COURS,
} from './abonnement'

const abonnement = (extra: Partial<AbonnementStripe> = {}): AbonnementStripe => ({
  id: 'sub_1',
  customer: 'cus_1',
  status: 'trialing',
  cancel_at_period_end: false,
  trial_end: 1_790_000_000,
  items: { data: [{ price: { id: 'price_m', recurring: { interval: 'month' } }, current_period_end: 1_791_000_000 }] },
  ...extra,
})

const migration = (fichier: string) => readFileSync(new URL(`../../migrations/${fichier}`, import.meta.url), 'utf8')

describe('ligneDepuisAbonnement', () => {
  it('convertit un abonnement en essai', () => {
    expect(ligneDepuisAbonnement(abonnement(), 'cab-1', new Date('2026-10-01T00:00:00Z'))).toEqual({
      cabinet_id: 'cab-1',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      statut: 'trialing',
      price_id: 'price_m',
      intervalle: 'month',
      trial_end: new Date(1_790_000_000_000).toISOString(),
      current_period_end: new Date(1_791_000_000_000).toISOString(),
      cancel_at_period_end: false,
      maj_le: '2026-10-01T00:00:00.000Z',
    })
  })

  it('accepte un client développé, un tarif annuel, aucun essai et la fin de période à l’ancien emplacement', () => {
    const ligne = ligneDepuisAbonnement(
      abonnement({
        customer: { id: 'cus_2' },
        status: 'past_due',
        trial_end: null,
        current_period_end: 1_800_000_000,
        items: { data: [{ price: { id: 'price_a', recurring: { interval: 'year' } } }] },
      }),
      'cab-2',
      new Date(0),
    )
    expect(ligne).toMatchObject({
      stripe_customer_id: 'cus_2',
      statut: 'past_due',
      intervalle: 'year',
      trial_end: null,
      current_period_end: new Date(1_800_000_000_000).toISOString(),
    })
  })

  it('ne devine pas un intervalle inconnu', () => {
    const ligne = ligneDepuisAbonnement(abonnement({ items: { data: [{ price: { id: 'p', recurring: { interval: 'week' } } }] } }), 'cab-1', new Date(0))
    expect(ligne.intervalle).toBeNull()
  })
})

describe('ligneProvisoire', () => {
  it('précède tout abonnement et cède la place au premier', () => {
    expect(ligneProvisoire('cab-1', 'cus_1')).toMatchObject({
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: null,
      statut: 'incomplete',
      maj_le: '1970-01-01T00:00:00.000Z',
    })
  })
})

describe('abonnementRetenu', () => {
  it('préfère un abonnement en cours à un abonnement résilié plus récent', () => {
    const ancienActif = abonnement({ id: 'sub_a', status: 'active', created: 100 })
    const recentResilie = abonnement({ id: 'sub_b', status: 'canceled', created: 200 })
    expect(abonnementRetenu([recentResilie, ancienActif])?.id).toBe('sub_a')
  })

  it('à état égal, retient le plus récent', () => {
    const premier = abonnement({ id: 'sub_a', status: 'canceled', created: 100 })
    const second = abonnement({ id: 'sub_b', status: 'canceled', created: 200 })
    expect(abonnementRetenu([premier, second])?.id).toBe('sub_b')
  })

  it('ne retient rien quand il n’y a aucun abonnement', () => {
    expect(abonnementRetenu([])).toBeUndefined()
  })
})

describe('joursEssaiPourCheckout', () => {
  it('n’envoie rien quand l’essai est épuisé, plafonne à 730 jours', () => {
    expect(joursEssaiPourCheckout(0)).toBeUndefined()
    expect(joursEssaiPourCheckout(null)).toBeUndefined()
    expect(joursEssaiPourCheckout(34)).toBe(34)
    expect(joursEssaiPourCheckout(33.9)).toBe(33)
    expect(joursEssaiPourCheckout(5000)).toBe(730)
  })
})

describe('accord avec la base', () => {
  it('les statuts du code sont ceux que la table accepte', () => {
    const liste = /statut text not null default 'incomplete' check \(statut in \(([^)]*)\)/.exec(migration('20261001000150_abonnements.sql'))?.[1]
    const attendus = [...(liste ?? '').matchAll(/'([a-z_]+)'/g)].map(m => m[1])
    expect([...STATUTS_ABONNEMENT].sort()).toEqual(attendus.sort())
  })

  it('les statuts « en cours » sont ceux qui ouvrent l’accès payant', () => {
    const liste = /s\.statut in \(([^)]*)\)/.exec(migration('20261001000200_securite_rls.sql'))?.[1]
    const attendus = [...(liste ?? '').matchAll(/'([a-z_]+)'/g)].map(m => m[1])
    expect([...STATUTS_EN_COURS].sort()).toEqual(attendus.sort())
  })
})
