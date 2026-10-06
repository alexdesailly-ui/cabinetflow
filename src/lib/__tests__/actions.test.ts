import { beforeEach, describe, expect, it } from 'vitest'
import { candidater, creerCompte, recommander, retenir, signer, simulerActivationFilleul } from '../actions'
import { DEMO_CABINET, DEMO_REMPLACANT, semerDemo } from '../seed'
import { contratDeMission, getEtat, reinitialiser } from '../store'

beforeEach(() => { reinitialiser(); semerDemo() })

describe('parcours de démonstration', () => {
  it('le monde de démo est cohérent', () => {
    const e = getEtat()
    expect(e.accounts.find(a => a.id === DEMO_CABINET)?.codeParrain).toBe('MARDUB-7K2')
    expect(e.missions.filter(m => m.cabinetId === DEMO_CABINET)).toHaveLength(3)
    expect(e.session).toBeNull()
  })

  it('candidater deux fois ne crée qu’une candidature', () => {
    candidater('mis-saumur', DEMO_REMPLACANT, 'a')
    candidater('mis-saumur', DEMO_REMPLACANT, 'b')
    expect(getEtat().candidatures.filter(c => c.missionId === 'mis-saumur')).toHaveLength(1)
  })

  it('retenir écarte les autres et prépare un contrat non signé', () => {
    retenir('mis-ete', DEMO_REMPLACANT)
    const e = getEtat()
    expect(e.missions.find(m => m.id === 'mis-ete')?.statut).toBe('pourvue')
    expect(e.candidatures.filter(c => c.missionId === 'mis-ete' && c.statut === 'ecartee')).toHaveLength(2)
    const c = contratDeMission(e, 'mis-ete')
    expect(c?.signatureTitulaire).toBeUndefined()
    expect(c?.remplacantId).toBe(DEMO_REMPLACANT)
  })

  it('la première signature d’un filleul récompense le parrain cabinet', () => {
    retenir('mis-ete', DEMO_REMPLACANT)
    const c = contratDeMission(getEtat(), 'mis-ete')!
    const avant = getEtat().accounts.find(a => a.id === DEMO_CABINET)!.moisOfferts
    signer(c.id, DEMO_REMPLACANT, 'Julien Morel')
    expect(getEtat().accounts.find(a => a.id === DEMO_CABINET)!.moisOfferts).toBe(avant + 1)
    expect(getEtat().invitations.find(i => i.filleulId === DEMO_REMPLACANT)?.actifLe).toBeDefined()
  })

  it('le parrainage est plafonné à 12 mois par an', () => {
    const avant = getEtat().accounts.find(a => a.id === DEMO_CABINET)!.moisOfferts
    const actifsCetteAnnee = getEtat().invitations.filter(i => i.parId === DEMO_CABINET && i.actifLe?.startsWith(new Date().getFullYear().toString())).length
    for (let i = 0; i < 20; i++) {
      const id = `inv-test-${i}`
      getEtat().invitations.push({ id, parId: DEMO_CABINET, nom: `Confrère ${i}`, canal: 'sms', le: new Date().toISOString() })
      simulerActivationFilleul(id)
    }
    const gagnes = getEtat().accounts.find(a => a.id === DEMO_CABINET)!.moisOfferts - avant
    expect(gagnes).toBe(Math.max(0, 12 - actifsCetteAnnee))
  })

  it('une recommandation par contrat et par auteur', () => {
    recommander({ contratId: 'ctr-printemps', deId: DEMO_CABINET, versId: DEMO_REMPLACANT, note: 5, texte: 'encore bravo' })
    expect(getEtat().recos.filter(r => r.contratId === 'ctr-printemps' && r.deId === DEMO_CABINET)).toHaveLength(1)
  })

  it('un filleul cabinet démarre avec un mois offert et apparaît chez le parrain', () => {
    const id = creerCompte({ role: 'cabinet', prenom: 'Élise', nom: 'Neuve', email: 'e@x.fr', ville: 'Angers', codePostal: '49000', parrainePar: 'MARDUB-7K2' })
    const e = getEtat()
    expect(e.accounts.find(a => a.id === id)?.moisOfferts).toBe(1)
    expect(e.invitations.some(i => i.parId === DEMO_CABINET && i.filleulId === id)).toBe(true)
    expect(e.session).toBe(id)
  })
})
