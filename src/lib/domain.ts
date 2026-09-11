import type {
  Account, Contrat, LigneRetrocession, Mission, Piece, PieceKey,
} from './types'

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export const jour = 86_400_000

export function aujourdhui(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function joursEntre(a: string | Date, b: string | Date): number {
  const d1 = typeof a === 'string' ? new Date(a) : a
  const d2 = typeof b === 'string' ? new Date(b) : b
  return Math.round((d2.getTime() - d1.getTime()) / jour)
}

export function dansNJours(n: number): string {
  return new Date(Date.now() + n * jour).toISOString().slice(0, 10)
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatDateCourte(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export function euros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

/* ------------------------------------------------------------------ */
/* Rétrocession : le calcul que personne ne fait à leur place          */
/* ------------------------------------------------------------------ */

/**
 * Taux de charges sociales et professionnelles d'un remplaçant IDEL
 * (URSSAF + CARPIMKO + CFE + RCP), ordre de grandeur retenu pour l'estimation.
 * Volontairement affiché comme une estimation : ce n'est pas un calcul fiscal.
 */
export const TAUX_CHARGES_REMPLACANT = 0.24

/** Majoration appliquée aux dimanches et jours fériés travaillés. */
export const MAJORATION_DIMANCHE = 1.18

export interface EstimationRetrocession {
  caPeriode: number
  brutRemplacant: number
  netEstimeRemplacant: number
  redevanceCabinet: number
  brutParJour: number
  netParJour: number
}

export function estimerRetrocession(m: {
  joursTravailles: number
  dimanchesFeries: number
  caJournalier: number
  retrocessionPct: number
}): EstimationRetrocession {
  const joursNormaux = Math.max(0, m.joursTravailles - m.dimanchesFeries)
  const caPeriode = Math.round(
    joursNormaux * m.caJournalier + m.dimanchesFeries * m.caJournalier * MAJORATION_DIMANCHE,
  )
  const brutRemplacant = Math.round((caPeriode * m.retrocessionPct) / 100)
  const netEstimeRemplacant = Math.round(brutRemplacant * (1 - TAUX_CHARGES_REMPLACANT))
  const j = Math.max(1, m.joursTravailles)
  return {
    caPeriode,
    brutRemplacant,
    netEstimeRemplacant,
    redevanceCabinet: caPeriode - brutRemplacant,
    brutParJour: Math.round(brutRemplacant / j),
    netParJour: Math.round(netEstimeRemplacant / j),
  }
}

export function montantLigne(l: LigneRetrocession): number {
  return Math.round((l.caEncaisse * l.pct) / 100)
}

/* ------------------------------------------------------------------ */
/* Dossier de confiance                                                */
/* ------------------------------------------------------------------ */

export const PIECES: Record<PieceKey, {
  label: string
  aide: string
  critique: boolean
  echeance: boolean
  champ?: string
}> = {
  diplome: {
    label: 'Diplôme d’État',
    aide: 'Le DE d’infirmier, exigé pour tout remplacement.',
    critique: true, echeance: false, champ: 'Année d’obtention',
  },
  ordre: {
    label: 'Inscription à l’Ordre',
    aide: 'Numéro RPPS et département d’inscription au tableau.',
    critique: true, echeance: false, champ: 'N° RPPS',
  },
  autorisation: {
    label: 'Autorisation de remplacement',
    aide: 'Délivrée par le conseil (inter)départemental. Personnelle, valable un an, renouvelable.',
    critique: true, echeance: true, champ: 'N° d’autorisation',
  },
  rcp: {
    label: 'Responsabilité civile professionnelle',
    aide: 'Le remplaçant reste personnellement responsable des soins qu’il dispense.',
    critique: true, echeance: true, champ: 'Assureur et n° de contrat',
  },
  urssaf: {
    label: 'Attestation URSSAF / SIRET',
    aide: 'Justifie l’exercice libéral et la régularité des cotisations.',
    critique: false, echeance: true, champ: 'N° SIRET',
  },
  cps: {
    label: 'Carte CPS',
    aide: 'Nécessaire pour la télétransmission pendant le remplacement.',
    critique: false, echeance: true, champ: 'N° de carte',
  },
  rib: {
    label: 'RIB',
    aide: 'Pour le reversement de la rétrocession d’honoraires.',
    critique: false, echeance: false, champ: 'IBAN (4 derniers caractères)',
  },
}

export const ORDRE_PIECES: PieceKey[] = [
  'autorisation', 'ordre', 'rcp', 'diplome', 'urssaf', 'cps', 'rib',
]

export type EtatPiece = 'valide' | 'bientot' | 'expiree' | 'manquante'

export const SEUIL_ALERTE_JOURS = 60

export function etatPiece(p: Piece | undefined): EtatPiece {
  if (!p || !p.fournieLe) return 'manquante'
  if (!p.expireLe) return 'valide'
  const restant = joursEntre(aujourdhui(), new Date(p.expireLe))
  if (restant < 0) return 'expiree'
  if (restant <= SEUIL_ALERTE_JOURS) return 'bientot'
  return 'valide'
}

export interface Conformite {
  score: number
  verifie: boolean
  manquantesCritiques: PieceKey[]
  alertes: { key: PieceKey; etat: EtatPiece; jours: number }[]
}

export function conformite(a: Account): Conformite {
  const pieces = a.pieces ?? []
  const get = (k: PieceKey) => pieces.find(p => p.key === k)
  let points = 0
  const manquantesCritiques: PieceKey[] = []
  const alertes: Conformite['alertes'] = []

  for (const key of ORDRE_PIECES) {
    const meta = PIECES[key]
    const etat = etatPiece(get(key))
    const poids = meta.critique ? 20 : 5
    if (etat === 'valide') points += poids
    else if (etat === 'bientot') points += poids * 0.6
    if (meta.critique && (etat === 'manquante' || etat === 'expiree')) manquantesCritiques.push(key)
    if (etat !== 'valide') {
      const p = get(key)
      alertes.push({
        key, etat,
        jours: p?.expireLe ? joursEntre(aujourdhui(), new Date(p.expireLe)) : 0,
      })
    }
  }
  const total = ORDRE_PIECES.reduce((s, k) => s + (PIECES[k].critique ? 20 : 5), 0)
  return {
    score: Math.round((points / total) * 100),
    verifie: manquantesCritiques.length === 0,
    manquantesCritiques,
    alertes,
  }
}

/* ------------------------------------------------------------------ */
/* Contrôles de mission : ce que les sites d'annonces ne font jamais   */
/* ------------------------------------------------------------------ */

export type Gravite = 'bloquant' | 'attention' | 'info'

export interface Controle {
  gravite: Gravite
  titre: string
  detail: string
}

/**
 * Vérifie qu'un remplaçant peut réellement couvrir une mission :
 * autorisation valable jusqu'au dernier jour, RCP en cours, et respect
 * de la règle des deux remplacements simultanés maximum.
 */
export function controlerAffectation(
  remplacant: Account,
  mission: Mission,
  contratsDuRemplacant: { contrat: Contrat; mission: Mission }[],
): Controle[] {
  const out: Controle[] = []
  const pieces = remplacant.pieces ?? []
  const autorisation = pieces.find(p => p.key === 'autorisation')
  const rcp = pieces.find(p => p.key === 'rcp')

  if (etatPiece(autorisation) === 'manquante') {
    out.push({
      gravite: 'bloquant',
      titre: 'Autorisation de remplacement absente',
      detail: 'Aucun remplacement ne peut débuter sans autorisation du conseil départemental.',
    })
  } else if (autorisation?.expireLe && new Date(autorisation.expireLe) < new Date(mission.au)) {
    out.push({
      gravite: 'bloquant',
      titre: 'Autorisation expirée avant la fin du remplacement',
      detail: `Elle court jusqu’au ${formatDate(autorisation.expireLe)}, le remplacement va jusqu’au ${formatDate(mission.au)}. Demandez le renouvellement avant de signer.`,
    })
  }

  const etatRcp = etatPiece(rcp)
  if (etatRcp === 'manquante' || etatRcp === 'expiree') {
    out.push({
      gravite: 'bloquant',
      titre: 'RCP non valide',
      detail: 'Le remplaçant répond personnellement des soins qu’il dispense : sa RCP doit couvrir toute la période.',
    })
  } else if (rcp?.expireLe && new Date(rcp.expireLe) < new Date(mission.au)) {
    out.push({
      gravite: 'attention',
      titre: 'RCP à renouveler pendant la mission',
      detail: `Échéance le ${formatDate(rcp.expireLe)}, avant la fin du remplacement.`,
    })
  }

  const chevauchements = contratsDuRemplacant.filter(({ mission: m }) =>
    m.id !== mission.id && new Date(m.du) <= new Date(mission.au) && new Date(m.au) >= new Date(mission.du),
  )
  if (chevauchements.length >= 2) {
    out.push({
      gravite: 'bloquant',
      titre: 'Trois remplacements simultanés',
      detail: 'Un remplaçant ne peut pas remplacer plus de deux infirmiers en même temps, cabinet de groupe compris.',
    })
  } else if (chevauchements.length === 1) {
    out.push({
      gravite: 'info',
      titre: 'Un autre remplacement en parallèle',
      detail: 'Encore possible : la limite est de deux remplacements simultanés.',
    })
  }

  if (mission.soinsRequis.length) {
    const maitrises = new Set(remplacant.soinsMaitrises ?? [])
    const manquants = mission.soinsRequis.filter(s => !maitrises.has(s))
    if (manquants.length) {
      out.push({
        gravite: 'attention',
        titre: 'Soins non déclarés au profil',
        detail: `${manquants.join(', ')} — à valider de vive voix avant la passation.`,
      })
    }
  }
  return out
}

/** Le contrat doit être transmis au conseil départemental avant le début. */
export function alerteCDOI(contrat: Contrat, mission: Mission): Controle | null {
  if (contrat.transmisCDOILe) return null
  const restant = joursEntre(aujourdhui(), new Date(mission.du))
  if (restant < 0) {
    return {
      gravite: 'bloquant',
      titre: 'Contrat non transmis à l’Ordre',
      detail: 'Le remplacement a commencé sans transmission au conseil départemental. Régularisez sans attendre.',
    }
  }
  return {
    gravite: restant <= 7 ? 'attention' : 'info',
    titre: `À transmettre au conseil départemental sous ${restant} jour${restant > 1 ? 's' : ''}`,
    detail: 'Le contrat de remplacement se transmet au conseil départemental de l’Ordre avant le début du remplacement.',
  }
}

/* ------------------------------------------------------------------ */
/* Parrainage : simple, réciproque, plafonné                           */
/* ------------------------------------------------------------------ */

/** Un mois offert pour chacun, jamais plus de douze par an : pas de pyramide. */
export const MOIS_OFFERTS_PAR_PARRAINAGE = 1
export const PLAFOND_MOIS_OFFERTS_PAR_AN = 12

export function genererCode(prenom: string, nom: string): string {
  const base = (prenom.slice(0, 3) + nom.slice(0, 3))
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '') || 'IDEL'
  const suffixe = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${base}-${suffixe}`
}

export function lienParrainage(code: string): string {
  const base = location.origin + location.pathname
  return `${base}#/invite/${code}`
}

/* ------------------------------------------------------------------ */
/* Fiabilité : ce qui se gagne en faisant bien, pas en recrutant       */
/* ------------------------------------------------------------------ */

export type NiveauFiabilite = 'Nouveau' | 'Fiable' | 'Référence'

export interface Fiabilite {
  score: number | null
  niveau: NiveauFiabilite
  /** Les faits qui composent le score, pour que chacun sache quoi faire. */
  criteres: { label: string; ok: number; total: number; poids: number }[]
  avantage: string
}

export const AVANTAGES: Record<NiveauFiabilite, string> = {
  Nouveau: 'Diffusion standard.',
  Fiable: 'Vos annonces sont mises en avant dans le département.',
  Référence: 'Vous voyez les nouveaux remplaçants 24 h avant les autres cabinets.',
}

export function niveauPour(score: number | null): NiveauFiabilite {
  if (score === null || score < 40) return 'Nouveau'
  if (score < 75) return 'Fiable'
  return 'Référence'
}

export function scoreDepuisCriteres(criteres: Fiabilite['criteres']): number | null {
  const evaluables = criteres.filter(c => c.total > 0)
  if (!evaluables.length) return null
  const poids = evaluables.reduce((s, c) => s + c.poids, 0)
  return Math.round(evaluables.reduce((s, c) => s + (c.ok / c.total) * c.poids, 0) / poids * 100)
}
