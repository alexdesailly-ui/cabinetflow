import { dansNJours, genererCode } from './domain'
import { id, maintenant, mutate, type Etat } from './store'
import type { Account, Contrat, FicheTournee, Invitation, LigneRetrocession, Mission, Recommandation, Role } from './types'

/** Toutes les écritures passent ici : les écrans ne manipulent jamais l'état. */

export function creerCompte(donnees: Omit<Account, 'id' | 'creeLe' | 'codeParrain' | 'plan' | 'moisOfferts' | 'departement'> & { role: Role }): string {
  const nouvelId = id(donnees.role === 'cabinet' ? 'cab-' : 'rmp-')
  mutate(e => {
    const parrain = donnees.parrainePar ? e.accounts.find(a => a.codeParrain === donnees.parrainePar) : undefined
    const compte: Account = {
      ...donnees,
      id: nouvelId,
      creeLe: maintenant(),
      departement: donnees.codePostal.slice(0, 2),
      codeParrain: genererCode(donnees.prenom, donnees.nom),
      plan: donnees.role === 'cabinet' ? 'essai' : 'gratuit',
      // Le filleul gagne son mois offert dès l'inscription : la promesse est tenue tout de suite.
      moisOfferts: parrain && donnees.role === 'cabinet' ? 1 : 0,
      parrainePar: parrain?.codeParrain,
    }
    e.accounts.push(compte)
    e.session = nouvelId
    if (parrain) {
      // On rattache l'invitation en attente si elle existe, sinon on en crée une.
      const attente = e.invitations.find(i => i.parId === parrain.id && !i.filleulId && i.canal === 'lien')
      if (attente) attente.filleulId = nouvelId
      else e.invitations.push({ id: id('inv-'), parId: parrain.id, nom: `${compte.prenom} ${compte.nom}`, canal: 'lien', le: maintenant(), filleulId: nouvelId })
    }
  })
  return nouvelId
}

export function seConnecter(idCompte: string) { mutate(e => { e.session = idCompte }) }
export function seDeconnecter() { mutate(e => { e.session = null }) }

export function majCompte(idCompte: string, patch: Partial<Account>) {
  mutate(e => { const a = e.accounts.find(x => x.id === idCompte); if (a) Object.assign(a, patch) })
}

export function enregistrerMission(m: Omit<Mission, 'id'> & { id?: string }): string {
  const mid = m.id ?? id('mis-')
  mutate(e => {
    const idx = e.missions.findIndex(x => x.id === mid)
    const mission: Mission = { ...m, id: mid }
    if (idx >= 0) e.missions[idx] = mission; else e.missions.push(mission)
  })
  return mid
}

export function publierMission(mid: string) {
  mutate(e => { const m = e.missions.find(x => x.id === mid); if (m) { m.statut = 'publiee'; m.publieeLe = maintenant() } })
}

export function candidater(mid: string, remplacantId: string, message: string) {
  mutate(e => {
    if (e.candidatures.some(c => c.missionId === mid && c.remplacantId === remplacantId)) return
    e.candidatures.push({ id: id('cand-'), missionId: mid, remplacantId, message, envoyeeLe: maintenant(), statut: 'envoyee' })
  })
}

/** Retenir un remplaçant crée le contrat en brouillon, à signer par les deux parties. */
export function retenir(mid: string, remplacantId: string) {
  mutate(e => {
    const m = e.missions.find(x => x.id === mid); if (!m) return
    m.remplacantRetenuId = remplacantId
    m.statut = 'pourvue'
    for (const c of e.candidatures.filter(c => c.missionId === mid)) c.statut = c.remplacantId === remplacantId ? 'retenue' : 'ecartee'
    if (!e.contrats.some(c => c.missionId === mid)) {
      const contrat: Contrat = {
        id: id('ctr-'), missionId: mid, cabinetId: m.cabinetId, remplacantId,
        creeLe: maintenant(), retrocessionPct: m.retrocessionPct,
        echeanceReversement: dansNJours(Math.max(1, Math.round((new Date(m.au).getTime() - Date.now()) / 86_400_000) + 15)),
        clauseNonConcurrence: false,
      }
      e.contrats.push(contrat)
    }
  })
}

export function majContrat(cid: string, patch: Partial<Contrat>) {
  mutate(e => { const c = e.contrats.find(x => x.id === cid); if (c) Object.assign(c, patch) })
}

export function signer(cid: string, parId: string, saisie: string) {
  mutate(e => {
    const c = e.contrats.find(x => x.id === cid); if (!c) return
    const sig = { parId, le: maintenant(), saisie }
    if (parId === c.cabinetId) c.signatureTitulaire = sig
    if (parId === c.remplacantId) c.signatureRemplacant = sig
    // Le filleul devient « actif » à sa première signature : c'est le moment où le parrain est récompensé.
    const filleul = e.accounts.find(a => a.id === parId)
    if (filleul?.parrainePar) {
      const parrain = e.accounts.find(a => a.codeParrain === filleul.parrainePar)
      const inv = e.invitations.find(i => i.filleulId === parId)
      if (parrain && inv && !inv.actifLe) {
        inv.actifLe = maintenant()
        if (parrain.role === 'cabinet') parrain.moisOfferts += 1
      }
    }
  })
}

export function transmettreCDOI(cid: string) { majContrat(cid, { transmisCDOILe: maintenant() }) }

export function enregistrerFiche(f: FicheTournee) {
  mutate(e => {
    const idx = e.fiches.findIndex(x => x.missionId === f.missionId)
    const fiche = { ...f, majLe: maintenant() }
    if (idx >= 0) e.fiches[idx] = fiche; else e.fiches.push(fiche)
  })
}

export function ajouterLigne(l: Omit<LigneRetrocession, 'id'>) {
  mutate(e => { e.lignes.push({ ...l, id: id('lg-') }) })
}
export function marquerPayee(lid: string) {
  mutate(e => { const l = e.lignes.find(x => x.id === lid); if (l) l.payeeLe = maintenant() })
}

export function recommander(r: Omit<Recommandation, 'id' | 'le'>) {
  mutate(e => {
    if (e.recos.some(x => x.contratId === r.contratId && x.deId === r.deId)) return
    e.recos.push({ ...r, id: id('reco-'), le: maintenant() })
  })
}

export function inviter(parId: string, nom: string, canal: Invitation['canal']) {
  mutate(e => { e.invitations.push({ id: id('inv-'), parId, nom, canal, le: maintenant() }) })
}

export function attribuerBadges(idCompte: string, keys: string[]) {
  mutate(e => {
    e.badges[idCompte] = e.badges[idCompte] ?? []
    for (const k of keys) if (!e.badges[idCompte].some(b => b.key === k)) e.badges[idCompte].push({ key: k, le: maintenant() })
  })
}

/** Utilitaire de démo : simule qu'un filleul en attente vient de s'inscrire puis de signer. */
export function simulerActivationFilleul(invId: string) {
  mutate((e: Etat) => {
    const inv = e.invitations.find(i => i.id === invId); if (!inv) return
    const parrain = e.accounts.find(a => a.id === inv.parId); if (!parrain) return
    if (!inv.filleulId) {
      const [prenom, ...reste] = inv.nom.replace(/\(.*\)/, '').trim().split(' ')
      const nouveau: Account = {
        id: id('cab-'), role: 'cabinet', creeLe: maintenant(), prenom, nom: reste.join(' ') || 'Cabinet',
        email: '', ville: parrain.ville, codePostal: parrain.codePostal, departement: parrain.departement,
        codeParrain: genererCode(prenom, reste.join(' ') || 'CAB'), parrainePar: parrain.codeParrain, plan: 'essai', moisOfferts: 1,
      }
      e.accounts.push(nouveau)
      inv.filleulId = nouveau.id
    }
    if (!inv.actifLe) { inv.actifLe = maintenant(); if (parrain.role === 'cabinet') parrain.moisOfferts += 1 }
  })
}
