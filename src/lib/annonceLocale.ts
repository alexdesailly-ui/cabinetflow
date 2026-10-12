import { decoderAnnonce, encoderAnnonce, type Annonce } from './annonce'

/**
 * Ce que l'outil retient sur l'appareil du cabinet : ses coordonnées, pour ne pas les retaper, et
 * la dernière annonce envoyée, pour relancer plus tard. Rien ne quitte l'appareil. Le stockage peut
 * être absent ou refusé (navigation privée) : l'outil fonctionne alors sans mémoire.
 */
export interface Coordonnees {
  cabinet: string
  ville: string
  tel: string
}

export interface AnnonceEnvoyee {
  annonce: Annonce
  /** Instant d'envoi, ISO 8601. */
  envoyeeLe: string
  pourvue: boolean
}

const CLE_COORDONNEES = 'releve:coordonnees'
const CLE_ANNONCE = 'releve:derniere-annonce'

function lire(cle: string): unknown {
  try {
    const brut = localStorage.getItem(cle)
    return brut === null ? null : JSON.parse(brut)
  } catch {
    return null
  }
}

function ecrire(cle: string, valeur: unknown) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur))
  } catch {
    /* stockage refusé : tant pis, rien n'est retenu */
  }
}

const texte = (valeur: unknown): string => (typeof valeur === 'string' ? valeur : '')

export function lireCoordonnees(): Coordonnees | null {
  const brut = lire(CLE_COORDONNEES)
  if (typeof brut !== 'object' || brut === null) return null
  const o = brut as Record<string, unknown>
  return { cabinet: texte(o.cabinet), ville: texte(o.ville), tel: texte(o.tel) }
}

export function ecrireCoordonnees(coordonnees: Coordonnees) {
  ecrire(CLE_COORDONNEES, coordonnees)
}

/** L'annonce est stockée sous la forme de son lien : elle est revalidée à chaque lecture. */
export function lireAnnonceEnvoyee(): AnnonceEnvoyee | null {
  const brut = lire(CLE_ANNONCE)
  if (typeof brut !== 'object' || brut === null) return null
  const o = brut as Record<string, unknown>
  const annonce = typeof o.code === 'string' ? decoderAnnonce(o.code) : null
  if (!annonce || typeof o.envoyeeLe !== 'string' || Number.isNaN(Date.parse(o.envoyeeLe)))
    return null
  return { annonce, envoyeeLe: o.envoyeeLe, pourvue: o.pourvue === true }
}

export function ecrireAnnonceEnvoyee({ annonce, envoyeeLe, pourvue }: AnnonceEnvoyee) {
  ecrire(CLE_ANNONCE, { code: encoderAnnonce(annonce), envoyeeLe, pourvue })
}

export function oublierAnnonceEnvoyee() {
  try {
    localStorage.removeItem(CLE_ANNONCE)
  } catch {
    /* rien à effacer */
  }
}
