// Modèle de données de Relève.
// Vocabulaire volontairement français et métier : on parle « titulaire »,
// « remplaçant », « rétrocession », « autorisation de remplacement » — ce sont
// les mots qu'un IDEL emploie, pas une traduction de vocabulaire SaaS.

export type Role = 'cabinet' | 'remplacant'

/** Pièces du dossier de confiance d'un remplaçant. */
export type PieceKey =
  | 'diplome'
  | 'ordre'
  | 'autorisation'
  | 'rcp'
  | 'urssaf'
  | 'cps'
  | 'rib'

export interface Piece {
  key: PieceKey
  /** Renseignée par le professionnel (n° RPPS, n° de contrat RCP, …). */
  reference?: string
  /** ISO date. Absente = pièce sans échéance (diplôme, RIB). */
  expireLe?: string
  fournieLe?: string
}

export interface Disponibilite {
  du: string
  au: string
}

export interface Account {
  id: string
  role: Role
  creeLe: string

  // Identité commune
  prenom: string
  nom: string
  email: string
  telephone?: string
  ville: string
  codePostal: string
  departement: string

  // Cabinet
  nomCabinet?: string
  nbTitulaires?: number
  /** Nombre de patients sur la tournée type. */
  patientsTournee?: number
  /** Chiffre d'affaires journalier moyen d'une tournée, en euros. */
  caJournalierMoyen?: number

  // Remplaçant
  rayonKm?: number
  vehicule?: boolean
  anneesExperience?: number
  soinsMaitrises?: string[]
  pieces?: Piece[]
  disponibilites?: Disponibilite[]

  // Parrainage
  codeParrain: string
  parrainePar?: string

  // Abonnement (démonstration)
  plan: 'essai' | 'cabinet' | 'gratuit'
  moisOfferts: number
}

export type MotifRemplacement =
  | 'Congés'
  | 'Maladie'
  | 'Formation'
  | 'Maternité / paternité'
  | 'Renfort d’activité'

export type StatutMission = 'brouillon' | 'publiee' | 'pourvue' | 'terminee'

export interface Mission {
  id: string
  cabinetId: string
  motif: MotifRemplacement
  du: string
  au: string
  /** Jours travaillés sur la période (dimanches et fériés inclus si cochés). */
  joursTravailles: number
  dimanchesFeries: number
  caJournalier: number
  retrocessionPct: number
  patientsJour: number
  kmJour: number
  horaires: string
  soinsRequis: string[]
  vehiculeFourni: boolean
  logementFourni: boolean
  commentaire?: string
  statut: StatutMission
  publieeLe?: string
  remplacantRetenuId?: string
  /** Invitations directes envoyées au carnet du cabinet. */
  invitesDirects: string[]
}

export type StatutCandidature = 'envoyee' | 'retenue' | 'ecartee'

export interface Candidature {
  id: string
  missionId: string
  remplacantId: string
  message: string
  envoyeeLe: string
  statut: StatutCandidature
}

export interface Signature {
  parId: string
  le: string
  /** Nom saisi à la signature — signature simple, à valeur d'engagement. */
  saisie: string
}

export interface Contrat {
  id: string
  missionId: string
  cabinetId: string
  remplacantId: string
  creeLe: string
  retrocessionPct: number
  echeanceReversement: string
  clauseNonConcurrence: boolean
  signatureTitulaire?: Signature
  signatureRemplacant?: Signature
  transmisCDOILe?: string
}

export interface LigneRetrocession {
  id: string
  contratId: string
  libelle: string
  du: string
  au: string
  caEncaisse: number
  pct: number
  echeance: string
  payeeLe?: string
}

/** Une recommandation n'existe que si un contrat a été signé entre les deux. */
export interface Recommandation {
  id: string
  contratId: string
  deId: string
  versId: string
  note: number
  texte: string
  le: string
}

export interface PatientTournee {
  id: string
  initiales: string
  rue: string
  creneau: string
  soins: string
  duree: number
  particularites?: string
}

export interface FicheTournee {
  missionId: string
  patients: PatientTournee[]
  accesCabinet?: string
  pharmacie?: string
  medecinReferent?: string
  consignes?: string
  majLe: string
}

export interface Invitation {
  id: string
  parId: string
  nom: string
  canal: 'sms' | 'whatsapp' | 'email' | 'lien' | 'qr'
  le: string
  /** Renseigné quand le filleul crée son compte. */
  filleulId?: string
  /** Le filleul est « actif » quand il a signé un contrat sur Relève. */
  actifLe?: string
}
