import { describe, expect, it } from 'vitest'
import type { AbonnementStripe, LigneAbonnement } from './abonnement'
import { EVENEMENTS_GERES, type EvenementStripe, type PortsWebhook, referencesDepuisEvenement, traiterEvenement } from './webhook'

const abonnement = (extra: Partial<AbonnementStripe> = {}): AbonnementStripe => ({
  id: 'sub_1',
  customer: 'cus_1',
  status: 'active',
  cancel_at_period_end: false,
  trial_end: null,
  items: { data: [{ price: { id: 'price_m', recurring: { interval: 'month' } }, current_period_end: 1_791_000_000 }] },
  metadata: { cabinet_id: 'cab-1' },
  ...extra,
})

const evenement = (type: string, objet: object, id = 'evt_1'): EvenementStripe => ({ id, type, data: { object: objet } })
const miseAJour = evenement('customer.subscription.updated', { id: 'sub_1' })

/** Ports en mémoire : la base et Stripe sont remplacés par des tableaux. */
function ports(surcharges: Partial<PortsWebhook> = {}) {
  const journal: string[] = []
  const ecritures: LigneAbonnement[] = []
  const traites = new Set<string>()
  const p: PortsWebhook = {
    dejaTraite: async id => traites.has(id),
    lireAbonnement: async () => {
      journal.push('lecture')
      return abonnement()
    },
    cabinetDuClient: async () => undefined,
    enregistrer: async ligne => {
      ecritures.push(ligne)
      return 'ecrit'
    },
    marquerTraite: async id => {
      traites.add(id)
    },
    maintenant: () => {
      journal.push('horloge')
      return new Date('2026-10-12T10:00:00Z')
    },
    ...surcharges,
  }
  return { p, journal, ecritures, traites }
}

describe('referencesDepuisEvenement', () => {
  it('session de paiement : abonnement et cabinet viennent de la session', () => {
    const refs = referencesDepuisEvenement(evenement('checkout.session.completed', { subscription: 'sub_9', client_reference_id: 'cab-9' }))
    expect(refs).toEqual({ abonnementId: 'sub_9', cabinetId: 'cab-9' })
  })

  it('événement d’abonnement : l’objet est l’abonnement', () => {
    expect(referencesDepuisEvenement(miseAJour)).toEqual({ abonnementId: 'sub_1' })
  })

  it('facture : abonnement à la racine (ancienne API) ou sous « parent » (API récente)', () => {
    expect(referencesDepuisEvenement(evenement('invoice.paid', { subscription: 'sub_2' })).abonnementId).toBe('sub_2')
    expect(referencesDepuisEvenement(evenement('invoice.paid', { parent: { subscription_details: { subscription: 'sub_3' } } })).abonnementId).toBe('sub_3')
  })

  it('accepte une référence développée en objet', () => {
    expect(referencesDepuisEvenement(evenement('invoice.paid', { subscription: { id: 'sub_4' } })).abonnementId).toBe('sub_4')
  })

  it('facture sans abonnement : rien', () => {
    expect(referencesDepuisEvenement(evenement('invoice.paid', { subscription: null }))).toEqual({ abonnementId: undefined })
  })
})

describe('traiterEvenement', () => {
  it('écrit l’abonnement du cabinet et marque l’événement', async () => {
    const { p, ecritures, traites } = ports()
    expect(await traiterEvenement(miseAJour, p)).toBe('enregistre')
    expect(ecritures).toHaveLength(1)
    expect(ecritures[0]).toMatchObject({ cabinet_id: 'cab-1', stripe_subscription_id: 'sub_1', statut: 'active', maj_le: '2026-10-12T10:00:00.000Z' })
    expect(traites.has('evt_1')).toBe(true)
  })

  it('date l’écriture après la lecture chez Stripe, pour que la plus récente l’emporte', async () => {
    const { p, journal } = ports()
    await traiterEvenement(miseAJour, p)
    expect(journal).toEqual(['lecture', 'horloge'])
  })

  it('ignore sans rien lire les événements que l’on ne gère pas', async () => {
    const { p, journal } = ports()
    expect(await traiterEvenement(evenement('charge.refunded', {}), p)).toBe('ignore')
    expect(journal).toEqual([])
  })

  it('gère tous les événements annoncés dans la documentation d’exploitation', () => {
    expect([...EVENEMENTS_GERES].sort()).toEqual([
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.deleted',
      'customer.subscription.trial_will_end',
      'customer.subscription.updated',
      'invoice.paid',
      'invoice.payment_failed',
    ])
  })

  it('une seconde livraison du même événement ne refait rien', async () => {
    const { p, ecritures } = ports()
    await traiterEvenement(miseAJour, p)
    expect(await traiterEvenement(miseAJour, p)).toBe('deja-traite')
    expect(ecritures).toHaveLength(1)
  })

  it('une facture sans abonnement est acquittée sans effet', async () => {
    const { p, ecritures } = ports()
    expect(await traiterEvenement(evenement('invoice.paid', { subscription: null }), p)).toBe('sans-abonnement')
    expect(ecritures).toEqual([])
  })

  it('le cabinet de la session de paiement prime sur les métadonnées', async () => {
    const { p, ecritures } = ports()
    await traiterEvenement(evenement('checkout.session.completed', { subscription: 'sub_1', client_reference_id: 'cab-session' }), p)
    expect(ecritures[0]?.cabinet_id).toBe('cab-session')
  })

  it('retrouve le cabinet par le client Stripe quand les métadonnées manquent', async () => {
    const { p, ecritures } = ports({
      lireAbonnement: async () => abonnement({ metadata: undefined }),
      cabinetDuClient: async client => (client === 'cus_1' ? 'cab-connu' : undefined),
    })
    await traiterEvenement(miseAJour, p)
    expect(ecritures[0]?.cabinet_id).toBe('cab-connu')
  })

  it('laisse de côté un abonnement qui n’est pas de l’application, sans le marquer', async () => {
    const { p, ecritures, traites } = ports({ lireAbonnement: async () => abonnement({ metadata: undefined }) })
    expect(await traiterEvenement(miseAJour, p)).toBe('hors-application')
    expect(ecritures).toEqual([])
    expect(traites.size).toBe(0)
  })

  it('marque l’événement même quand l’écriture était périmée', async () => {
    const { p, traites } = ports({ enregistrer: async () => 'obsolete' })
    expect(await traiterEvenement(miseAJour, p)).toBe('obsolete')
    expect(traites.has('evt_1')).toBe(true)
  })

  it('acquitte un cabinet supprimé sans marquer l’événement', async () => {
    const { p, traites } = ports({ enregistrer: async () => 'cabinet-inconnu' })
    expect(await traiterEvenement(miseAJour, p)).toBe('cabinet-inconnu')
    expect(traites.size).toBe(0)
  })

  it('relance l’erreur de Stripe : l’événement n’est pas marqué et Stripe le renverra', async () => {
    const { p, traites } = ports({
      lireAbonnement: async () => {
        throw new Error('Stripe indisponible')
      },
    })
    await expect(traiterEvenement(miseAJour, p)).rejects.toThrow('Stripe indisponible')
    expect(traites.size).toBe(0)
  })

  it('relance l’erreur d’écriture en base sans marquer l’événement', async () => {
    const { p, traites } = ports({
      enregistrer: async () => {
        throw new Error('base indisponible')
      },
    })
    await expect(traiterEvenement(miseAJour, p)).rejects.toThrow('base indisponible')
    expect(traites.size).toBe(0)
  })

  it('relance l’erreur de lecture des événements déjà traités plutôt que de les perdre', async () => {
    const { p } = ports({
      dejaTraite: async () => {
        throw new Error('base indisponible')
      },
    })
    await expect(traiterEvenement(miseAJour, p)).rejects.toThrow('base indisponible')
  })
})
