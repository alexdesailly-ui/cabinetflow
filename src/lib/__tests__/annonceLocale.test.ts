import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encoderAnnonce, type Annonce } from '../annonce'
import {
  ecrireAnnonceEnvoyee,
  ecrireCoordonnees,
  lireAnnonceEnvoyee,
  lireCoordonnees,
  oublierAnnonceEnvoyee,
} from '../annonceLocale'

/** localStorage minimal : les tests tournent sous Node. */
function brancherStockage(initial: Record<string, string> = {}) {
  const donnees = new Map(Object.entries(initial))
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (cle: string) => donnees.get(cle) ?? null,
    setItem: (cle: string, valeur: string) => void donnees.set(cle, valeur),
    removeItem: (cle: string) => void donnees.delete(cle),
  }
  return donnees
}

const annonce: Annonce = {
  cabinet: 'Cabinet des Tilleuls',
  ville: 'Angers',
  du: '2026-10-26',
  au: '2026-11-08',
  tel: '33612345678',
}

beforeEach(() => void brancherStockage())
afterEach(() => void delete (globalThis as { localStorage?: unknown }).localStorage)

describe('coordonnées du cabinet', () => {
  it('rien tant que rien n’a été écrit', () => {
    expect(lireCoordonnees()).toBeNull()
  })

  it('se relisent telles qu’écrites', () => {
    const coordonnees = { cabinet: 'Cabinet des Tilleuls', ville: 'Angers', tel: '06 12 34 56 78' }
    ecrireCoordonnees(coordonnees)
    expect(lireCoordonnees()).toEqual(coordonnees)
  })

  it('ignorent un contenu corrompu', () => {
    brancherStockage({ 'releve:coordonnees': '{pas du json' })
    expect(lireCoordonnees()).toBeNull()
    brancherStockage({ 'releve:coordonnees': JSON.stringify({ cabinet: 42, ville: null }) })
    expect(lireCoordonnees()).toEqual({ cabinet: '', ville: '', tel: '' })
  })
})

describe('dernière annonce envoyée', () => {
  it('se relit, revalidée, avec son état', () => {
    ecrireAnnonceEnvoyee({ annonce, envoyeeLe: '2026-10-12T08:00:00.000Z', pourvue: false })
    expect(lireAnnonceEnvoyee()).toEqual({
      annonce,
      envoyeeLe: '2026-10-12T08:00:00.000Z',
      pourvue: false,
    })
    ecrireAnnonceEnvoyee({ annonce, envoyeeLe: '2026-10-12T08:00:00.000Z', pourvue: true })
    expect(lireAnnonceEnvoyee()?.pourvue).toBe(true)
  })

  it('s’efface', () => {
    ecrireAnnonceEnvoyee({ annonce, envoyeeLe: '2026-10-12T08:00:00.000Z', pourvue: false })
    oublierAnnonceEnvoyee()
    expect(lireAnnonceEnvoyee()).toBeNull()
  })

  it.each([
    ['du JSON cassé', '{pas du json'],
    [
      'un code piégé',
      JSON.stringify({ code: 'AAAA', envoyeeLe: '2026-10-12T08:00:00Z', pourvue: false }),
    ],
    [
      'un instant illisible',
      JSON.stringify({ code: encoderAnnonce(annonce), envoyeeLe: 'hier', pourvue: false }),
    ],
    ['un tableau', '[1,2]'],
  ])('ignore %s', (_, contenu) => {
    brancherStockage({ 'releve:derniere-annonce': contenu })
    expect(lireAnnonceEnvoyee()).toBeNull()
  })
})

describe('sans stockage (navigation privée)', () => {
  it('ne plante jamais et ne retient rien', () => {
    delete (globalThis as { localStorage?: unknown }).localStorage
    expect(() => ecrireCoordonnees({ cabinet: 'a', ville: 'b', tel: 'c' })).not.toThrow()
    expect(() =>
      ecrireAnnonceEnvoyee({ annonce, envoyeeLe: '2026-10-12T08:00:00Z', pourvue: false }),
    ).not.toThrow()
    expect(() => oublierAnnonceEnvoyee()).not.toThrow()
    expect(lireCoordonnees()).toBeNull()
    expect(lireAnnonceEnvoyee()).toBeNull()
  })

  it('supporte un stockage qui refuse les écritures', () => {
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
      removeItem: () => undefined,
    }
    expect(() => ecrireCoordonnees({ cabinet: 'a', ville: 'b', tel: 'c' })).not.toThrow()
  })
})
