import { describe, expect, it } from 'vitest'
import { avecParametre, enTetesCors, ErreurEntree, prixPour, validerCorps } from './entrees'

const APP = 'https://releve.app/'

describe('validerCorps', () => {
  it('prend le mensuel et l’accueil de l’application par défaut', () => {
    expect(validerCorps(undefined, APP)).toEqual({ intervalle: 'month', retour: APP })
  })

  it('accepte un retour vers l’application, fragment compris', () => {
    expect(validerCorps({ intervalle: 'year', retour: 'https://releve.app/#/compte' }, APP)).toEqual({
      intervalle: 'year',
      retour: 'https://releve.app/#/compte',
    })
  })

  it('refuse un intervalle inconnu', () => {
    expect(() => validerCorps({ intervalle: 'week' }, APP)).toThrow(ErreurEntree)
  })

  it.each([
    ['un autre site', 'https://pirate.example/'],
    ['un domaine qui commence comme le nôtre', 'https://releve.app.pirate.example/'],
    ['un faux identifiant dans l’adresse', 'https://releve.app@pirate.example/'],
    ['un autre protocole', 'http://releve.app/'],
    ['un script', 'javascript:alert(1)'],
    ['une adresse relative', '/compte'],
  ])('refuse le retour vers %s', (_, retour) => {
    expect(() => validerCorps({ retour }, APP)).toThrow('URL de retour non autorisée')
  })

  it('refuse un retour démesuré', () => {
    expect(() => validerCorps({ retour: `${APP}#/${'a'.repeat(600)}` }, APP)).toThrow('trop longue')
  })

  it('refuse tout retour tant que APP_URL n’est pas configurée', () => {
    expect(() => validerCorps({ retour: APP }, '')).toThrow(ErreurEntree)
  })

  it('compare les origines, pas les débuts de texte : APP_URL sans barre finale suffit', () => {
    expect(validerCorps({ retour: 'https://releve.app/#/compte' }, 'https://releve.app').retour).toBe('https://releve.app/#/compte')
    expect(() => validerCorps({ retour: 'https://releve.app.pirate.example/' }, 'https://releve.app')).toThrow(ErreurEntree)
  })
})

describe('avecParametre', () => {
  it('place la requête avant le fragment, que l’application utilise pour son routage', () => {
    expect(avecParametre('https://releve.app/#/compte', 'paiement', 'ok')).toBe('https://releve.app/?paiement=ok#/compte')
  })

  it('conserve les paramètres existants et remplace le même nom', () => {
    expect(avecParametre('https://releve.app/?a=1&paiement=non#/compte', 'paiement', 'ok')).toBe('https://releve.app/?a=1&paiement=ok#/compte')
  })
})

describe('prixPour', () => {
  it('lit le prix demandé, erreur explicite s’il manque', () => {
    expect(prixPour('month', { mensuel: 'price_m' })).toBe('price_m')
    expect(prixPour('year', { annuel: 'price_a' })).toBe('price_a')
    expect(() => prixPour('year', { mensuel: 'price_m' })).toThrow(/STRIPE_PRICE_ANNUEL/)
  })
})

describe('enTetesCors', () => {
  it('limite l’accès à l’origine de l’application', () => {
    expect(enTetesCors('https://releve.app/chemin')['Access-Control-Allow-Origin']).toBe('https://releve.app')
  })

  it('reste ouvert sans APP_URL, pour l’essai en local', () => {
    expect(enTetesCors('')['Access-Control-Allow-Origin']).toBe('*')
  })
})
