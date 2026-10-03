import { describe, expect, it } from 'vitest'
import {
  alerteCDOI, conformite, controlerAffectation, dansNJours, estimerRetrocession, etatPiece,
  genererCode, montantLigne, niveauPour, scoreDepuisCriteres,
} from '../domain'
import type { Account, Contrat, Mission, Piece } from '../types'

const remplacant = (pieces: Piece[], extra: Partial<Account> = {}): Account => ({
  id: 'r', role: 'remplacant', creeLe: '', prenom: 'J', nom: 'M', email: '', ville: '', codePostal: '49000', departement: '49',
  codeParrain: 'X-1', plan: 'gratuit', moisOfferts: 0, pieces, soinsMaitrises: ['Nursing / toilettes'], ...extra,
})
const piece = (key: Piece['key'], expireDans?: number): Piece => ({
  key, reference: 'ref', fournieLe: new Date().toISOString(), expireLe: expireDans === undefined ? undefined : dansNJours(expireDans),
})
const complet = () => [piece('diplome'), piece('ordre'), piece('autorisation', 300), piece('rcp', 300), piece('urssaf', 300), piece('cps', 300), piece('rib')]
const mission = (du: number, au: number, extra: Partial<Mission> = {}): Mission => ({
  id: 'm', cabinetId: 'c', motif: 'Congés', du: dansNJours(du), au: dansNJours(au), joursTravailles: au - du + 1, dimanchesFeries: 0,
  caJournalier: 480, retrocessionPct: 85, patientsJour: 25, kmJour: 50, horaires: '', soinsRequis: [], vehiculeFourni: true,
  logementFourni: false, statut: 'publiee', invitesDirects: [], ...extra,
})

describe('rétrocession', () => {
  it('calcule brut, net et redevance, dimanches majorés', () => {
    const e = estimerRetrocession({ joursTravailles: 10, dimanchesFeries: 2, caJournalier: 500, retrocessionPct: 80 })
    // 8 jours × 500 + 2 × 500 × 1,18 = 5 180
    expect(e.caPeriode).toBe(5180)
    expect(e.brutRemplacant).toBe(4144)
    expect(e.netEstimeRemplacant).toBe(Math.round(4144 * 0.76))
    expect(e.redevanceCabinet).toBe(5180 - 4144)
    expect(e.brutParJour).toBe(414)
  })
  it('ne divise jamais par zéro', () => {
    expect(estimerRetrocession({ joursTravailles: 0, dimanchesFeries: 0, caJournalier: 500, retrocessionPct: 80 }).brutParJour).toBe(0)
  })
  it('montant d’une ligne arrondi à l’euro', () => {
    expect(montantLigne({ id: '', contratId: '', libelle: '', du: '', au: '', caEncaisse: 1860, pct: 85, echeance: '' })).toBe(1581)
  })
})

describe('dossier de confiance', () => {
  it('état des pièces', () => {
    expect(etatPiece(undefined)).toBe('manquante')
    expect(etatPiece(piece('rcp', -1))).toBe('expiree')
    expect(etatPiece(piece('rcp', 30))).toBe('bientot')
    expect(etatPiece(piece('rcp', 200))).toBe('valide')
    expect(etatPiece(piece('diplome'))).toBe('valide')
  })
  it('dossier complet = vérifié à 100 %', () => {
    const c = conformite(remplacant(complet()))
    expect(c.verifie).toBe(true)
    expect(c.score).toBe(100)
  })
  it('une pièce critique manquante empêche la vérification', () => {
    const c = conformite(remplacant(complet().filter(p => p.key !== 'rcp')))
    expect(c.verifie).toBe(false)
    expect(c.manquantesCritiques).toContain('rcp')
  })
})

describe('contrôles d’affectation', () => {
  it('bloque une autorisation qui expire avant la fin du remplacement', () => {
    const r = remplacant([...complet().filter(p => p.key !== 'autorisation'), piece('autorisation', 38)])
    const out = controlerAffectation(r, mission(32, 52), [])
    expect(out.some(c => c.gravite === 'bloquant' && /Autorisation/.test(c.titre))).toBe(true)
  })
  it('bloque l’absence de RCP', () => {
    const out = controlerAffectation(remplacant(complet().filter(p => p.key !== 'rcp')), mission(10, 12), [])
    expect(out.some(c => c.gravite === 'bloquant' && /RCP/.test(c.titre))).toBe(true)
  })
  it('autorise deux remplacements simultanés, bloque le troisième', () => {
    const autre = (id: string) => ({ contrat: {} as Contrat, mission: { ...mission(10, 20), id } })
    expect(controlerAffectation(remplacant(complet()), mission(10, 20), [autre('a')]).some(c => c.gravite === 'bloquant')).toBe(false)
    expect(controlerAffectation(remplacant(complet()), mission(10, 20), [autre('a'), autre('b')]).some(c => c.titre === 'Trois remplacements simultanés')).toBe(true)
  })
  it('signale les soins non déclarés sans bloquer', () => {
    const out = controlerAffectation(remplacant(complet()), mission(10, 12, { soinsRequis: ['Pédiatrie'] }), [])
    expect(out).toEqual([expect.objectContaining({ gravite: 'attention', titre: 'Soins non déclarés au profil' })])
  })
})

describe('transmission à l’Ordre', () => {
  const contrat = { transmisCDOILe: undefined } as Contrat
  it('aucune alerte une fois transmis', () => {
    expect(alerteCDOI({ ...contrat, transmisCDOILe: '2026-01-01' }, mission(3, 5))).toBeNull()
  })
  it('attention à J-7, bloquant une fois commencé', () => {
    expect(alerteCDOI(contrat, mission(5, 8))?.gravite).toBe('attention')
    expect(alerteCDOI(contrat, mission(30, 32))?.gravite).toBe('info')
    expect(alerteCDOI(contrat, mission(-1, 3))?.gravite).toBe('bloquant')
  })
})

describe('parrainage et fiabilité', () => {
  it('code sans accent, format stable', () => {
    expect(genererCode('Élise', 'Ñoño')).toMatch(/^ELINON-[A-Z0-9]{3}$/)
    expect(genererCode('', '')).toMatch(/^IDEL-/)
  })
  it('niveaux', () => {
    expect(niveauPour(null)).toBe('Nouveau')
    expect(niveauPour(39)).toBe('Nouveau')
    expect(niveauPour(40)).toBe('Fiable')
    expect(niveauPour(75)).toBe('Référence')
  })
  it('score pondéré sur les seuls critères évaluables', () => {
    expect(scoreDepuisCriteres([{ label: '', ok: 0, total: 0, poids: 5 }])).toBeNull()
    expect(scoreDepuisCriteres([{ label: '', ok: 1, total: 2, poids: 1 }, { label: '', ok: 0, total: 0, poids: 9 }])).toBe(50)
  })
})
