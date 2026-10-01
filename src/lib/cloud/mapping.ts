/**
 * Traduction entre l'état de l'application (src/lib/types.ts, camelCase) et les
 * tables Supabase (snake_case), et calcul des écritures à envoyer après une
 * mutation. Fonctions pures : testées sans réseau (mapping.test.ts).
 */
import type { Etat, EtatCloud } from '../store'
import type { Account, Candidature, Contrat, FicheTournee, Invitation, LigneRetrocession, Mission, Piece, Recommandation } from '../types'

export type Ligne = Record<string, unknown>

/* ------------------------------------------------------------------ */
/* Noms de colonnes                                                    */
/* ------------------------------------------------------------------ */

const EXCEPTIONS: Record<string, string> = { transmisCDOILe: 'transmis_cdoi_le' }
const EXCEPTIONS_INV = Object.fromEntries(Object.entries(EXCEPTIONS).map(([a, b]) => [b, a]))

export const versSnake = (k: string) => EXCEPTIONS[k] ?? k.replace(/[A-Z]/g, c => '_' + c.toLowerCase())
export const versCamel = (k: string) => EXCEPTIONS_INV[k] ?? k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

/** Ligne SQL → objet applicatif : clés en camelCase, `null` → absent. */
export function depuisLigne<T>(l: Ligne): T {
  const o: Ligne = {}
  for (const [k, v] of Object.entries(l)) if (v !== null) o[versCamel(k)] = v
  return o as T
}

/* ------------------------------------------------------------------ */
/* Description des collections synchronisées                           */
/* ------------------------------------------------------------------ */

interface Collection {
  /** Clé de l'état applicatif. */
  etat: 'missions' | 'candidatures' | 'contrats' | 'lignes' | 'recos' | 'invitations'
  table: string
  /** Champs applicatifs que le serveur accepte à la création / en modification (cf. GRANT des migrations). */
  insert: string[]
  update: string[]
  delete: boolean
}

/**
 * Ordre = ordre d'application (clés étrangères). Les champs absents de
 * `insert`/`update` sont calculés par le serveur (dates de signature, parrainage…)
 * et reviennent au rechargement suivant.
 */
export const COLLECTIONS: Collection[] = [
  {
    etat: 'missions', table: 'missions', delete: true,
    insert: ['id', 'cabinetId', 'motif', 'du', 'au', 'joursTravailles', 'dimanchesFeries', 'caJournalier', 'retrocessionPct', 'patientsJour',
      'kmJour', 'horaires', 'soinsRequis', 'vehiculeFourni', 'logementFourni', 'commentaire', 'statut', 'publieeLe', 'invitesDirects'],
    update: ['motif', 'du', 'au', 'joursTravailles', 'dimanchesFeries', 'caJournalier', 'retrocessionPct', 'patientsJour', 'kmJour', 'horaires',
      'soinsRequis', 'vehiculeFourni', 'logementFourni', 'commentaire', 'statut', 'publieeLe', 'remplacantRetenuId', 'invitesDirects'],
  },
  { etat: 'candidatures', table: 'candidatures', delete: true, insert: ['id', 'missionId', 'remplacantId', 'message'], update: ['message', 'statut'] },
  {
    etat: 'contrats', table: 'contrats', delete: false,
    insert: ['id', 'missionId', 'cabinetId', 'remplacantId', 'retrocessionPct', 'echeanceReversement', 'clauseNonConcurrence'],
    update: ['retrocessionPct', 'echeanceReversement', 'clauseNonConcurrence', 'signatureTitulaire', 'signatureRemplacant', 'transmisCDOILe'],
  },
  {
    etat: 'lignes', table: 'lignes_retrocession', delete: true,
    insert: ['id', 'contratId', 'libelle', 'du', 'au', 'caEncaisse', 'pct', 'echeance', 'payeeLe'],
    update: ['libelle', 'du', 'au', 'caEncaisse', 'pct', 'echeance', 'payeeLe'],
  },
  { etat: 'recos', table: 'recommandations', delete: true, insert: ['id', 'contratId', 'deId', 'versId', 'note', 'texte'], update: [] },
  { etat: 'invitations', table: 'invitations', delete: false, insert: ['id', 'parId', 'nom', 'canal'], update: [] },
]

/** Champs du compte modifiables par son titulaire (GRANT update sur public.comptes). */
export const CHAMPS_COMPTE = ['prenom', 'nom', 'email', 'telephone', 'ville', 'codePostal', 'nomCabinet', 'nbTitulaires', 'patientsTournee',
  'caJournalierMoyen', 'rayonKm', 'vehicule', 'anneesExperience', 'soinsMaitrises', 'disponibilites']

/* ------------------------------------------------------------------ */
/* Chargement : lignes SQL → état                                      */
/* ------------------------------------------------------------------ */

export interface Lignes {
  membres: Ligne[]
  annuaire: Ligne[]
  comptes: Ligne[]
  pieces: Ligne[]
  missions: Ligne[]
  candidatures: Ligne[]
  contrats: Ligne[]
  lignes: Ligne[]
  recos: Ligne[]
  invitations: Ligne[]
  badges: Ligne[]
  fiches: Ligne[]
  abonnements: Ligne[]
  parametres: Ligne
  email?: string
  /** user_id de la personne connectée (pour choisir son compte parmi `membres`). */
  userId: string
}

function compteDepuis(base: Ligne, complet: Ligne | undefined, pieces: Piece[] | undefined): Account {
  const a = depuisLigne<Account & { pieces?: Piece[]; anonymiseLe?: string; departement: string }>({ ...base, ...(complet ?? {}) })
  return {
    ...a,
    email: a.email ?? '',
    codeParrain: a.codeParrain ?? '',
    plan: a.plan ?? (a.role === 'cabinet' ? 'cabinet' : 'gratuit'),
    moisOfferts: a.moisOfferts ?? 0,
    soinsMaitrises: a.soinsMaitrises ?? [],
    disponibilites: a.disponibilites ?? [],
    pieces: pieces ?? (base.pieces as Ligne[] | undefined)?.map(p => depuisLigne<Piece>(p)) ?? [],
  }
}

export function versEtat(l: Lignes): Etat {
  const piecesPar = new Map<string, Piece[]>()
  for (const p of l.pieces) {
    const liste = piecesPar.get(p.compte_id as string) ?? []
    const { id: _id, compteId: _c, ...piece } = depuisLigne<Piece & { id: string; compteId: string }>(p)
    liste.push(piece)
    piecesPar.set(p.compte_id as string, liste)
  }
  const complets = new Map(l.comptes.map(c => [c.id as string, c]))
  const ids = new Set([...l.annuaire.map(a => a.id as string), ...complets.keys()])
  const accounts = [...ids].map(id => {
    const base = l.annuaire.find(a => a.id === id) ?? {}
    return compteDepuis(base, complets.get(id), piecesPar.get(id))
  })

  const badges: Etat['badges'] = {}
  for (const b of l.badges) (badges[b.compte_id as string] ??= []).push({ key: b.key as string, le: b.le as string })

  // Préférence : le compte cabinet de la personne connectée, sinon son compte remplaçant.
  const mesComptes = l.membres.filter(m => m.user_id === l.userId).map(m => m.compte_id as string)
  const session = accounts.filter(a => mesComptes.includes(a.id)).sort((a, b) => a.role.localeCompare(b.role))[0]?.id ?? null

  const abo = l.abonnements.find(s => s.cabinet_id === session)
  const cloud: EtatCloud = {
    email: l.email,
    fichePatientsAutorises: l.parametres?.fichePatientsAutorises === true,
    abonnement: abo ? {
      statut: abo.statut as string, intervalle: (abo.intervalle as string) ?? undefined,
      finPeriode: (abo.current_period_end as string) ?? undefined, annulationFinPeriode: abo.cancel_at_period_end === true,
    } : undefined,
    synchronisation: 'ok',
  }

  return {
    version: 1,
    session,
    accounts,
    missions: l.missions.map(m => depuisLigne<Mission>(m)),
    candidatures: l.candidatures.map(c => depuisLigne<Candidature>(c)),
    contrats: l.contrats.map(c => depuisLigne<Contrat>(c)),
    lignes: l.lignes.map(x => depuisLigne<LigneRetrocession>(x)),
    recos: l.recos.map(r => depuisLigne<Recommandation>(r)),
    fiches: l.fiches.map(f => f as unknown as FicheTournee),
    invitations: l.invitations.map(i => depuisLigne<Invitation>(i)),
    badges,
    cloud,
  }
}

/* ------------------------------------------------------------------ */
/* Écritures : différence avant / après une mutation                   */
/* ------------------------------------------------------------------ */

export type Operation =
  | { type: 'insert'; table: string; valeurs: Ligne }
  | { type: 'update'; table: string; cle: Ligne; valeurs: Ligne }
  | { type: 'delete'; table: string; cle: Ligne }
  | { type: 'rpc'; fonction: string; args: Ligne }

const egal = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

function selection(o: object, champs: string[], seulementDefinis: boolean): Ligne {
  const out: Ligne = {}
  for (const k of champs) {
    const v = (o as Ligne)[k]
    if (seulementDefinis && v === undefined) continue
    out[versSnake(k)] = v === undefined ? null : v
  }
  return out
}

function differenceCollection(c: Collection, avant: { id: string }[], apres: { id: string }[]): Operation[] {
  const ops: Operation[] = []
  const indexAvant = new Map(avant.map(x => [x.id, x]))
  const idsApres = new Set(apres.map(x => x.id))
  for (const x of apres) {
    const ancien = indexAvant.get(x.id)
    if (!ancien) { ops.push({ type: 'insert', table: c.table, valeurs: selection(x, c.insert, true) }); continue }
    const modifies = c.update.filter(k => !egal((ancien as unknown as Ligne)[k], (x as unknown as Ligne)[k]))
    if (modifies.length) ops.push({ type: 'update', table: c.table, cle: { id: x.id }, valeurs: selection(x, modifies, false) })
  }
  if (c.delete) for (const x of avant) if (!idsApres.has(x.id)) ops.push({ type: 'delete', table: c.table, cle: { id: x.id } })
  return ops
}

/**
 * Liste ordonnée des écritures qui reproduisent côté serveur une mutation locale.
 * Seuls le compte connecté, ses pièces, ses badges et ses fiches sont pris en compte :
 * le reste (parrain crédité, invitation activée…) est calculé par le serveur.
 */
export function difference(avant: Etat, apres: Etat): Operation[] {
  const ops: Operation[] = []
  const moi = apres.session

  const compteAvant = avant.accounts.find(a => a.id === moi)
  const compteApres = apres.accounts.find(a => a.id === moi)
  if (moi && compteAvant && compteApres) {
    const modifies = CHAMPS_COMPTE.filter(k => !egal((compteAvant as unknown as Ligne)[k], (compteApres as unknown as Ligne)[k]))
    if (modifies.length) ops.push({ type: 'update', table: 'comptes', cle: { id: moi }, valeurs: selection(compteApres, modifies, false) })

    const pAvant = new Map((compteAvant.pieces ?? []).map(p => [p.key, p]))
    const pApres = new Map((compteApres.pieces ?? []).map(p => [p.key, p]))
    for (const [key, p] of pApres) {
      const ancienne = pAvant.get(key)
      if (!ancienne) ops.push({ type: 'insert', table: 'pieces', valeurs: { compte_id: moi, ...selection(p, ['key', 'reference', 'expireLe', 'fournieLe'], true) } })
      else if (!egal(ancienne, p)) ops.push({ type: 'update', table: 'pieces', cle: { compte_id: moi, key }, valeurs: selection(p, ['reference', 'expireLe', 'fournieLe'], false) })
    }
    for (const key of pAvant.keys()) if (!pApres.has(key)) ops.push({ type: 'delete', table: 'pieces', cle: { compte_id: moi, key } })
  }

  for (const c of COLLECTIONS) {
    ops.push(...differenceCollection(c, avant[c.etat] as { id: string }[], apres[c.etat] as { id: string }[]))
  }

  if (moi) {
    const deja = new Set((avant.badges[moi] ?? []).map(b => b.key))
    for (const b of apres.badges[moi] ?? []) if (!deja.has(b.key)) ops.push({ type: 'insert', table: 'badges', valeurs: { compte_id: moi, key: b.key } })
  }

  const fichesAvant = new Map(avant.fiches.map(f => [f.missionId, f]))
  for (const f of apres.fiches) {
    const ancienne = fichesAvant.get(f.missionId)
    const { majLe: _a, ...contenu } = f
    if (!ancienne || !egal({ ...ancienne, majLe: '' }, { ...f, majLe: '' })) {
      ops.push({ type: 'rpc', fonction: 'fiche_enregistrer', args: { mission: f.missionId, contenu } })
    }
  }
  return ops
}
