import { useSyncExternalStore } from 'react'
import type {
  Account, Candidature, Contrat, FicheTournee, Invitation, LigneRetrocession,
  Mission, Recommandation,
} from './types'

/**
 * Store local (navigateur). L'application est volontairement « local-first » :
 * un lien de test peut être partagé publiquement à des confrères sans backend.
 * L'interface `mutate`/`useStore` est le seul point de contact des écrans avec
 * les données : brancher une base distante ne touche que ce fichier.
 */

export interface Etat {
  version: 1
  session: string | null
  accounts: Account[]
  missions: Mission[]
  candidatures: Candidature[]
  contrats: Contrat[]
  lignes: LigneRetrocession[]
  recos: Recommandation[]
  fiches: FicheTournee[]
  invitations: Invitation[]
  /** Badges débloqués par compte. */
  badges: Record<string, { key: string; le: string }[]>
  /** Date à laquelle la démo a été générée : permet de dater les alertes. */
  seedeLe?: string
}

const CLE = 'releve:v1'

const vide: Etat = {
  version: 1,
  session: null,
  accounts: [], missions: [], candidatures: [], contrats: [], lignes: [],
  recos: [], fiches: [], invitations: [], badges: {},
}

function lire(): Etat {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) return { ...vide }
    const e = JSON.parse(brut) as Etat
    if (e.version !== 1) return { ...vide }
    return { ...vide, ...e }
  } catch {
    return { ...vide }
  }
}

let etat: Etat = lire()
const abonnes = new Set<() => void>()

function ecrire() {
  try { localStorage.setItem(CLE, JSON.stringify(etat)) } catch { /* mode privé : on continue en mémoire */ }
  abonnes.forEach(f => f())
}

export function getEtat(): Etat { return etat }

export function mutate(fn: (e: Etat) => Etat | void) {
  const copie: Etat = JSON.parse(JSON.stringify(etat))
  const resultat = fn(copie)
  etat = resultat ?? copie
  ecrire()
}

export function reinitialiser() {
  etat = { ...vide }
  ecrire()
}

export function useStore(): Etat {
  return useSyncExternalStore(
    cb => { abonnes.add(cb); return () => abonnes.delete(cb) },
    () => etat,
  )
}

export function id(prefixe = ''): string {
  return prefixe + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)
}

export function maintenant(): string { return new Date().toISOString() }

/* Sélecteurs ------------------------------------------------------- */

export function compteCourant(e: Etat): Account | null {
  return e.accounts.find(a => a.id === e.session) ?? null
}

export function compte(e: Etat, idCompte?: string): Account | undefined {
  return e.accounts.find(a => a.id === idCompte)
}

export function missionsDuCabinet(e: Etat, cabinetId: string): Mission[] {
  return e.missions.filter(m => m.cabinetId === cabinetId).sort((a, b) => a.du.localeCompare(b.du))
}

export function contratsDuRemplacant(e: Etat, remplacantId: string) {
  return e.contrats
    .filter(c => c.remplacantId === remplacantId && c.signatureRemplacant && c.signatureTitulaire)
    .map(contrat => ({ contrat, mission: e.missions.find(m => m.id === contrat.missionId)! }))
    .filter(x => x.mission)
}

export function recosVers(e: Etat, idCompte: string): Recommandation[] {
  return e.recos.filter(r => r.versId === idCompte)
}

export function invitationsDe(e: Etat, idCompte: string): Invitation[] {
  return e.invitations.filter(i => i.parId === idCompte).sort((a, b) => b.le.localeCompare(a.le))
}

export function nbFilleulsActifs(e: Etat, idCompte: string): number {
  return invitationsDe(e, idCompte).filter(i => i.actifLe).length
}

export function contratDeMission(e: Etat, missionId: string): Contrat | undefined {
  return e.contrats.find(c => c.missionId === missionId)
}
