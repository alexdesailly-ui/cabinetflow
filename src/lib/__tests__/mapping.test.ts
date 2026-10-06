import { beforeEach, describe, expect, it } from 'vitest'
import { candidater, enregistrerFiche, inviter, majCompte, retenir, signer } from '../actions'
import { difference, type Lignes, versCamel, versEtat, versSnake } from '../cloud/mapping'
import { DEMO_CABINET, DEMO_REMPLACANT, semerDemo } from '../seed'
import { getEtat, mutate, reinitialiser, type Etat } from '../store'

const cloner = (e: Etat): Etat => JSON.parse(JSON.stringify(e))

/** Exécute une action et renvoie les opérations serveur qu'elle produit. */
function ops(session: string, action: () => void) {
  mutate(e => { e.session = session })
  const avant = cloner(getEtat())
  action()
  return difference(avant, getEtat())
}

beforeEach(() => { reinitialiser(); semerDemo() })

describe('noms de colonnes', () => {
  it('camelCase ↔ snake_case, y compris les exceptions', () => {
    expect(versSnake('remplacantRetenuId')).toBe('remplacant_retenu_id')
    expect(versSnake('transmisCDOILe')).toBe('transmis_cdoi_le')
    expect(versCamel('transmis_cdoi_le')).toBe('transmisCDOILe')
    expect(versCamel('ca_journalier_moyen')).toBe('caJournalierMoyen')
  })
})

describe('différence → écritures serveur', () => {
  it('candidater = une insertion, sans statut (choisi par le serveur)', () => {
    const o = ops(DEMO_REMPLACANT, () => candidater('mis-saumur', DEMO_REMPLACANT, 'Dispo'))
    expect(o).toEqual([{ type: 'insert', table: 'candidatures', valeurs: expect.objectContaining({ mission_id: 'mis-saumur', remplacant_id: DEMO_REMPLACANT, message: 'Dispo' }) }])
    expect((o[0] as { valeurs: object }).valeurs).not.toHaveProperty('statut')
  })

  it('retenir = candidatures, puis mission, puis contrat (ordre des clés étrangères)', () => {
    const o = ops(DEMO_CABINET, () => retenir('mis-ete', DEMO_REMPLACANT))
    const tables = o.map(x => `${x.type}:${'table' in x ? x.table : ''}`)
    expect(tables.indexOf('update:missions')).toBeLessThan(tables.indexOf('insert:contrats'))
    expect(o.find(x => x.type === 'update' && x.table === 'missions')).toMatchObject({ valeurs: { statut: 'pourvue', remplacant_retenu_id: DEMO_REMPLACANT } })
    expect(o.filter(x => x.type === 'update' && x.table === 'candidatures')).toHaveLength(3)
  })

  it('signer n’envoie QUE la signature : le parrainage est calculé par le serveur', () => {
    retenir('mis-ete', DEMO_REMPLACANT)
    const contrat = getEtat().contrats.find(c => c.missionId === 'mis-ete')!
    const o = ops(DEMO_REMPLACANT, () => signer(contrat.id, DEMO_REMPLACANT, 'Julien Morel'))
    expect(o).toEqual([{ type: 'update', table: 'contrats', cle: { id: contrat.id }, valeurs: { signature_remplacant: expect.objectContaining({ parId: DEMO_REMPLACANT }) } }])
  })

  it('modifier son profil et ses pièces', () => {
    const o = ops(DEMO_REMPLACANT, () => majCompte(DEMO_REMPLACANT, {
      rayonKm: 60,
      pieces: [...getEtat().accounts.find(a => a.id === DEMO_REMPLACANT)!.pieces!.filter(p => p.key !== 'rcp'), { key: 'rcp', reference: 'AXA 1', fournieLe: '2026-10-01', expireLe: '2027-10-01' }],
    }))
    expect(o).toContainEqual({ type: 'update', table: 'comptes', cle: { id: DEMO_REMPLACANT }, valeurs: { rayon_km: 60 } })
    expect(o).toContainEqual({ type: 'update', table: 'pieces', cle: { compte_id: DEMO_REMPLACANT, key: 'rcp' }, valeurs: { reference: 'AXA 1', expire_le: '2027-10-01', fournie_le: '2026-10-01' } })
  })

  it('on ne modifie jamais le compte de quelqu’un d’autre', () => {
    const o = ops(DEMO_REMPLACANT, () => majCompte(DEMO_CABINET, { telephone: '0000' }))
    expect(o).toEqual([])
  })

  it('les invitations sont créées, jamais modifiées par le client', () => {
    const o = ops(DEMO_CABINET, () => inviter(DEMO_CABINET, 'Paul', 'whatsapp'))
    expect(o).toEqual([{ type: 'insert', table: 'invitations', valeurs: expect.objectContaining({ par_id: DEMO_CABINET, nom: 'Paul', canal: 'whatsapp' }) }])
  })

  it('la fiche passe par la RPC chiffrée', () => {
    const o = ops(DEMO_CABINET, () => enregistrerFiche({ missionId: 'mis-ete', patients: [], consignes: 'Clé chez la voisine', majLe: '' }))
    expect(o).toEqual([{ type: 'rpc', fonction: 'fiche_enregistrer', args: { mission: 'mis-ete', contenu: expect.objectContaining({ consignes: 'Clé chez la voisine' }) } }])
  })
})

describe('chargement serveur → état', () => {
  const base: Lignes = {
    userId: 'u1', email: 'marie@x.fr',
    membres: [{ compte_id: 'c1', user_id: 'u1' }],
    annuaire: [
      { id: 'c1', role: 'cabinet', prenom: 'Marie', nom: 'D', ville: 'Angers', code_postal: '49000', departement: '49', pieces: [] },
      { id: 'r1', role: 'remplacant', prenom: 'Julien', nom: 'M', ville: 'Angers', code_postal: '49100', departement: '49', rayon_km: 40, pieces: [{ key: 'rcp', expireLe: '2027-01-01', fournieLe: '2026-01-01' }] },
    ],
    comptes: [{ id: 'c1', role: 'cabinet', prenom: 'Marie', nom: 'D', email: 'marie@x.fr', telephone: null, code_parrain: 'MARD-1AB', plan: 'essai', mois_offerts: 1, ville: 'Angers', code_postal: '49000' }],
    pieces: [], missions: [{ id: 'm1', cabinet_id: 'c1', du: '2026-11-01', au: '2026-11-10', remplacant_retenu_id: null, statut: 'publiee' }],
    candidatures: [], contrats: [{ id: 'k1', transmis_cdoi_le: '2026-10-01T10:00:00+00:00' }], lignes: [], recos: [], invitations: [],
    badges: [{ compte_id: 'c1', key: 'premier-besoin', le: '2026-10-01' }], fiches: [],
    abonnements: [{ cabinet_id: 'c1', statut: 'active', intervalle: 'month', current_period_end: '2026-11-01', cancel_at_period_end: false }],
    parametres: { fichePatientsAutorises: false },
  }

  it('fusionne annuaire et comptes complets, choisit la session', () => {
    const e = versEtat(base)
    expect(e.session).toBe('c1')
    expect(e.accounts.find(a => a.id === 'c1')).toMatchObject({ email: 'marie@x.fr', codeParrain: 'MARD-1AB', moisOfferts: 1 })
    expect(e.accounts.find(a => a.id === 'r1')).toMatchObject({ email: '', rayonKm: 40, pieces: [{ key: 'rcp', expireLe: '2027-01-01' }] })
    expect(e.accounts.find(a => a.id === 'c1')).not.toHaveProperty('telephone')
  })

  it('convertit les noms de champs et l’état cloud', () => {
    const e = versEtat(base)
    expect(e.missions[0]).toEqual({ id: 'm1', cabinetId: 'c1', du: '2026-11-01', au: '2026-11-10', statut: 'publiee' })
    expect(e.contrats[0].transmisCDOILe).toBe('2026-10-01T10:00:00+00:00')
    expect(e.badges.c1).toEqual([{ key: 'premier-besoin', le: '2026-10-01' }])
    expect(e.cloud).toMatchObject({ fichePatientsAutorises: false, abonnement: { statut: 'active', intervalle: 'month' }, email: 'marie@x.fr' })
  })

  it('aller-retour : un état rechargé sans changement ne produit aucune écriture', () => {
    const e = versEtat(base)
    expect(difference(e, cloner(e))).toEqual([])
  })
})
