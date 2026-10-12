/**
 * Entrées des Edge Functions : validation du corps de requête, adresses de retour, CORS.
 * Fonctions pures, testées par Vitest (entrees.test.ts).
 */

export class ErreurEntree extends Error {
  override name = 'ErreurEntree'
}

export type Intervalle = 'month' | 'year'

export interface CorpsPaiement {
  intervalle: Intervalle
  retour: string
}

const memeOrigine = (a: string, b: string): boolean => {
  try {
    return new URL(a).origin === new URL(b).origin
  } catch {
    return false
  }
}

/** Seul un retour vers l'application elle-même est accepté : pas de redirection ouverte après paiement. */
export function validerCorps(corps: unknown, urlApp: string): CorpsPaiement {
  const brut = (corps ?? {}) as Record<string, unknown>
  const intervalle = brut.intervalle ?? 'month'
  if (intervalle !== 'month' && intervalle !== 'year') throw new ErreurEntree('intervalle invalide')
  const retour = typeof brut.retour === 'string' ? brut.retour : urlApp
  if (retour.length > 500) throw new ErreurEntree('URL de retour trop longue')
  if (!memeOrigine(retour, urlApp)) throw new ErreurEntree('URL de retour non autorisée')
  return { intervalle, retour }
}

/** Ajoute un paramètre avant le « # » : l'application route sur le fragment, la requête reste lisible. */
export function avecParametre(url: string, nom: string, valeur: string): string {
  const adresse = new URL(url)
  adresse.searchParams.set(nom, valeur)
  return adresse.toString()
}

export function prixPour(
  intervalle: Intervalle,
  prix: { mensuel?: string; annuel?: string },
): string {
  const retenu = intervalle === 'year' ? prix.annuel : prix.mensuel
  if (!retenu)
    throw new Error(
      `Prix Stripe manquant pour « ${intervalle} » (STRIPE_PRICE_${intervalle === 'year' ? 'ANNUEL' : 'MENSUEL'})`,
    )
  return retenu
}

/** CORS limité à l'origine de l'application ; sans APP_URL (essai local), toute origine. */
export function enTetesCors(urlApp: string): Record<string, string> {
  let origine = '*'
  try {
    origine = new URL(urlApp).origin
  } catch {
    /* APP_URL absente */
  }
  return {
    'Access-Control-Allow-Origin': origine,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}
