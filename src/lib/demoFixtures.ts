import { texteContrat } from './contrat'
import { controlerAffectation, dansNJours, type Controle } from './domain'
import type { Account, Contrat, Mission, Piece } from './types'

/**
 * Personnes et dossier fictifs des blocs de démonstration. Les contrôles et le
 * contrat passent par les mêmes fonctions que l'application : ce que la
 * démonstration montre est ce que le produit fait.
 */
export const DEBUT_PAR_DEFAUT = 45
export const DUREE_PAR_DEFAUT = 14

const maintenant = () => new Date().toISOString()
const piece = (key: Piece['key'], reference: string, expireDans?: number): Piece => ({
  key, reference, fournieLe: maintenant(), expireLe: expireDans === undefined ? undefined : dansNJours(expireDans),
})

function remplacant(b: { id: string; prenom: string; nom: string; ville: string; codePostal: string; pieces: Piece[]; soins: string[]; experience: number }): Account {
  return {
    id: b.id, role: 'remplacant', creeLe: maintenant(), prenom: b.prenom, nom: b.nom,
    email: `${b.prenom}.${b.nom}@exemple.fr`.toLowerCase(), ville: b.ville, codePostal: b.codePostal, departement: b.codePostal.slice(0, 2),
    codeParrain: `${b.prenom.slice(0, 3)}${b.nom.slice(0, 3)}-1`.toUpperCase(), plan: 'gratuit', moisOfferts: 0,
    pieces: b.pieces, soinsMaitrises: b.soins, anneesExperience: b.experience,
  }
}

const SOINS_REQUIS = ['Pansements complexes', 'Diabète / insuline', 'Perfusions / PICC']

export interface MondeDemo {
  cabinet: Account
  /** Julien (en règle), Amina (autorisation trop courte), Thomas (assurance absente). */
  candidats: Account[]
  mission: Mission
  contrat: Contrat
}

export function mondeDemo(debutDans = DEBUT_PAR_DEFAUT, duree = DUREE_PAR_DEFAUT): MondeDemo {
  const du = dansNJours(debutDans)
  const au = dansNJours(debutDans + duree - 1)
  const cabinet: Account = {
    id: 'demo-cabinet', role: 'cabinet', creeLe: maintenant(), prenom: 'Marie', nom: 'Dubois', email: 'marie.dubois@exemple.fr',
    ville: 'Angers', codePostal: '49000', departement: '49', nomCabinet: 'Cabinet infirmier des Tilleuls', telephone: '06 12 34 56 78',
    nbTitulaires: 3, patientsTournee: 28, caJournalierMoyen: 480, codeParrain: 'MARDUB-7K2', plan: 'gratuit', moisOfferts: 0,
    pieces: [piece('ordre', '10004512345')],
  }
  const julien = remplacant({
    id: 'demo-julien', prenom: 'Julien', nom: 'Morel', ville: 'Angers', codePostal: '49000', experience: 7, soins: SOINS_REQUIS,
    pieces: [piece('diplome', '2014'), piece('ordre', '10007771122'), piece('autorisation', 'AR-49-1122', 300), piece('rcp', 'MACSF n° 7871122', 250), piece('urssaf', '812 771122', 150), piece('cps', 'CPS 1122', 700), piece('rib', '•••• 4471')],
  })
  const amina = remplacant({
    id: 'demo-amina', prenom: 'Amina', nom: 'Cherif', ville: 'Trélazé', codePostal: '49800', experience: 4, soins: ['Pansements complexes', 'Diabète / insuline'],
    pieces: [piece('diplome', '2018'), piece('ordre', '10009883344'), piece('autorisation', 'AR-49-3344', debutDans + 4), piece('rcp', 'MACSF n° 7883344', 250), piece('urssaf', '812 883344', 150), piece('cps', 'CPS 3344', 700), piece('rib', '•••• 2210')],
  })
  const thomas = remplacant({
    id: 'demo-thomas', prenom: 'Thomas', nom: 'Girard', ville: 'Avrillé', codePostal: '49240', experience: 2, soins: [],
    pieces: [piece('diplome', '2022'), piece('ordre', '10012455566'), piece('autorisation', 'AR-49-5566', 300), piece('urssaf', '812 455566', 150)],
  })
  const mission: Mission = {
    id: 'demo-mission', cabinetId: cabinet.id, motif: 'Congés', du, au, joursTravailles: duree, dimanchesFeries: 2, caJournalier: 480,
    retrocessionPct: 85, patientsJour: 28, kmJour: 65, horaires: '6 h 30 – 13 h / 17 h – 19 h 30', soinsRequis: SOINS_REQUIS,
    vehiculeFourni: true, logementFourni: false, statut: 'publiee', invitesDirects: [],
  }
  const contrat: Contrat = {
    id: 'demo-contrat', missionId: mission.id, cabinetId: cabinet.id, remplacantId: julien.id, creeLe: maintenant(),
    retrocessionPct: 85, echeanceReversement: dansNJours(debutDans + duree + 30), clauseNonConcurrence: false,
  }
  return { cabinet, candidats: [julien, amina, thomas], mission, contrat }
}

/** Les contrôles réels de l'application, appliqués à un candidat de la démonstration. */
export const controlesDe = (candidat: Account, mission: Mission): Controle[] => controlerAffectation(candidat, mission, [])

/** Texte réel du modèle de contrat, rempli avec le monde de démonstration. */
export function texteContratDemo(m: MondeDemo = mondeDemo()): string {
  return texteContrat(m.contrat, m.mission, m.cabinet, m.candidats[0])
}
