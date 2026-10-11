import { useSyncExternalStore } from 'react'

/**
 * État de la démonstration modulaire : l'offre essayée (gratuite ou essai
 * Premium) et les retours de la personne, bloc par bloc. Tout reste dans le
 * navigateur ; rien n'est envoyé tant que la personne ne touche pas « Envoyer ».
 */
export type BlocId = 1 | 2 | 3 | 4 | 5
export const BLOCS_IDS: BlocId[] = [1, 2, 3, 4, 5]
/** Blocs réservés à l'offre Premium : verrouillés tant que l'essai n'est pas lancé. */
export const BLOCS_PREMIUM: BlocId[] = [3, 4]
export const JOURS_ESSAI = 14

export type Note = 'top' | 'bof' | 'non'
export type Offre = 'gratuite' | 'essai'
export type Profil = 'Titulaire' | 'Remplaçant' | 'Autre'
export type Prix = 'cher' | 'correct' | 'bon'

export interface EtatDemo {
  offre: Offre
  notes: Partial<Record<BlocId, Note>>
  /** Blocs ouverts au moins une fois. */
  vus: BlocId[]
  prix?: Prix
  profil?: Profil
  commentaire: string
  interetEncaissement: boolean
}

const CLE = 'releve:demo-blocs'
const vide = (): EtatDemo => ({ offre: 'gratuite', notes: {}, vus: [], commentaire: '', interetEncaissement: false })

const estBloc = (x: unknown): x is BlocId => typeof x === 'number' && (BLOCS_IDS as number[]).includes(x)
const estNote = (x: unknown): x is Note => x === 'top' || x === 'bof' || x === 'non'

/** Un contenu stocké est relu avec méfiance : on ne garde que ce qui a la bonne forme. */
export function validerEtat(brut: unknown): EtatDemo {
  const e = vide()
  if (typeof brut !== 'object' || brut === null) return e
  const o = brut as Record<string, unknown>
  if (o.offre === 'essai') e.offre = 'essai'
  if (typeof o.notes === 'object' && o.notes !== null) {
    for (const [k, v] of Object.entries(o.notes)) if (estBloc(Number(k)) && estNote(v)) e.notes[Number(k) as BlocId] = v
  }
  if (Array.isArray(o.vus)) e.vus = o.vus.filter(estBloc).filter((b, i, t) => t.indexOf(b) === i)
  if (o.prix === 'cher' || o.prix === 'correct' || o.prix === 'bon') e.prix = o.prix
  if (o.profil === 'Titulaire' || o.profil === 'Remplaçant' || o.profil === 'Autre') e.profil = o.profil
  if (typeof o.commentaire === 'string') e.commentaire = o.commentaire.slice(0, 500)
  e.interetEncaissement = o.interetEncaissement === true
  return e
}

let etat: EtatDemo | null = null
const abonnes = new Set<() => void>()

function charger(): EtatDemo {
  try {
    const brut = localStorage.getItem(CLE)
    return brut ? validerEtat(JSON.parse(brut)) : vide()
  } catch {
    return vide()
  }
}

export function lireEtat(): EtatDemo {
  if (!etat) etat = charger()
  return etat
}

function ecrire(suivant: EtatDemo) {
  etat = suivant
  try { localStorage.setItem(CLE, JSON.stringify(suivant)) } catch { /* mode privé : l'état reste en mémoire */ }
  abonnes.forEach(f => f())
}

/** Relit le stockage (utile après un changement fait ailleurs, et dans les tests). */
export function rechargerEtat() {
  etat = null
  abonnes.forEach(f => f())
}

const abonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f) } }
export const useDemo = (): EtatDemo => useSyncExternalStore(abonner, lireEtat, lireEtat)

export const choisirOffre = (offre: Offre) => ecrire({ ...lireEtat(), offre })
export const noter = (bloc: BlocId, note: Note) => ecrire({ ...lireEtat(), notes: { ...lireEtat().notes, [bloc]: note } })
export const definirPrix = (prix: Prix) => ecrire({ ...lireEtat(), prix })
export const definirProfil = (profil: Profil) => ecrire({ ...lireEtat(), profil })
export const definirCommentaire = (commentaire: string) => ecrire({ ...lireEtat(), commentaire: commentaire.slice(0, 500) })
export const basculerInteretEncaissement = () => ecrire({ ...lireEtat(), interetEncaissement: !lireEtat().interetEncaissement })
export function marquerBlocVu(bloc: BlocId) {
  const e = lireEtat()
  if (!e.vus.includes(bloc)) ecrire({ ...e, vus: [...e.vus, bloc] })
}
export const reinitialiserDemo = () => ecrire(vide())

export function estVerrouille(bloc: BlocId, offre: Offre): boolean {
  return offre === 'gratuite' && BLOCS_PREMIUM.includes(bloc)
}

export function progression(e: EtatDemo): { vus: number; notes: number; total: number } {
  return { vus: e.vus.length, notes: Object.keys(e.notes).length, total: BLOCS_IDS.length }
}
